// Edge Function — compute daily attendance summary; intended to be called by
// a scheduled cron job. Requires the `x-cron-secret` header to match the
// CRON_SECRET environment variable.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // --- Auth: shared cron secret ---
  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: rows, error } = await supabase
    .from("attendance").select("status").eq("date", today);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const summary = (rows ?? []).reduce(
    (acc: Record<string, number>, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    { present: 0, late: 0, absent: 0, leave: 0 },
  );

  await supabase.from("notifications").insert({
    type: "attendance",
    title_en: `Attendance summary — ${today}`,
    title_ar: `ملخص الحضور — ${today}`,
    body_en: `Present: ${summary.present}, Late: ${summary.late}, Absent: ${summary.absent}, Leave: ${summary.leave}`,
    body_ar: `حاضر: ${summary.present}، متأخر: ${summary.late}، غائب: ${summary.absent}، إجازة: ${summary.leave}`,
    audience_roles: ["admin", "hr"],
  });

  return new Response(JSON.stringify({ date: today, summary }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
