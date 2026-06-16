import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireCsrf } from "./csrf-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("Forbidden: admin only");
}

// ---------- Lists ----------

export type BlocklistRow = {
  id: string; ip: string; reason: string; triggered_by: string;
  hits: number; first_seen: string; last_seen: string;
  expires_at: string | null; created_by: string | null;
};
export type WhitelistRow = {
  id: string; ip: string; note: string; created_by: string | null; created_at: string;
};
export type SecurityEventRow = {
  id: string; ip: string | null; event_type: string; path: string | null;
  user_id: string | null; severity: string; details: string; created_at: string;
};

export const listBlocklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ entries: BlocklistRow[] }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ip_blocklist")
      .select("*")
      .order("last_seen", { ascending: false })
      .limit(500);
    if (error) throw error;
    const entries: BlocklistRow[] = (data ?? []).map((r: any) => ({
      id: r.id, ip: String(r.ip), reason: r.reason, triggered_by: r.triggered_by,
      hits: r.hits, first_seen: r.first_seen, last_seen: r.last_seen,
      expires_at: r.expires_at, created_by: r.created_by,
    }));
    return { entries };
  });

export const listWhitelist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ entries: WhitelistRow[] }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("ip_whitelist")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const entries: WhitelistRow[] = (data ?? []).map((r: any) => ({
      id: r.id, ip: String(r.ip), note: r.note, created_by: r.created_by, created_at: r.created_at,
    }));
    return { entries };
  });

export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { limit?: number; type?: string } | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<{ events: SecurityEventRow[] }> => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.type) q = q.eq("event_type", data.type);
    const { data: rows, error } = await q;
    if (error) throw error;
    const events: SecurityEventRow[] = (rows ?? []).map((r: any) => ({
      id: r.id, ip: r.ip == null ? null : String(r.ip), event_type: r.event_type,
      path: r.path, user_id: r.user_id, severity: r.severity,
      details: typeof r.details === "string" ? r.details : JSON.stringify(r.details ?? {}),
      created_at: r.created_at,
    }));
    return { events };
  });

// ---------- Mutations (CSRF-protected) ----------

const ipSchema = (ip: unknown): string => {
  if (typeof ip !== "string") throw new Error("IP must be a string");
  const s = ip.trim();
  // Loose IPv4 / IPv6 check — Postgres inet will hard-validate.
  if (!/^[0-9a-fA-F:.]+$/.test(s) || s.length < 3 || s.length > 45) {
    throw new Error("Invalid IP address");
  }
  return s;
};

export const blockIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireCsrf])
  .inputValidator((d: { ip: string; reason?: string; minutes?: number | null }) => ({
    ip: ipSchema(d.ip),
    reason: (d.reason ?? "Manual block").slice(0, 200),
    minutes: d.minutes === null ? null : Math.max(1, Math.min(43200, Number(d.minutes ?? 1440))),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expires = data.minutes === null ? null : new Date(Date.now() + data.minutes * 60_000).toISOString();
    const { error } = await supabaseAdmin
      .from("ip_blocklist")
      .upsert({
        ip: data.ip, reason: data.reason, triggered_by: "manual",
        hits: 1, expires_at: expires, created_by: context.userId, last_seen: new Date().toISOString(),
      }, { onConflict: "ip" });
    if (error) throw error;
    return { ok: true };
  });

export const unblockIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireCsrf])
  .inputValidator((d: { ip: string }) => ({ ip: ipSchema(d.ip) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ip_blocklist").delete().eq("ip", data.ip);
    if (error) throw error;
    return { ok: true };
  });

export const whitelistIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireCsrf])
  .inputValidator((d: { ip: string; note?: string }) => ({
    ip: ipSchema(d.ip),
    note: (d.note ?? "").slice(0, 200),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // remove from blocklist if present
    await supabaseAdmin.from("ip_blocklist").delete().eq("ip", data.ip);
    const { error } = await supabaseAdmin
      .from("ip_whitelist")
      .upsert({ ip: data.ip, note: data.note, created_by: context.userId }, { onConflict: "ip" });
    if (error) throw error;
    return { ok: true };
  });

export const removeWhitelist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth, requireCsrf])
  .inputValidator((d: { ip: string }) => ({ ip: ipSchema(d.ip) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ip_whitelist").delete().eq("ip", data.ip);
    if (error) throw error;
    return { ok: true };
  });

// ---------- Counters for dashboard ----------

export const firewallStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const types = ["blocked_request", "rate_limit", "suspicious_payload", "csrf_reject", "failed_login", "unauthorized_admin"];
    const out: Record<string, number> = {};
    for (const t of types) {
      const { count } = await supabaseAdmin
        .from("security_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", t)
        .gte("created_at", since);
      out[t] = count ?? 0;
    }
    const { count: blocked } = await supabaseAdmin
      .from("ip_blocklist")
      .select("*", { count: "exact", head: true });
    const { count: white } = await supabaseAdmin
      .from("ip_whitelist")
      .select("*", { count: "exact", head: true });
    return { since, counts: out, blocklistSize: blocked ?? 0, whitelistSize: white ?? 0 };
  });
