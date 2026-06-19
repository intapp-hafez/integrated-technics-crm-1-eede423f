// Client-side firewall functions — no server role key required.
// Uses the authenticated user's session via Supabase JS client.
import { supabase } from "@/integrations/supabase/client";

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

export async function listBlocklist(): Promise<{ entries: BlocklistRow[] }> {
  try {
    const { data, error } = await supabase
      .from("ip_blocklist" as any)
      .select("*")
      .order("last_seen", { ascending: false })
      .limit(500);
    if (error) throw error;
    return { entries: data ?? [] };
  } catch {
    return { entries: [] };
  }
}

export async function listWhitelist(): Promise<{ entries: WhitelistRow[] }> {
  try {
    const { data, error } = await supabase
      .from("ip_whitelist" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return { entries: data ?? [] };
  } catch {
    return { entries: [] };
  }
}

export async function listSecurityEvents(args: { data?: { limit?: number; type?: string } }): Promise<{ events: SecurityEventRow[] }> {
  try {
    let q = supabase
      .from("security_events" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(args.data?.limit ?? 200, 500));
    if (args.data?.type) q = q.eq("event_type", args.data.type);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { events: rows ?? [] };
  } catch {
    return { events: [] };
  }
}

// ---------- Mutations ----------

const ipSchema = (ip: unknown): string => {
  if (typeof ip !== "string") throw new Error("IP must be a string");
  const s = ip.trim();
  if (!/^[0-9a-fA-F:.]+$/.test(s) || s.length < 3 || s.length > 45) {
    throw new Error("Invalid IP address");
  }
  return s;
};

export async function blockIp(args: { data: { ip: string; reason?: string; minutes?: number | null } }) {
  const ip = ipSchema(args.data.ip);
  const reason = (args.data.reason ?? "Manual block").slice(0, 200);
  const minutes = args.data.minutes === null ? null : Math.max(1, Math.min(43200, Number(args.data.minutes ?? 1440)));
  
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const expires = minutes === null ? null : new Date(Date.now() + minutes * 60_000).toISOString();
  const { error } = await supabase
    .from("ip_blocklist" as any)
    .upsert({
      ip, reason, triggered_by: "manual",
      hits: 1, expires_at: expires, created_by: userId, last_seen: new Date().toISOString(),
    }, { onConflict: "ip" });
  if (error) throw error;
  return { ok: true };
}

export async function unblockIp(args: { data: { ip: string } }) {
  const ip = ipSchema(args.data.ip);
  const { error } = await supabase.from("ip_blocklist" as any).delete().eq("ip", ip);
  if (error) throw error;
  return { ok: true };
}

export async function whitelistIp(args: { data: { ip: string; note?: string } }) {
  const ip = ipSchema(args.data.ip);
  const note = (args.data.note ?? "").slice(0, 200);
  
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  await supabase.from("ip_blocklist" as any).delete().eq("ip", ip);
  const { error } = await supabase
    .from("ip_whitelist" as any)
    .upsert({ ip, note, created_by: userId }, { onConflict: "ip" });
  if (error) throw error;
  return { ok: true };
}

export async function removeWhitelist(args: { data: { ip: string } }) {
  const ip = ipSchema(args.data.ip);
  const { error } = await supabase.from("ip_whitelist" as any).delete().eq("ip", ip);
  if (error) throw error;
  return { ok: true };
}

// ---------- Counters for dashboard ----------

export async function firewallStats() {
  try {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const types = ["blocked_request", "rate_limit", "suspicious_payload", "csrf_reject", "failed_login", "unauthorized_admin"];
    const out: Record<string, number> = {};
    for (const t of types) {
      const { count } = await supabase
        .from("security_events" as any)
        .select("*", { count: "exact", head: true })
        .eq("event_type", t)
        .gte("created_at", since);
      out[t] = count ?? 0;
    }
    const { count: blocked } = await supabase
      .from("ip_blocklist" as any)
      .select("*", { count: "exact", head: true });
    const { count: white } = await supabase
      .from("ip_whitelist" as any)
      .select("*", { count: "exact", head: true });
    return { since, counts: out, blocklistSize: blocked ?? 0, whitelistSize: white ?? 0 };
  } catch {
    return { since: new Date().toISOString(), counts: {}, blocklistSize: 0, whitelistSize: 0 };
  }
}
