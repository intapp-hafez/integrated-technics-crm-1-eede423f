# Deploy as a Pure Static SPA on IIS

The build now produces a single static bundle (`dist/client/`) with no
server-side runtime. All privileged work has moved to Supabase Edge
Functions, so IIS only needs to serve files and rewrite unknown URLs to
`index.html` for client-side routing.

## 1. Build

```powershell
npm install
npm run build
```

Output: `dist/client/` (a single static SPA shell at `index.html` plus
hashed assets under `_build/`).

## 2. Deploy to IIS

1. Copy the entire contents of `dist/client/` to your IIS site root
   (e.g. `C:\inetpub\wwwroot\crm`).
2. Copy `public/web.config` to the same site root.
3. In IIS Manager, install the **URL Rewrite** module (required by the
   SPA-fallback rule) if it isn't already installed.
4. Bind the site to HTTPS with a valid certificate (the included
   `web.config` redirects HTTP → HTTPS).

The SPA-fallback rewrite in `web.config` sends every non-file, non-API
URL back to `index.html` so deep links (e.g. `/admin/leads/abc`) work on
page refresh.

## 3. Restrict to private IPs (optional)

Uncomment the `<ipSecurity>` block in `web.config` and adjust the
`ipAddress`/`subnetMask` entries to your internal range
(e.g. `192.168.0.0/16`, `10.0.0.0/8`).

## 4. Backend — Supabase Edge Functions

All server-side logic now lives in Supabase Edge Functions. Nothing
runs on IIS beyond static file delivery.

| Feature                          | Edge function     | Notes                                                     |
|----------------------------------|-------------------|-----------------------------------------------------------|
| Create user / dept / position    | `admin-users`     | Verifies caller's admin role, then uses service role.     |
| Drain queued emails over SMTP    | `email-dispatch`  | Called by the UI for immediate sends and by pg_cron.      |
| Audit logging                    | (inline)          | Both functions insert into `security_audit_logs`.         |

Deploy / redeploy:

```bash
supabase functions deploy admin-users
supabase functions deploy email-dispatch
```

### pg_cron — repoint to the new edge function URL

If you had a cron job pointing at `…/api/public/email/dispatch`, update
it to call the edge function instead:

```sql
select cron.unschedule('process-email-queue');  -- or its current name
select cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://wzbeyuohnyxacghxkbea.supabase.co/functions/v1/email-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

(Replace the auth header with whatever mechanism you use today; the
function only needs to be reachable.)

## 5. RLS checklist

Because no server-side bearer-attaching middleware runs on IIS, every
table the app reads/writes must be governed by RLS policies scoped to
`auth.uid()`. Already in place for this project — no action required.
