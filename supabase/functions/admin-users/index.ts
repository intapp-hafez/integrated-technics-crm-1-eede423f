// Admin operations: create user, manage departments and positions.
// Replaces the former TanStack createServerFn handlers so the app can ship
// as a pure SPA on IIS / any static host.
//
// Auth model: caller must pass the Supabase user JWT in the Authorization
// header (handled automatically by supabase-js when invoked from the client).
// We resolve the user via the publishable client, then verify the user has
// the 'admin' role before performing any privileged action via the service
// role client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function j(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

async function logAudit(entry: Record<string, unknown>, req: Request) {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    await admin.from("security_audit_logs").insert({
      status: "success",
      ip_address:
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        null,
      user_agent: req.headers.get("user-agent"),
      ...entry,
    });
  } catch (_) {
    // best-effort
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return j(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return j(401, { error: "Unauthorized" });

  // Verify caller is an admin.
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return j(401, { error: "Invalid token" });
  const callerId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  if (!isAdmin) return j(403, { error: "Only admins can perform this action" });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return j(400, { error: "Invalid JSON" });
  }
  const action = String(payload?.action ?? "");
  const data = payload?.data ?? {};

  try {
    switch (action) {
      case "create_user": {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: data.email,
          password: data.password,
          email_confirm: true,
          user_metadata: { full_name: data.full_name_en },
        });
        if (cErr || !created.user) throw new Error(cErr?.message ?? "Failed to create user");
        const newId = created.user.id;

        const { error: pErr } = await admin.from("profiles").upsert(
          {
            user_id: newId,
            email: data.email,
            full_name_en: data.full_name_en,
            full_name_ar: data.full_name_ar ?? null,
            phone: data.phone ?? null,
            title_en: data.title_en ?? null,
            title_ar: data.title_ar ?? null,
            department_en: data.department_en ?? null,
            department_ar: data.department_ar ?? null,
            location_en: data.location_en ?? null,
            location_ar: data.location_ar ?? null,
            avatar_url: data.avatar_url ?? null,
            target_type: data.target_type ?? "yearly",
            target_value: data.target_value ?? 0,
            start_date: data.start_date ?? null,
            annual_target: data.annual_target ?? 0,
            q1_target: data.q1_target ?? 0,
            q2_target: data.q2_target ?? 0,
            q3_target: data.q3_target ?? 0,
            q4_target: data.q4_target ?? 0,
            weekly_meetings_target: data.weekly_meetings_target ?? 0,
            skills: data.skills ?? [],
            active: data.active ?? true,
            manager_id: data.manager_id ?? null,
          },
          { onConflict: "user_id" },
        );
        if (pErr) throw new Error(pErr.message);

        if (data.role && data.role !== "employee") {
          await admin.from("user_roles").delete().eq("user_id", newId).eq("role", "employee");
          const { error: rErr } = await admin
            .from("user_roles")
            .insert({ user_id: newId, role: data.role });
          if (rErr) throw new Error(rErr.message);
        }

        await logAudit(
          {
            actor_user_id: callerId,
            action: "admin.user.create",
            resource_type: "auth.users",
            resource_id: newId,
            metadata: { email: data.email, role: data.role },
          },
          req,
        );
        return j(200, { user_id: newId });
      }
      case "add_department": {
        const { error } = await admin
          .from("departments")
          .insert({ name_en: data.name_en, name_ar: data.name_ar ?? null });
        if (error) throw new Error(error.message);
        await logAudit(
          {
            actor_user_id: callerId,
            action: "admin.department.create",
            resource_type: "departments",
            metadata: { name_en: data.name_en },
          },
          req,
        );
        return j(200, { ok: true });
      }
      case "delete_department": {
        const { error } = await admin.from("departments").delete().eq("id", data.id);
        if (error) throw new Error(error.message);
        await logAudit(
          {
            actor_user_id: callerId,
            action: "admin.department.delete",
            resource_type: "departments",
            resource_id: data.id,
          },
          req,
        );
        return j(200, { ok: true });
      }
      case "add_position": {
        const { error } = await admin
          .from("positions")
          .insert({ name_en: data.name_en, name_ar: data.name_ar ?? null });
        if (error) throw new Error(error.message);
        await logAudit(
          {
            actor_user_id: callerId,
            action: "admin.position.create",
            resource_type: "positions",
            metadata: { name_en: data.name_en },
          },
          req,
        );
        return j(200, { ok: true });
      }
      case "delete_position": {
        const { error } = await admin.from("positions").delete().eq("id", data.id);
        if (error) throw new Error(error.message);
        await logAudit(
          {
            actor_user_id: callerId,
            action: "admin.position.delete",
            resource_type: "positions",
            resource_id: data.id,
          },
          req,
        );
        return j(200, { ok: true });
      }
      default:
        return j(400, { error: `Unknown action: ${action}` });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return j(400, { error: msg });
  }
});
