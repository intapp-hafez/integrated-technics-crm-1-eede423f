// SMTP relay edge function. Drains queued email_jobs whose scheduled_for
// has elapsed and sends them via the configured SMTP server. Replaces the
// previous /api/public/email/dispatch TanStack server route so the app can
// ship as a pure SPA on IIS / any static host.
//
// Triggered by:
//   - pg_cron once per minute
//   - the "Send Email" UI immediately after enqueueing (best-effort)
//
// Auth: caller must pass the project's anon/publishable key via the
// `apikey` header (Supabase Edge Functions enforce this by default).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const j = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...CORS } });

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function validateCfg(cfg: any): string[] {
  const e: string[] = [];
  if (!cfg) return ["SMTP not configured."];
  if (!cfg.host?.trim()) e.push("SMTP host is required.");
  const p = Number(cfg.port);
  if (!Number.isInteger(p) || p < 1 || p > 65535) e.push("SMTP port invalid.");
  if (!cfg.username?.trim()) e.push("SMTP username required.");
  if (!cfg.password) e.push("SMTP password required.");
  if (!cfg.from_email || !EMAIL_RE.test(cfg.from_email)) e.push("From address invalid.");
  if (cfg.reply_to && !EMAIL_RE.test(cfg.reply_to)) e.push("Reply-to invalid.");
  return e;
}

async function logAudit(admin: any, entry: Record<string, unknown>, req: Request) {
  try {
    await admin.from("security_audit_logs").insert({
      status: "success",
      ip_address:
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
      user_agent: req.headers.get("user-agent"),
      ...entry,
    });
  } catch (_) {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: cfgRow, error: cfgErr } = await admin
    .from("smtp_settings").select("*").eq("id", 1).maybeSingle();
  if (cfgErr) return j(500, { error: cfgErr.message });
  if (!cfgRow || !cfgRow.enabled) return j(200, { ok: true, skipped: "smtp_disabled" });

  const cfg = cfgRow;
  const cfgErrors = validateCfg(cfg);
  if (cfgErrors.length) {
    const msg = "SMTP misconfigured: " + cfgErrors.join(" ");
    await admin.from("email_jobs").update({ status: "failed", error: msg }).eq("status", "queued");
    return j(200, { ok: false, error: msg });
  }

  const nowIso = new Date().toISOString();
  const { data: jobs, error: jobsErr } = await admin
    .from("email_jobs")
    .select("*")
    .eq("status", "queued")
    .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
    .order("created_at", { ascending: true })
    .limit(20);
  if (jobsErr) return j(500, { error: jobsErr.message });
  if (!jobs?.length) return j(200, { ok: true, processed: 0 });

  const BASE_DELAY_MS = 30_000;
  const MAX_DELAY_MS = 60 * 60_000;
  const DEFAULT_MAX_ATTEMPTS = 5;

  const client = new SMTPClient({
    connection: {
      hostname: cfg.host,
      port: cfg.port,
      tls: !!cfg.secure,
      auth: { username: cfg.username, password: cfg.password },
    },
  });

  const results: any[] = [];
  for (const job of jobs) {
    const { data: claim } = await admin
      .from("email_jobs").update({ status: "sending" })
      .eq("id", job.id).eq("status", "queued").select("id").maybeSingle();
    if (!claim) continue;

    const attempts = (job.attempts || 0) + 1;
    const maxAttempts = job.max_attempts || DEFAULT_MAX_ATTEMPTS;
    const to = (job.recipients || []).filter((r: string) => !!r);

    const logDelivery = async (status: string, err: string | null) => {
      const rows = (to.length ? to : ["(none)"]).map((r: string) => ({
        job_id: job.id, recipient: r, status, error: err, attempt: attempts,
      }));
      await admin.from("email_delivery_logs").insert(rows);
    };

    try {
      if (!to.length) throw new Error("No recipients");
      for (const r of to) if (!EMAIL_RE.test(r)) throw new Error(`Invalid recipient: ${r}`);

      await client.send({
        from: cfg.from_name ? `${cfg.from_name} <${cfg.from_email}>` : cfg.from_email,
        to,
        replyTo: cfg.reply_to || undefined,
        subject: job.subject || "(no subject)",
        html: job.body || "",
      });

      await admin.from("email_jobs").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        error: null,
        attempts,
        last_attempt_at: new Date().toISOString(),
      }).eq("id", job.id);
      await logDelivery("sent", null);
      results.push({ id: job.id, status: "sent", attempts });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const exhausted = attempts >= maxAttempts;
      if (exhausted) {
        await admin.from("email_jobs").update({
          status: "failed",
          error: `${msg} (attempt ${attempts}/${maxAttempts})`,
          attempts,
          last_attempt_at: new Date().toISOString(),
        }).eq("id", job.id);
        await logDelivery("failed", msg);
        results.push({ id: job.id, status: "failed", attempts, error: msg });
      } else {
        const backoff = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** (attempts - 1));
        const jitter = Math.floor(Math.random() * 5_000);
        const nextRun = new Date(Date.now() + backoff + jitter).toISOString();
        await admin.from("email_jobs").update({
          status: "queued",
          error: `${msg} (attempt ${attempts}/${maxAttempts}, retrying)`,
          attempts,
          last_attempt_at: new Date().toISOString(),
          scheduled_for: nextRun,
        }).eq("id", job.id);
        await logDelivery("retry", msg);
        results.push({ id: job.id, status: "retry", attempts, error: msg });
      }
    }
  }

  try { await client.close(); } catch (_) {}

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const retried = results.filter((r) => r.status === "retry").length;
  await logAudit(admin, {
    action: "email.dispatch",
    resource_type: "email_jobs",
    metadata: { processed: results.length, sent, failed, retried, job_ids: results.map((r) => r.id) },
  }, req);

  return j(200, { ok: true, processed: results.length, results });
});
