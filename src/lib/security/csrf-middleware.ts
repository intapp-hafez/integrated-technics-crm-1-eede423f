import { createMiddleware } from "@tanstack/react-start";

const COOKIE = "x-csrf-token";
const HEADER = "x-csrf-token";

// Function-middleware: enforce CSRF on mutating server fns.
// Reads the X-CSRF-Token request header, compares to the cookie token.
// All server-only modules are dynamic-imported so this file stays safe
// to include in the client bundle (the `.client()` phase runs in browser).
export const requireCsrf = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|;\s*)x-csrf-token=([^;]+)/);
      if (m) {
        return next({ headers: { [HEADER]: decodeURIComponent(m[1]) } });
      }
    }
    return next();
  })
  .server(async ({ next }) => {
    const { getRequest, getCookie } = await import("@tanstack/react-start/server");
    const { timingSafeEqual } = await import("crypto");
    const req = getRequest();
    const method = req?.method?.toUpperCase() ?? "GET";
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

    const cookieTok = getCookie(COOKIE);
    const headerTok = req?.headers.get(HEADER) ?? "";
    const ok = (() => {
      if (!cookieTok || !headerTok) return false;
      const a = Buffer.from(cookieTok);
      const b = Buffer.from(headerTok);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    })();

    if (!ok) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const ip = req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
        await supabaseAdmin.rpc("record_security_event", {
          _ip: (ip || null) as any,
          _event_type: "csrf_reject",
          _path: req ? new URL(req.url).pathname : "/",
          _user_id: null as any,
          _severity: "warn",
          _details: {
            reason: !cookieTok ? "no_cookie" : !headerTok ? "no_header" : "mismatch",
          } as any,
        });
      } catch {
        /* ignore */
      }
      throw new Response("CSRF token invalid", { status: 403 });
    }
    return next();
  });
