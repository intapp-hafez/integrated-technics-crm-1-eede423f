import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import { useMemo } from "react";
import { Users, TrendingUp, CheckCircle2, Clock, Target, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/manager/")({
  component: ManagerDashboard,
  head: () => ({ meta: [{ title: "Manager Panel · INT-CRM" }] }),
});

function ManagerDashboard() {
  const { t, dir } = useI18n();
  const { activities: storeActivities, leads: storeLeads } = useStoreState();
  const { teamEmployees: employees, includesOwner } = useMyTeam();
  const user = { name: "hafez Rahim", role: t("manager"), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" };

  const teamLeads = useMemo(() => storeLeads.filter((l) => includesOwner(l.owner)), [storeLeads, includesOwner]);
  const teamActivities = useMemo(() => storeActivities.filter((a) => includesOwner(a.owner)), [storeActivities, includesOwner]);

  const totalLeads = teamLeads.length;
  const wonLeads = teamLeads.filter((l) => l.status === "won").length;
  const convRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const todayActs = teamActivities.filter((a) => a.dueDate === new Date().toISOString().slice(0, 10));
  const doneToday = todayActs.filter((a) => a.status === "done").length;

  const topEmployees = useMemo(() =>
    [...employees].sort((a, b) => b.perf - a.perf).slice(0, 5),
    [employees]
  );

  const recentActivities = useMemo(() =>
    [...teamActivities].sort((a, b) => (b.dueDate + b.time).localeCompare(a.dueDate + a.time)).slice(0, 6),
    [teamActivities]
  );

  return (
    <AppShell panel="manager" user={user} pageTitle={t("dashboard")}>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label={t("totalLeads")} value={String(totalLeads)} delta={12.4} icon={Users} accent="primary" />
        <KpiCard label={t("conversionRate")} value={`${convRate}%`} delta={2.1} icon={Target} accent="warning" />
        <KpiCard label={dir === "rtl" ? "أنشطة اليوم" : "Today's Activities"} value={String(todayActs.length)} delta={0} icon={Clock} accent="info" />
        <KpiCard label={dir === "rtl" ? "مُنجز اليوم" : "Done Today"} value={String(doneToday)} delta={0} icon={CheckCircle2} accent="success" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Team performance */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{t("teamPerformance")}</h3>
            <Link to="/manager/employees" className="text-xs font-semibold text-primary hover:underline">{t("viewAll")}</Link>
          </div>
          <div className="space-y-3">
            {topEmployees.map((e, i) => {
              const targetPerc = e.annualTarget ? Math.round(((e.achievedTarget ?? 0) / e.annualTarget) * 100) : e.perf;
              const barColor = targetPerc >= 100 ? "from-emerald-400 to-emerald-600" : targetPerc >= 75 ? "from-amber-400 to-amber-600" : "from-rose-400 to-rose-600";
              const textColor = targetPerc >= 100 ? "text-emerald-600" : targetPerc >= 75 ? "text-amber-600" : "text-rose-600";
              return (
                <div key={e.id} className="flex items-center gap-4">
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground">{i + 1}</span>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${barColor} text-xs font-bold text-white shadow-sm`}>
                    {e.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{e.name}</span>
                      <span className={`font-mono text-sm font-bold ${textColor}`}>{targetPerc}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${Math.min(targetPerc, 100)}%` }} />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{e.role} · {e.department}</span>
                      {e.annualTarget ? (
                        <span className="font-mono">{fmtMoney(e.achievedTarget ?? 0)} / {fmtMoney(e.annualTarget)}</span>
                      ) : (
                        <span>{e.perf}% Perf</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick stats */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-4 font-display text-base font-bold text-foreground">{t("teamOverview")}</h3>
          <div className="space-y-3">
            {[
              { label: dir === "rtl" ? "إجمالي الموظفين" : "Total Employees", value: employees.length, color: "text-primary" },
              { label: dir === "rtl" ? "إجمالي العملاء" : "Total Leads", value: teamLeads.length, color: "text-sky-600" },
              { label: dir === "rtl" ? "عملاء مُغلقة" : "Won Deals", value: wonLeads, color: "text-emerald-600" },
              { label: dir === "rtl" ? "أنشطة معلقة" : "Pending Activities", value: teamActivities.filter((a) => a.status === "pending").length, color: "text-amber-600" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-2.5">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <span className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-foreground">{t("recentActivities")}</h3>
          <Link to="/manager/activities" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            {t("viewAll")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recentActivities.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
              <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${a.status === "done" ? "bg-emerald-500" : a.status === "in_progress" ? "bg-amber-500" : "bg-muted-foreground/40"}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{a.title}</div>
                <div className="text-[11px] text-muted-foreground">{a.owner} · {a.dueDate} {a.time}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${a.status === "done" ? "bg-emerald-50 text-emerald-700" : a.status === "in_progress" ? "bg-amber-50 text-amber-700" : "bg-secondary text-muted-foreground"}`}>
                {a.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
