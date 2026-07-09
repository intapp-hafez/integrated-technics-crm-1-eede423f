import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Search } from "lucide-react";

export const Route = createFileRoute("/admin/kpis")({
  component: KPIsSetupPage,
  head: () => ({ meta: [{ title: "KPIs Setup · INT-CRM" }] }),
});

function KPIsSetupPage() {
  const { t, dir } = useI18n();
  const { employees, users } = useStoreState();
  const [query, setQuery] = useState("");
  
  const [editingWeights, setEditingWeights] = useState<Record<string, { t: string; ac: string; at: string; tP: string; acP: string; atP: string; }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const activeEmployees = useMemo(() => {
    return employees.filter((e) => {
      const u = users.find((user) => user.profileId === e.id || user.id === (e as any).userId);
      return u?.role !== "admin";
    });
  }, [employees, users]);

  const filtered = useMemo(() => {
    if (!query.trim()) return activeEmployees;
    const q = query.toLowerCase();
    return activeEmployees.filter((e) => e.name.toLowerCase().includes(q));
  }, [query, activeEmployees]);

  const handleWeightChange = (id: string, field: "t" | "ac" | "at" | "tP" | "acP" | "atP", value: string) => {
    setEditingWeights((prev) => {
      const emp = activeEmployees.find(e => e.id === id);
      const current = prev[id] || {
        t: String(emp?.kpiTargetWeight ?? 33.33),
        ac: String(emp?.kpiActivitiesWeight ?? 33.33),
        at: String(emp?.kpiAttendanceWeight ?? 33.34),
        tP: emp?.kpiTargetPeriod ?? "",
        acP: emp?.kpiActivitiesPeriod ?? "",
        atP: emp?.kpiAttendancePeriod ?? ""
      };
      return { ...prev, [id]: { ...current, [field]: value } };
    });
  };

  const handleSave = async (id: string) => {
    const weights = editingWeights[id];
    if (!weights) return;

    const tW = parseFloat(weights.t) || 0;
    const acW = parseFloat(weights.ac) || 0;
    const atW = parseFloat(weights.at) || 0;

    const total = tW + acW + atW;
    // We allow slight floating point inaccuracies like 99.99 or 100.01
    if (Math.abs(total - 100) > 0.1) {
      toast.error(dir === "rtl" ? "مجموع الأوزان يجب أن يساوي 100%" : "Total weights must equal 100%");
      return;
    }

    setSavingId(id);
    const { error } = await supabase
      .from("profiles")
      .update({
        kpi_target_weight: tW,
        kpi_activities_weight: acW,
        kpi_attendance_weight: atW,
        kpi_target_period: weights.tP || null,
        kpi_activities_period: weights.acP || null,
        kpi_attendance_period: weights.atP || null
      } as any)
      .eq("id", id);
      
    setSavingId(null);

    if (error) {
      console.error(error);
      toast.error(t("errorSaving"));
    } else {
      toast.success(dir === "rtl" ? "تم حفظ الأوزان بنجاح" : "Weights saved successfully");
      // Optionally clear editing state to reflect store state
      setEditingWeights(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const user = {
    name: "",
    role: t("admin"),
    initials: "AD",
  };

  return (
    <AppShell panel="admin" user={user} pageTitle={t("kpisSetup")}>
      <div className="mb-4">
        <h2 className="text-xl font-bold">{t("kpisSetup")}</h2>
        <p className="text-sm text-muted-foreground">
          {dir === "rtl" ? "إعداد أوزان مؤشرات الأداء لكل موظف. يجب أن يكون مجموع الأوزان 100%." : "Setup KPI weights for each employee. Total must be 100%."}
        </p>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          className="h-10 w-full rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ paddingInlineStart: "2.25rem", paddingInlineEnd: "0.75rem" }}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start font-semibold text-muted-foreground">{t("employee")}</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{dir === "rtl" ? "الهدف (Target) %" : "Target %"}</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{dir === "rtl" ? "النشاطات (Activities) %" : "Activities %"}</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{dir === "rtl" ? "الحضور (Attendance) %" : "Attendance %"}</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">{t("total")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e) => {
                const isEditing = !!editingWeights[e.id];
                const vals = editingWeights[e.id] || {
                  t: String(e.kpiTargetWeight ?? 33.33),
                  ac: String(e.kpiActivitiesWeight ?? 33.33),
                  at: String(e.kpiAttendanceWeight ?? 33.34),
                  tP: e.kpiTargetPeriod ?? "",
                  acP: e.kpiActivitiesPeriod ?? "",
                  atP: e.kpiAttendancePeriod ?? ""
                };
                
                const tW = parseFloat(vals.t) || 0;
                const acW = parseFloat(vals.ac) || 0;
                const atW = parseFloat(vals.at) || 0;
                const total = tW + acW + atW;
                const isInvalid = Math.abs(total - 100) > 0.1;

                return (
                  <tr key={e.id} className="transition hover:bg-primary/5">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <input 
                          type="number" 
                          min="0" max="100" step="0.01"
                          value={vals.t}
                          onChange={(ev) => handleWeightChange(e.id, "t", ev.target.value)}
                          className="w-20 rounded-md border border-border px-2 py-1 text-center text-sm focus:border-primary focus:outline-none"
                        />
                        <select
                          value={vals.tP}
                          onChange={(ev) => handleWeightChange(e.id, "tP", ev.target.value)}
                          className="rounded-md border border-border bg-card px-1 py-0.5 text-[11px] text-muted-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="">{dir === "rtl" ? "افتراضي" : "Default"}</option>
                          <option value="monthly">{dir === "rtl" ? "شهري" : "Monthly"}</option>
                          <option value="quarterly">{dir === "rtl" ? "ربع سنوي" : "Quarterly"}</option>
                          <option value="6month">{dir === "rtl" ? "نصف سنوي" : "6 Months"}</option>
                          <option value="yearly">{dir === "rtl" ? "سنوي" : "Yearly"}</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <input 
                          type="number" 
                          min="0" max="100" step="0.01"
                          value={vals.ac}
                          onChange={(ev) => handleWeightChange(e.id, "ac", ev.target.value)}
                          className="w-20 rounded-md border border-border px-2 py-1 text-center text-sm focus:border-primary focus:outline-none"
                        />
                        <select
                          value={vals.acP}
                          onChange={(ev) => handleWeightChange(e.id, "acP", ev.target.value)}
                          className="rounded-md border border-border bg-card px-1 py-0.5 text-[11px] text-muted-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="">{dir === "rtl" ? "افتراضي" : "Default"}</option>
                          <option value="monthly">{dir === "rtl" ? "شهري" : "Monthly"}</option>
                          <option value="quarterly">{dir === "rtl" ? "ربع سنوي" : "Quarterly"}</option>
                          <option value="6month">{dir === "rtl" ? "نصف سنوي" : "6 Months"}</option>
                          <option value="yearly">{dir === "rtl" ? "سنوي" : "Yearly"}</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <input 
                          type="number" 
                          min="0" max="100" step="0.01"
                          value={vals.at}
                          onChange={(ev) => handleWeightChange(e.id, "at", ev.target.value)}
                          className="w-20 rounded-md border border-border px-2 py-1 text-center text-sm focus:border-primary focus:outline-none"
                        />
                        <select
                          value={vals.atP}
                          onChange={(ev) => handleWeightChange(e.id, "atP", ev.target.value)}
                          className="rounded-md border border-border bg-card px-1 py-0.5 text-[11px] text-muted-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="">{dir === "rtl" ? "افتراضي" : "Default"}</option>
                          <option value="monthly">{dir === "rtl" ? "شهري" : "Monthly"}</option>
                          <option value="quarterly">{dir === "rtl" ? "ربع سنوي" : "Quarterly"}</option>
                          <option value="6month">{dir === "rtl" ? "نصف سنوي" : "6 Months"}</option>
                          <option value="yearly">{dir === "rtl" ? "سنوي" : "Yearly"}</option>
                        </select>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono font-bold ${isInvalid ? "text-rose-600" : "text-emerald-600"}`}>
                        {total.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      {isEditing && (
                        <button
                          onClick={() => handleSave(e.id)}
                          disabled={savingId === e.id || isInvalid}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {savingId === e.id ? t("saving") : t("save")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
