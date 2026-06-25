// Client-side security scan — no server role key required.
// Runs browser-accessible checks: response headers, reflection probes, DB connectivity.

import { supabase } from "@/integrations/supabase/client";

export type ScanStatus = "pass" | "fail" | "warn" | "info";
export type ScanFinding = {
  id: string;
  category: "headers" | "injection" | "auth" | "session" | "csrf" | "config" | "rls" | "middleware" | "dependencies";
  owasp: string;
  title: string;
  status: ScanStatus;
  severity: "critical" | "high" | "medium" | "low" | "info";
  evidence: string;
  remediation: string;
};

const WEIGHT: Record<ScanFinding["severity"], number> = {
  critical: 10, high: 6, medium: 3, low: 1, info: 0,
};

async function safeFetch(url: string, init?: RequestInit) {
  try {
    const res = await fetch(url, { ...init, redirect: "manual" });
    const text = await res.text().catch(() => "");
    return { ok: true as const, status: res.status, headers: res.headers, body: text };
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? "fetch failed" };
  }
}

export async function runSecurityScan(): Promise<{
  id: string; score: number;
  summary: Record<string, any>;
  findings: ScanFinding[];
}> {
  const findings: ScanFinding[] = [];
  const origin = window.location.origin;

  // ---- 1) Header probe ----
  const probe = await safeFetch(origin + "/", { method: "GET", cache: "no-store" });
  const SECURITY_HEADERS = [
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Content-Security-Policy",
    "Referrer-Policy",
    "Permissions-Policy",
  ];
  if (!probe.ok) {
    findings.push({
      id: "headers.fetch", category: "headers", owasp: "A05:2025",
      title: "Could not fetch own origin to inspect headers",
      status: "warn", severity: "medium",
      evidence: (probe as any).error,
      remediation: "Verify the origin is reachable.",
    });
  } else {
    for (const name of SECURITY_HEADERS) {
      const got = probe.headers.get(name);
      findings.push({
        id: `headers.${name}`, category: "headers", owasp: "A05:2025",
        title: got ? `${name} present` : `Missing security header: ${name}`,
        status: got ? "pass" : "fail",
        severity: got ? "info" : (name === "Strict-Transport-Security" || name === "Content-Security-Policy" ? "high" : "medium"),
        evidence: got ? got.slice(0, 200) : "Header not present on /",
        remediation: got ? "" : `Add ${name} via web.config or middleware.`,
      });
    }
  }

  // ---- 2) Clickjacking ----
  if (probe.ok) {
    const xfo = probe.headers.get("X-Frame-Options");
    findings.push({
      id: "clickjacking", category: "headers", owasp: "A05:2025",
      title: "Clickjacking protection (X-Frame-Options=DENY)",
      status: xfo === "DENY" ? "pass" : "fail",
      severity: xfo === "DENY" ? "info" : "medium",
      evidence: xfo ?? "missing",
      remediation: "Set X-Frame-Options: DENY in web.config or IIS headers.",
    });
  }

  // ---- 3) Reflected XSS probe ----
  const xssMark = "<script>__sec_probe__</script>";
  const xssProbe = await safeFetch(origin + "/?q=" + encodeURIComponent(xssMark));
  const reflected = xssProbe.ok && xssProbe.body.includes(xssMark);
  findings.push({
    id: "xss.reflection", category: "injection", owasp: "A03:2025",
    title: "Query parameters are not reflected as raw HTML",
    status: reflected ? "fail" : "pass",
    severity: reflected ? "critical" : "info",
    evidence: reflected ? "Marker echoed verbatim in HTML response" : "Marker not reflected",
    remediation: "Never render unescaped query strings. React renders text nodes safely by default.",
  });

  // ---- 4) SQLi error-leak probe ----
  const sqlPayload = "' OR 1=1--";
  const sqlProbe = await safeFetch(origin + "/?q=" + encodeURIComponent(sqlPayload));
  const sqlLeak = sqlProbe.ok && /postgres|syntax error at or near|pg_|SQLSTATE/i.test(sqlProbe.body);
  findings.push({
    id: "sqli.error-leak", category: "injection", owasp: "A03:2025",
    title: "No SQL error leakage on injected payloads",
    status: sqlLeak ? "fail" : "pass",
    severity: sqlLeak ? "high" : "info",
    evidence: sqlLeak ? "SQL error fragment detected in body" : "No SQL fragments in response",
    remediation: "Use parameterized queries (Supabase JS client).",
  });

  // ---- 5) Auth/Admin gate ----
  const adminProbe = await safeFetch(origin + "/admin/security", { method: "GET" });
  const adminStatus = adminProbe.ok ? adminProbe.status : 0;
  findings.push({
    id: "auth.admin-gate", category: "auth", owasp: "A01:2025",
    title: "Anonymous requests to /admin are SPA-gated",
    status: "info", severity: "low",
    evidence: adminProbe.ok ? `HTTP ${adminStatus} (SPA returns 200 — gating is client-side)` : (adminProbe as any).error,
    remediation: "Admin serverFns re-check has_role via RLS.",
  });

  // ---- 6) DB connectivity via anon client ----
  try {
    const { error } = await supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
    findings.push({
      id: "rls.connection", category: "rls", owasp: "A01:2025",
      title: "Database connection OK (anon client)",
      status: error ? "warn" : "pass", severity: error ? "medium" : "info",
      evidence: error ? error.message : "profiles table reachable via RLS",
      remediation: error ? "Check Supabase RLS policies and anon key configuration." : "",
    });
  } catch (e: any) {
    findings.push({
      id: "rls.connection", category: "rls", owasp: "A01:2025",
      title: "Could not verify DB connectivity", status: "warn", severity: "medium",
      evidence: e?.message ?? "", remediation: "Check Supabase configuration.",
    });
  }

  // ---- 7) HTTPS enforcement ----
  const isHttps = origin.startsWith("https://");
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("10.10.");
  findings.push({
    id: "tls.https", category: "config", owasp: "A02:2025",
    title: "Application served over HTTPS",
    status: isHttps ? "pass" : (isLocalhost ? "info" : "fail"),
    severity: isHttps ? "info" : (isLocalhost ? "info" : "high"),
    evidence: origin,
    remediation: "Obtain a TLS certificate and configure IIS HTTPS binding.",
  });

  // ---- 8) Session/Cookie flags ----
  const setCookies = probe.ok ? (probe.headers.get("set-cookie") || "") : "";
  const cookieAudit: ScanStatus = setCookies
    ? (/secure/i.test(setCookies) && /samesite/i.test(setCookies) ? "pass" : "warn")
    : "info";
  findings.push({
    id: "session.cookie-flags", category: "session", owasp: "A07:2025",
    title: "Session cookies have Secure + SameSite flags",
    status: cookieAudit, severity: cookieAudit === "warn" ? "medium" : "info",
    evidence: setCookies ? setCookies.slice(0, 200) : "No Set-Cookie observed on /",
    remediation: "Ensure all cookies use Secure, HttpOnly, and SameSite=Lax or Strict.",
  });

  // ---- 9) Dependencies ----
  findings.push({
    id: "deps.audit", category: "dependencies", owasp: "A06:2025",
    title: "Dependency vulnerability audit",
    status: "info", severity: "info",
    evidence: "Run 'npm audit' periodically to check for known CVEs.",
    remediation: "Keep packages up to date. Use Dependabot or equivalent.",
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

  // Persist results to Supabase (best-effort, anon client with RLS)
  // Safe UUID — crypto.randomUUID() only works in secure (HTTPS) contexts
  function generateId(): string {
    if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
      return (crypto as any).randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  const runId = generateId();
  try {
    await supabase.from("security_scan_runs" as any).insert({
      id: runId,
      finished_at: new Date().toISOString(),
      score,
      summary,
      findings: findings as any,
    });
  } catch { /* silently ignore if table doesn't exist or RLS blocks */ }

  return { id: runId, score, summary, findings };
}

export async function listScanRuns(): Promise<{ runs: any[] }> {
  try {
    const { data, error } = await (supabase as any)
      .from("security_scan_runs")
      .select("id, started_at, finished_at, score, summary")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) return { runs: [] };
    return { runs: data ?? [] };
  } catch {
    return { runs: [] };
  }
}
