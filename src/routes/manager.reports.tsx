import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import { useMemo } from "react";
import { TrendingUp, Users, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/manager/reports")({
  component: ManagerReportsPage,
  head: () => ({ meta: [{ title: "Reports · Manager" }] }),
});

function ManagerReportsPage() {
  const { t, dir } = useI18n();
  const { activities, leads } = useStoreState();
  const { teamEmployees: employees } = useMyTeam();
  const today = new Date().toISOString().slice(0, 10);

  const report = useMemo(() => employees.map((e) => {
    const myLeads = leads.filter((l) => l.owner === e.name);
    const myActs = activities.filter((a) => a.owner === e.name);
    const wonLeads = myLeads.filter((l) => l.status === "won");
    const doneActs = myActs.filter((a) => a.status === "done");
    const todayMins = activities
      .filter((a) => a.owner === e.name && a.dueDate === today)
      .reduce((s, a) => s + (a.estMinutes ?? 0), 0);
    const revenue = wonLeads.reduce((s, l) => s + l.value, 0);
    const fmtH = (m: number) => m ? `${Math.floor(m / 60)}h ${m % 60}m` : "0";
    return {
      ...e,
      totalLeads: myLeads.length,
      wonLeads: wonLeads.length,
      totalActs: myActs.length,
      doneActs: doneActs.length,
      todayHours: fmtH(todayMins),
      revenue,
      convRate: myLeads.length ? Math.round((wonLeads.length / myLeads.length) * 100) : 0,
    };
  }), [activities, leads, employees, today]);

  const totals = {
    leads: report.reduce((s, r) => s + r.totalLeads, 0),
    won: report.reduce((s, r) => s + r.wonLeads, 0),
    acts: report.reduce((s, r) => s + r.totalActs, 0),
    revenue: report.reduce((s, r) => s + r.revenue, 0),
  };

  return (
    <AppShell panel="manager" user={{ name: "hafez Rahim", role: t("manager"), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" }} pageTitle={t("reports")}>
      {/* Summary KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { icon: Users, label: dir === "rtl" ? "إجمالي العملاء" : "Total Leads", value: totals.leads, color: "text-sky-600", bg: "bg-sky-50" },
          { icon: CheckCircle2, label: dir === "rtl" ? "صفقات مُغلقة" : "Won Deals", value: totals.won, color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: Clock, label: dir === "rtl" ? "إجمالي الأنشطة" : "Total Activities", value: totals.acts, color: "text-amber-600", bg: "bg-amber-50" },
          { icon: TrendingUp, label: dir === "rtl" ? "الإيرادات" : "Revenue", value: fmtMoney(totals.revenue), color: "text-primary", bg: "bg-primary/10" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-employee report table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-display text-base font-bold text-foreground">
            {dir === "rtl" ? "تقرير أداء الفريق" : "Team Performance Report"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("name")}</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("leads")}</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("won")}</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{dir === "rtl" ? "معدل التحويل" : "Conv %"}</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("activities")}</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{dir === "rtl" ? "مُنجز" : "Done"}</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{dir === "rtl" ? "ساعات اليوم" : "Today"}</th>
                <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{dir === "rtl" ? "الإيرادات" : "Revenue"}</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("performance")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.map((r) => (
                <tr key={r.id} className="transition hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-[10px] font-bold text-primary-foreground shadow-sm">
                        {r.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{r.name}</div>
                        <div className="text-[10px] text-muted-foreground">{r.department}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold text-foreground">{r.totalLeads}</td>
                  <td className="px-4 py-3 text-center font-mono font-semibold text-emerald-600">{r.wonLeads}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.convRate >= 30 ? "bg-emerald-50 text-emerald-700" : r.convRate >= 15 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>
                      {r.convRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-foreground">{r.totalActs}</td>
                  <td className="px-4 py-3 text-center font-mono text-emerald-600">{r.doneActs}</td>
                  <td className="px-4 py-3 text-center font-mono text-foreground">{r.todayHours}</td>
                  <td className="px-4 py-3 text-end font-mono font-semibold text-primary">{fmtMoney(r.revenue)}</td>
                  <td className="px-4 py-3">
                    {r.annualTarget ? (() => {
                      const targetPerc = Math.round(((r.achievedTarget ?? 0) / r.annualTarget) * 100);
                      const barColor = targetPerc >= 100 ? "from-emerald-400 to-emerald-600" : targetPerc >= 75 ? "from-amber-400 to-amber-600" : "from-rose-400 to-rose-600";
                      const textColor = targetPerc >= 100 ? "text-emerald-600" : targetPerc >= 75 ? "text-amber-600" : "text-rose-600";
                      return (
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${Math.min(targetPerc, 100)}%` }} />
                            </div>
                            <span className={`font-mono text-xs font-bold ${textColor}`}>{targetPerc}%</span>
                          </div>
                          <div className="mt-1 text-center font-mono text-[9px] text-muted-foreground">
                            {fmtMoney(r.achievedTarget ?? 0)} / {fmtMoney(r.annualTarget)}
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500" style={{ width: `${r.perf}%` }} />
                        </div>
                        <span className="font-mono text-xs font-bold text-primary">{r.perf}%</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
