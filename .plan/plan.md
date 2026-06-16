
## Scope

Rebuild the admin Security Center to cover OWASP Top 10 (2025), headers, XSS, SQLi, CSRF, session/cookie security, plus a DB-backed rate limiter with auto-blacklist and a manual whitelist.

> Note on "Full active pentest": I'll add safe self-probes (header checks, reflected-input probe, parameterized-query check, error-leak probe, auth-bypass probe). True destructive SQLi/XSS fuzzing isn't safe to run against production DB — those checks will be code-pattern + response-pattern based, not destructive payloads. I'll flag this clearly in the UI.

## 1. Database (one migration)

New tables:
- `ip_blocklist` — `ip`, `reason`, `triggered_by` (login_burst | rate_limit | suspicious_payload | unauthorized_admin), `hits`, `first_seen`, `expires_at` (null = permanent), `created_by`
- `ip_whitelist` — `ip`, `note`, `created_by` — bypasses blocklist + rate limits
- `rate_limit_counters` — `ip`, `bucket` (route key), `window_start`, `count` — UPSERT per request
- `security_events` — `ip`, `event_type`, `path`, `user_id`, `severity`, `details` jsonb — feeds blacklist triggers + audit log
- `security_scan_runs` — `id`, `started_by`, `started_at`, `finished_at`, `score`, `summary` jsonb, `findings` jsonb

RLS: all admin-only via `has_role(auth.uid(),'admin')`. `service_role` full access for middleware writes.

Helper SQL functions:
- `record_security_event(ip, type, path, details)` — inserts event + auto-blacklists when thresholds met (5 failed logins/10min, 20 429s/5min, any suspicious payload, 3 unauthorized admin hits/10min)
- `is_ip_blocked(ip)` returns bool, respects whitelist + expires_at
- `rate_limit_check(ip, bucket, limit, window_seconds)` returns bool

## 2. Server middleware (`src/lib/security/`)

- `security-middleware.ts` — request middleware applied globally in `src/start.ts`:
  - Sets headers on every response: HSTS, CSP (strict, nonce-based), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
  - Calls `is_ip_blocked` → 403 if blocked
  - Calls `rate_limit_check` per route bucket → 429 + records event
  - Pattern-matches SQLi/XSS signatures in query/body → records `suspicious_payload`
- `csrf-middleware.ts` — function middleware for mutating server fns:
  - Issues double-submit token via httpOnly cookie + `X-CSRF-Token` header
  - Rejects mismatches with 403 + records event
- `csrf.functions.ts` — `getCsrfToken()` server fn for the client to fetch on app load
- Client wrapper: small `useCsrfToken()` hook + auto-attach in serverFn middleware

## 3. Active scanner (`src/lib/security/scanner.server.ts`)

`runSecurityScan()` server fn (admin-only) performs in parallel:
- **Headers probe** — fetch own origin, check HSTS/CSP/XFO/XCTO/Referrer/Permissions
- **Cookie/session audit** — verify Supabase + CSRF cookies have Secure, HttpOnly, SameSite=Lax/Strict
- **CSRF check** — POST without token must 403
- **XSS reflection probe** — send `<script>` marker to public endpoints, verify it's not echoed
- **SQLi probe** — send `' OR 1=1--` to public endpoints, verify response unchanged + no SQL error leak
- **Error leakage** — trigger 500, verify no stack trace
- **Auth bypass** — anon GET to `/admin/*` server fns must 401/403
- **Open redirect, clickjacking, MIME sniff** — derived from headers
- **OWASP Top 10 2025 mapping** — each finding tagged A01..A10
- **Supabase RLS lint** — calls `supabase--linter` results table, surfaces critical
- **Dependency CVEs** — reads `npm audit --json` snapshot table (populated by edge cron later; for now lists known high/critical from a maintained list)
- **Middleware status** — verifies HSTS/CSP/CSRF/rate-limit middleware is registered and responding correctly

Each check returns `{ id, owasp, severity, status: 'pass'|'fail'|'warn', evidence }`. Score = weighted pass %, shown as big number + per-category breakdown.

Persists run to `security_scan_runs`.

## 4. Admin UI updates (`src/routes/admin.security.tsx`)

Three tabs:

1. **Scanner** — "Run full scan" button, big score (0–100), category cards (Headers, Injection, Auth, Session, CSRF, Config, Dependencies, RLS), expandable findings with OWASP tag + remediation, scan history list
2. **Firewall** — IP blocklist table (IP, reason, triggered_by, hits, expires, "Remove" button), IP whitelist table (add/remove), recent `security_events` feed with filter, manual "Block IP" form
3. **Middleware** — live status checks (HSTS ✓, CSP ✓, CSRF ✓, Rate limit ✓), config view, last 24h: blocked requests / rate-limited / CSRF rejects counters

## 5. Files

New: migration, `src/lib/security/{middleware,csrf-middleware,scanner.server,scanner.functions,blocklist.functions,events.functions,signatures}.ts`, `src/lib/security/use-csrf.ts`, `src/components/admin/security/{ScannerTab,FirewallTab,MiddlewareTab,FindingCard,IpListTable}.tsx`

Modified: `src/start.ts` (register middleware), `src/routes/admin.security.tsx` (3 tabs), `src/integrations/supabase/auth-attacher.ts` (attach CSRF token)

## Risks / notes

- CSRF tokens add a one-time fetch on app load; serverFn callers don't need code changes thanks to the auto-attacher
- Active scanner hits own preview origin — runs in ~5–10s
- Auto-blacklist defaults: 1h for first offense, 24h for repeat, manual permanent option. Admin IPs are whitelisted by default the first time they sign in (recorded but not enforced)
- Rate-limit middleware adds 1 DB roundtrip per request; mitigated by in-memory LRU cache with 10s TTL

Proceeding with the migration first, then code in two batches (middleware + scanner, then UI).
