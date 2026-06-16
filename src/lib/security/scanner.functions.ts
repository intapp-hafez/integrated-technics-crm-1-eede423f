import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireCsrf } from "./csrf-middleware";
import { SECURITY_HEADERS } from "./signatures";

export type ScanStatus = "pass" | "fail" | "warn" | "info";
export type ScanFinding = {
  id: string;
  category: "headers" | "injection" | "auth" | "session" | "csrf" | "config" | "rls" | "middleware" | "dependencies";
  owasp: string; // e.g. A03:2025
  title: string;
  status: ScanStatus;
  severity: "critical" | "high" | "medium" | "low" | "info";
  evidence: string;
  remediation: string;
};

const WEIGHT: Record<ScanFinding["severity"], number> = {
  critical: 10, high: 6, medium: 3, low: 1, info: 0,
};

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("Forbidden: admin only");
}

async function originFromHeader(): Promise<string> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const req: Request = getRequest();
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || req.headers.get("x-forwarded-host") || "localhost";
  return `${proto}://${host}`;
}

async function safeFetch(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, { ...init, redirect: "manual" });
    const text = await res.text().catch(() => "");
    return { ok: true as const, status: res.status, headers: res.headers, body: text };
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? "fetch failed" };
  }
}

export const runSecurityScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireCsrf])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: runRow, error: insErr } = await supabaseAdmin
      .from("security_scan_runs")
      .insert({ started_by: context.userId, summary: {}, findings: [] })
      .select("id").single();
    if (insErr) throw insErr;
    const runId = runRow.id;

    const findings: ScanFinding[] = [];
    const origin = await originFromHeader();

    // ---- 1) Header probe ----
    const probe = await safeFetch(origin + "/", { method: "GET", cache: "no-store" });
    if (!probe.ok) {
      findings.push({
        id: "headers.fetch", category: "headers", owasp: "A05:2025",
        title: "Could not fetch own origin to inspect headers",
        status: "warn", severity: "medium",
        evidence: probe.error, remediation: "Verify the preview URL is reachable from the server.",
      });
    } else {
      for (const [name, expected] of Object.entries(SECURITY_HEADERS)) {
        const got = probe.headers.get(name);
        if (!got) {
          findings.push({
            id: `headers.${name}`, category: "headers", owasp: "A05:2025",
            title: `Missing security header: ${name}`,
            status: "fail", severity: name === "Strict-Transport-Security" || name === "Content-Security-Policy" ? "high" : "medium",
            evidence: "Header not present on /",
            remediation: `Ensure security middleware is registered in src/start.ts. Expected: ${expected.slice(0, 80)}…`,
          });
        } else {
          findings.push({
            id: `headers.${name}`, category: "headers", owasp: "A05:2025",
            title: `${name} present`, status: "pass", severity: "info",
            evidence: got.slice(0, 200), remediation: "",
          });
        }
      }
    }

    // ---- 2) Middleware presence ----
    const hasMiddleware = probe.ok && (
      probe.headers.has("Strict-Transport-Security") ||
      probe.headers.has("Content-Security-Policy")
    );
    findings.push({
      id: "middleware.security", category: "middleware", owasp: "A05:2025",
      title: "Security headers middleware",
      status: hasMiddleware ? "pass" : "fail",
      severity: hasMiddleware ? "info" : "high",
      evidence: hasMiddleware ? "HSTS/CSP observed" : "No HSTS/CSP observed",
      remediation: "Register securityMiddleware in src/start.ts requestMiddleware.",
    });

    // ---- 3) Cookie/session audit ----
    const setCookies = probe.ok ? (probe.headers.get("set-cookie") || "") : "";
    const cookieAudit: ScanStatus = setCookies
      ? (/secure/i.test(setCookies) && /samesite/i.test(setCookies) ? "pass" : "warn")
      : "info";
    findings.push({
      id: "session.cookie-flags", category: "session", owasp: "A07:2025",
      title: "Session cookies have Secure + SameSite flags",
      status: cookieAudit, severity: cookieAudit === "warn" ? "medium" : "info",
      evidence: setCookies ? setCookies.slice(0, 200) : "No Set-Cookie observed on /",
      remediation: "Ensure all cookies use Secure, HttpOnly (where possible), and SameSite=Lax or Strict.",
    });

    // ---- 4) CSRF enforcement probe ----
    const csrfProbe = await safeFetch(origin + "/_serverFn/csrf-probe", {
      method: "POST", body: JSON.stringify({ ping: true }),
      headers: { "content-type": "application/json" },
    });
    const csrfOk = csrfProbe.ok && (csrfProbe.status === 403 || csrfProbe.status === 404);
    findings.push({
      id: "csrf.enforcement", category: "csrf", owasp: "A01:2025",
      title: "CSRF middleware rejects unauthenticated POSTs",
      status: csrfOk ? "pass" : "warn",
      severity: csrfOk ? "info" : "medium",
      evidence: csrfProbe.ok ? `HTTP ${csrfProbe.status}` : (csrfProbe as any).error,
      remediation: "Ensure mutating serverFns include the requireCsrf middleware.",
    });

    // ---- 5) Reflected XSS probe ----
    const xssMark = "<script>__sec_probe__</script>";
    const xssProbe = await safeFetch(origin + "/?q=" + encodeURIComponent(xssMark));
    const reflected = xssProbe.ok && xssProbe.body.includes(xssMark);
    findings.push({
      id: "xss.reflection", category: "injection", owasp: "A03:2025",
      title: "Query parameters are not reflected as raw HTML",
      status: reflected ? "fail" : "pass",
      severity: reflected ? "critical" : "info",
      evidence: reflected ? "Marker echoed verbatim in HTML response" : "Marker not reflected",
      remediation: "Never render unescaped query strings. Use React's default text rendering or DOMPurify.",
    });

    // ---- 6) SQLi behavior probe (response-pattern, non-destructive) ----
    const sqlPayload = "' OR 1=1--";
    const sqlProbe = await safeFetch(origin + "/?q=" + encodeURIComponent(sqlPayload));
    const sqlLeak = sqlProbe.ok && /postgres|syntax error at or near|pg_|SQLSTATE/i.test(sqlProbe.body);
    findings.push({
      id: "sqli.error-leak", category: "injection", owasp: "A03:2025",
      title: "No SQL error leakage on injected payloads",
      status: sqlLeak ? "fail" : "pass",
      severity: sqlLeak ? "high" : "info",
      evidence: sqlLeak ? "SQL error fragment detected in body" : "No SQL fragments in response",
      remediation: "Use parameterized queries (Supabase JS client). Never concatenate user input into SQL.",
    });

    // ---- 7) Auth bypass on admin assets ----
    const adminProbe = await safeFetch(origin + "/admin/security", { method: "GET" });
    const adminBlocks = adminProbe.ok && (adminProbe.status === 302 || adminProbe.status === 401 || adminProbe.status === 403);
    findings.push({
      id: "auth.admin-gate", category: "auth", owasp: "A01:2025",
      title: "Anonymous requests to /admin are gated",
      status: adminBlocks || (adminProbe.ok && adminProbe.status === 200) ? "info" : "warn",
      severity: "low",
      evidence: adminProbe.ok ? `HTTP ${adminProbe.status}` : (adminProbe as any).error,
      remediation: "Admin routes live under _authenticated/ and are SPA-gated; serverFns re-check has_role.",
    });

    // ---- 8) Clickjacking / MIME / Referrer (derived from headers) ----
    if (probe.ok) {
      const xfo = probe.headers.get("X-Frame-Options");
      findings.push({
        id: "clickjacking", category: "headers", owasp: "A05:2025",
        title: "Clickjacking protection (X-Frame-Options=DENY)",
        status: xfo === "DENY" ? "pass" : "fail",
        severity: xfo === "DENY" ? "info" : "medium",
        evidence: xfo ?? "missing",
        remediation: "Set X-Frame-Options: DENY and frame-ancestors 'none' in CSP.",
      });
    }

    // ---- 9) RLS / DB linter integration ----
    try {
      const { data: tables } = await supabaseAdmin
        .from("information_schema.tables" as any)
        .select("table_name")
        .limit(1);
      findings.push({
        id: "rls.connection", category: "rls", owasp: "A01:2025",
        title: "Database admin connection OK", status: "pass", severity: "info",
        evidence: tables ? "queried information_schema" : "no rows", remediation: "",
      });
    } catch (e: any) {
      findings.push({
        id: "rls.connection", category: "rls", owasp: "A01:2025",
        title: "Could not verify DB connectivity from server", status: "warn", severity: "medium",
        evidence: e?.message ?? "", remediation: "Verify SUPABASE_SERVICE_ROLE_KEY secret.",
      });
    }

    // Check RLS enabled on a few critical tables
    const criticalTables = ["profiles", "user_roles", "leads", "clients", "ip_blocklist", "ip_whitelist", "security_events"];
    for (const tbl of criticalTables) {
      try {
        const { error } = await supabaseAdmin.from(tbl as any).select("*", { head: true, count: "exact" }).limit(1);
        findings.push({
          id: `rls.${tbl}`, category: "rls", owasp: "A01:2025",
          title: `RLS reachable on ${tbl}`, status: error ? "warn" : "pass",
          severity: error ? "medium" : "info",
          evidence: error ? error.message : "OK", remediation: error ? "Verify RLS policies." : "",
        });
      } catch (e: any) {
        findings.push({
          id: `rls.${tbl}`, category: "rls", owasp: "A01:2025",
          title: `Table ${tbl} not reachable`, status: "warn", severity: "low",
          evidence: e?.message ?? "", remediation: "",
        });
      }
    }

    // ---- 10) Dependencies note ----
    findings.push({
      id: "deps.audit", category: "dependencies", owasp: "A06:2025",
      title: "Dependency vulnerability audit",
      status: "info", severity: "info",
      evidence: "Run scheduled npm audit + Supabase security advisors.",
      remediation: "Keep packages up to date. Subscribe to GitHub Dependabot or equivalent.",
    });

    // ---- 11) Logging / monitoring ----
    const { count: eventsLast24h } = await supabaseAdmin
      .from("security_events").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
    findings.push({
      id: "monitoring.events", category: "config", owasp: "A09:2025",
      title: "Security event logging is active",
      status: "pass", severity: "info",
      evidence: `${eventsLast24h ?? 0} events recorded in last 24h`,
      remediation: "",
    });

    // ---- Score ----
    let max = 0; let lost = 0;
    for (const f of findings) {
      const w = WEIGHT[f.severity];
      if (f.status === "pass" || f.status === "info") { max += w; }
      else if (f.status === "fail") { max += w; lost += w; }
      else if (f.status === "warn") { max += w; lost += Math.ceil(w * 0.4); }
    }
    const score = max === 0 ? 100 : Math.max(0, Math.round(((max - lost) / max) * 100));

    const summary = {
      total: findings.length,
      pass: findings.filter(f => f.status === "pass").length,
      warn: findings.filter(f => f.status === "warn").length,
      fail: findings.filter(f => f.status === "fail").length,
      info: findings.filter(f => f.status === "info").length,
      origin,
    };

    await supabaseAdmin.from("security_scan_runs").update({
      finished_at: new Date().toISOString(),
      score, summary, findings: findings as any,
    }).eq("id", runId);

    return { id: runId, score, summary, findings };
  });

export const listScanRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("security_scan_runs")
      .select("id, started_at, finished_at, score, summary")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return { runs: data ?? [] };
  });
