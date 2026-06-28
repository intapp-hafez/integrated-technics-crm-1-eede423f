// Edge Function — broadcast a bilingual notification to users by role or id.
// Requires a valid Supabase user JWT with admin or manager role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // --- Auth: validate JWT ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify caller is admin or manager
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const callerRoles = new Set((roles ?? []).map((r: any) => r.role));
    if (!callerRoles.has("admin") && !callerRoles.has("manager")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      type,
      titleEn,
      titleAr,
      bodyEn,
      bodyAr,
      href,
      audience = [],
      audienceRoles = [],
    } = body;
    if (!type || !titleEn) throw new Error("type and titleEn are required");

    let unreadBy: string[] = [...audience];
    if (audienceRoles.length) {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", audienceRoles);
      const userIds = (data ?? []).map((r) => r.user_id);
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id").in("user_id", userIds);
        unreadBy = [...new Set([...unreadBy, ...(profs ?? []).map((p) => p.id)])];
      }
    }

    const { data: notif, error } = await supabase
      .from("notifications")
      .insert({
        type,
        title_en: titleEn,
        title_ar: titleAr ?? titleEn,
        body_en: bodyEn,
        body_ar: bodyAr,
        href,
        audience,
        audience_roles: audienceRoles,
        unread_by: unreadBy,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ notification: notif }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
