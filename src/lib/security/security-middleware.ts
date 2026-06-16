import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { SECURITY_HEADERS, scanPayload } from "./signatures";

type CacheEntry = { value: boolean; until: number };
const blockedCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10_000;

function clientIp(req: Request): string | null {
  const headers = req.headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("true-client-ip") ||
    null
  );
}

function rulesForPath(path: string): { bucket: string; limit: number; window: number } {
  if (path.startsWith("/_server/") || path.startsWith("/api/")) {
    if (path.includes("admin")) return { bucket: "api-admin", limit: 60, window: 60 };
    return { bucket: "api", limit: 300, window: 60 };
  }
  if (path.startsWith("/auth") || path.startsWith("/login")) {
    return { bucket: "auth", limit: 30, window: 60 };
  }
  return { bucket: "page", limit: 600, window: 60 };
}

function applySecurityHeaders() {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    try { setResponseHeader(k, v); } catch { /* ignore */ }
  }
}

async function recordEvent(
  ip: string,
  type: string,
  path: string,
  severity: string,
  details: Record<string, unknown>,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("record_security_event", {
      _ip: ip as any,
      _event_type: type,
      _path: path,
      _user_id: null as any,
      _severity: severity,
      _details: details as any,
    });
  } catch (e) {
    console.warn("[security] event log failed", e);
  }
}

export const securityMiddleware = createMiddleware().server(async ({ next }) => {
  applySecurityHeaders();

  let req: Request | null = null;
  try { req = getRequest(); } catch { /* no request */ }
  if (!req) return next();

  const url = new URL(req.url);
  const path = url.pathname;

  if (
    path.startsWith("/_build/") ||
    path.startsWith("/assets/") ||
    path.startsWith("/@vite/") ||
    path.startsWith("/@id/") ||
    path.startsWith("/node_modules/") ||
    /\.(js|css|map|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)$/i.test(path)
  ) {
    return next();
  }

  const ip = clientIp(req);
  if (!ip) return next();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1) Blocklist
  const cached = blockedCache.get(ip);
  let blocked: boolean;
  if (cached && cached.until > Date.now()) {
    blocked = cached.value;
  } else {
    try {
      const { data } = await supabaseAdmin.rpc("is_ip_blocked", { _ip: ip as any });
      blocked = Boolean(data);
    } catch { blocked = false; }
    blockedCache.set(ip, { value: blocked, until: Date.now() + CACHE_TTL_MS });
  }

  if (blocked) {
    await recordEvent(ip, "blocked_request", path, "warn", { method: req.method });
    return new Response("Forbidden — your IP is blocked.", {
      status: 403, headers: SECURITY_HEADERS,
    });
  }

  // 2) Rate limit
  const rule = rulesForPath(path);
  let allowed = true;
  try {
    const { data } = await supabaseAdmin.rpc("rate_limit_check", {
      _ip: ip as any, _bucket: rule.bucket, _limit: rule.limit, _window_seconds: rule.window,
    });
    allowed = data !== false;
  } catch { allowed = true; }

  if (!allowed) {
    await recordEvent(ip, "rate_limit", path, "warn", { bucket: rule.bucket, limit: rule.limit });
    blockedCache.delete(ip);
    return new Response("Too many requests", {
      status: 429,
      headers: { ...SECURITY_HEADERS, "Retry-After": String(rule.window) },
    });
  }

  // 3) Payload signature
  try {
    let hit = scanPayload(url.search);
    if (!hit && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json") || ct.includes("text/")) {
        const text = await req.clone().text().catch(() => "");
        if (text) hit = scanPayload(text);
      }
    }
    if (hit) {
      await recordEvent(ip, "suspicious_payload", path, "critical", {
        category: hit.category, sample: hit.sample, method: req.method,
      });
      blockedCache.delete(ip);
      return new Response("Request blocked by security policy.", {
        status: 400, headers: SECURITY_HEADERS,
      });
    }
  } catch { /* ignore */ }

  return next();
});
