// Edge Function — convert a "won" lead into a quotation (idempotent).
// Requires a valid Supabase user JWT. The caller must have access to the lead
// (admin/manager, the lead owner, or its creator).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // --- Auth: validate JWT ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check lead access through RLS-scoped user client first
    const { data: leadAccessCheck, error: accessErr } = await userClient
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .maybeSingle();
    if (accessErr || !leadAccessCheck) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: lead, error: lerr } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
    if (lerr || !lead) throw new Error(lerr?.message ?? "Lead not found");

    if (lead.status !== "won") {
      return new Response(
        JSON.stringify({
          error: "Lead must be in 'won' status to convert",
          currentStatus: lead.status,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existing } = await supabase
      .from("quotations")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ quotation: existing, reused: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = `Q-${Date.now()}`;
    const { data: quotation, error: qerr } = await supabase
      .from("quotations")
      .insert({
        code,
        lead_id: lead.id,
        client_id: lead.client_id,
        title_en: `${lead.company_en} — Quotation`,
        title_ar: `${lead.company_ar ?? lead.company_en} — عرض سعر`,
        value: lead.value ?? 0,
        status: "draft",
        created_by: user.id,
      })
      .select()
      .single();

    if (qerr) throw qerr;

    await supabase.from("history").insert({
      module: "quotation",
      action_en: "Quotation created from lead",
      action_ar: "تم إنشاء عرض السعر من الفرصة",
      target_table: "quotations",
      target_id: quotation.id,
      details_en: `From lead ${lead.code ?? lead.id}`,
      details_ar: `من الفرصة ${lead.code ?? lead.id}`,
    });

    return new Response(JSON.stringify({ quotation, reused: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
