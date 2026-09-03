import { formatDate, getLeadLastActivity } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import { SmartInsights } from "@/components/dashboard/SmartInsights";
import { PipelineFunnel } from "@/components/dashboard/PipelineFunnel";
import { useMemo, useState, useEffect } from "react";
import { Users, TrendingUp, CheckCircle2, Clock, Target, ArrowRight, AlertTriangle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/manager/")({
  component: ManagerDashboard,
  head: () => ({ meta: [{ title: "Manager Panel · INT-CRM" }] }),
});

function ManagerDashboard() {
  const { t, dir } = useI18n();
  const { activities: storeActivities, leads: storeLeads, history } = useStoreState();
  const { teamEmployees: employees, includesLead, includesActivity, myProfileId } = useMyTeam();
  const { profile } = useAuth();
  const meName = profile?.full_name_en || profile?.full_name_ar || "";
  const user = {
    name: meName,
    role: t("manager"),
    initials:
      meName
        .split(/\s+/)
        .filter(Boolean)
        .map((w: string) => w[0]?.toUpperCase())
        .join("")
        .slice(0, 2) || "HR",
    photo:
      profile?.avatar_url ||
      "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };

  const managerEmployee = useMemo(
    () =>
      employees.find(
        (e: any) =>
          (myProfileId && e.id === myProfileId) ||
          (profile?.id && (e.id === profile.id || e.userId === profile.id)) ||
          (meName && (e.name === meName || e.nameEn === meName || e.nameAr === meName)),
      ),
    [employees, myProfileId, profile?.id, meName],
  );

  const myEmployees = useMemo(
    () => (managerEmployee ? employees.filter((e: any) => e.id !== managerEmployee.id) : employees),
    [employees, managerEmployee],
  );

  const activeEmployees = useMemo(
    () => myEmployees.filter((e: any) => e.status === "active"),
    [myEmployees],
  );

  const inactiveTeamMembers = useMemo(() => {
    return activeEmployees.filter((emp: any) => {
      const empName = emp.name.toLowerCase();
      const hasRecentActivity = storeActivities.some((act: any) => {
        if (!act.dueDate) return false;
        const isOwner = (act.owner || "").toLowerCase() === empName;
        const isPresales = (act.presalesTeam || []).some(
          (p: string) => p.toLowerCase() === empName,
        );
        if (!isOwner && !isPresales) return false;

        const actDate = new Date(act.dueDate);
        const diffDays = Math.floor(
          (Date.now() - actDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        return diffDays < 7;
      });
      return !hasRecentActivity;
    });
  }, [activeEmployees, storeActivities]);

  const teamLeads = useMemo(
    () => storeLeads.filter((l) => includesLead(l)),
    [storeLeads, includesLead],
  );
  const teamActivities = useMemo(
    () => storeActivities.filter((a) => includesActivity(a)),
    [storeActivities, includesActivity],
  );

  const inactiveTeamLeads = useMemo(() => {
    return teamLeads.filter((l: any) => {
      const s = (l.status || "").toLowerCase().trim();
      const stage = (l.stage || "").toLowerCase().trim();
      if (
        s === "won" ||
        s === "lost" ||
        s === "achieved" ||
        s === "archived" ||
        s === "closed" ||
        stage === "won" ||
        stage === "lost" ||
        stage === "achieved" ||
        stage === "archived" ||
        stage === "closed"
      ) {
        return false;
      }
      const { inactiveDays } = getLeadLastActivity(l, storeActivities, history);
      return inactiveDays >= 7;
    });
  }, [teamLeads, storeActivities, history]);

  const [showInactiveModal, setShowInactiveModal] = useState(false);

  useEffect(() => {
    if (inactiveTeamMembers.length > 0 || inactiveTeamLeads.length > 0) {
      const hasShown = sessionStorage.getItem("shownInactiveTeamAlert");
      if (!hasShown) {
        setShowInactiveModal(true);
        sessionStorage.setItem("shownInactiveTeamAlert", "true");
      }
    }
  }, [inactiveTeamMembers.length, inactiveTeamLeads.length]);

  const managerTarget = managerEmployee?.annualTarget || 0;
  const managerAchieved = managerEmployee?.achievedTarget || 0;
  const teamTarget = myEmployees.reduce((sum: number, e: any) => sum + (e.annualTarget || 0), 0);
  const teamAchieved = myEmployees.reduce(
    (sum: number, e: any) => sum + (e.achievedTarget || 0),
    0,
  );

  const totalTarget = managerTarget + teamTarget;
  const totalAchieved = managerAchieved + teamAchieved;

  const totalLeads = teamLeads.length;
  const wonLeads = teamLeads.filter((l) => l.status === "won").length;
  const convRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const todayActs = teamActivities.filter(
    (a) => a.dueDate === new Date().toISOString().slice(0, 10),
  );
  const doneToday = todayActs.filter((a) => a.status === "done").length;

  const teamMembers = useMemo(
    () => [...myEmployees].sort((a, b) => b.perf - a.perf),
    [myEmployees],
  );

  const recentActivities = useMemo(
    () =>
      [...teamActivities]
        .sort((a, b) => (b.dueDate + b.time).localeCompare(a.dueDate + a.time))
        .slice(0, 6),
    [teamActivities],
  );

  return (
    <AppShell panel="manager" user={user} pageTitle={t("dashboard")}>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard
          label={t("totalLeads")}
          value={String(totalLeads)}
          delta={12.4}
          icon={Users}
          accent="primary"
        />
        <KpiCard
          label={t("conversionRate")}
          value={`${convRate}%`}
          delta={2.1}
          icon={Target}
          accent="warning"
        />
        <KpiCard
          label={t("todayActivities")}
          value={String(todayActs.length)}
          delta={0}
          icon={Clock}
          accent="info"
        />
        <KpiCard
          label={t("doneToday")}
          value={String(doneToday)}
          delta={0}
          icon={CheckCircle2}
          accent="success"
        />
      </div>

      {/* Inactive Leads Team Alert Banner */}
      {inactiveTeamLeads.length > 0 && (
        <Link
          to="/manager/reports/inactive-leads"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 transition hover:bg-amber-500/15 hover:border-amber-500/50 cursor-pointer block group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display font-bold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                {dir === "rtl" ? "تنبيه: عملاء غير نشطين في فريقك" : "Alert: Team Inactive Leads"} ({inactiveTeamLeads.length})
              </div>
              <div className="text-xs text-muted-foreground">
                {dir === "rtl"
                  ? `يوجد ${inactiveTeamLeads.length} عميل محتمل لدى أعضاء فريقك لم يتم تسجيل أي نشاط عليهم منذ 7 أيام أو أكثر.`
                  : `${inactiveTeamLeads.length} leads assigned to your team members have no activity in 7+ days.`}
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition group-hover:bg-amber-700">
            <span>{dir === "rtl" ? "فتح تقرير العملاء غير النشطين" : "Open Inactive Leads Report"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      )}

      <div className="mt-6">
        <SmartInsights leads={teamLeads} employees={myEmployees} activities={teamActivities} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Targets Breakdown */}
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-4 font-display text-base font-bold text-foreground">
            {t("targetBreakdown")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-primary/10 p-5 border border-primary/20 flex flex-col justify-center">
              <div className="text-xs text-primary font-bold uppercase tracking-wider">
                {t("totalTeamTarget")}
              </div>
              <div className="mt-1 font-mono text-3xl font-black text-foreground">
                {fmtMoney(totalTarget)}
              </div>
              <div className="text-sm text-primary/80 mt-2 font-semibold">
                {t("achieved")}: {fmtMoney(totalAchieved)}
              </div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-5 border border-border flex flex-col justify-center">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {t("myTarget")}
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-foreground">
                {fmtMoney(managerTarget)}
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-medium">
                {t("achieved")}: {fmtMoney(managerAchieved)}
              </div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-5 border border-border flex flex-col justify-center">
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                {t("employeesTarget")}
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-foreground">
                {fmtMoney(teamTarget)}
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-medium">
                {t("achieved")}: {fmtMoney(teamAchieved)}
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{t("teamMembers")}</h3>
            <Link
              to="/manager/employees"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          <div className="space-y-3">
            {teamMembers.map((e, i) => {
              const targetPerc = e.annualTarget
                ? Math.round(((e.achievedTarget ?? 0) / e.annualTarget) * 100)
                : e.perf;
              const barColor =
                targetPerc >= 100
                  ? "from-emerald-400 to-emerald-600"
                  : targetPerc >= 75
                    ? "from-amber-400 to-amber-600"
                    : "from-rose-400 to-rose-600";
              const textColor =
                targetPerc >= 100
                  ? "text-emerald-600"
                  : targetPerc >= 75
                    ? "text-amber-600"
                    : "text-rose-600";
              return (
                <div key={e.id} className="flex items-center gap-4">
                  <span className="w-5 text-center text-xs font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${barColor} text-xs font-bold text-white shadow-sm`}
                  >
                    {e.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{e.name}</span>
                      <span className={`font-mono text-sm font-bold ${textColor}`}>
                        {targetPerc}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                        style={{ width: `${Math.min(targetPerc, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>
                        {e.role} · {e.department}
                      </span>
                      {e.annualTarget ? (
                        <span className="font-mono">
                          {fmtMoney(e.achievedTarget ?? 0)} / {fmtMoney(e.annualTarget)}
                        </span>
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
          <h3 className="mb-4 font-display text-base font-bold text-foreground">
            {t("teamOverview")}
          </h3>
          <div className="space-y-3">
            {[
              { label: t("totalEmployees"), value: employees.length, color: "text-primary" },
              { label: t("totalLeads"), value: teamLeads.length, color: "text-sky-600" },
              { label: t("wonDeals"), value: wonLeads, color: "text-emerald-600" },
              {
                label: t("pendingActivities"),
                value: teamActivities.filter((a) => a.status === "pending").length,
                color: "text-amber-600",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-2.5"
              >
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <span className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PipelineFunnel leads={teamLeads} />
      </div>

      {/* Recent activities */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-foreground">
            {t("recentActivities")}
          </h3>
          <Link
            to="/manager/activities"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {t("viewAll")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {recentActivities.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${a.status === "done" ? "bg-emerald-500" : a.status === "in_progress" ? "bg-amber-500" : "bg-muted-foreground/40"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{a.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.owner} · {formatDate(a.dueDate)} {a.time}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${a.status === "done" ? "bg-emerald-50 text-emerald-700" : a.status === "in_progress" ? "bg-amber-50 text-amber-700" : "bg-secondary text-muted-foreground"}`}
              >
                {t(a.status as any)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showInactiveModal} onOpenChange={setShowInactiveModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {dir === "rtl" ? "تنبيه: متابعة أداء الفريق والعملاء" : "Team Performance & Inactivity Alert"}
            </DialogTitle>
            <DialogDescription>
              {dir === "rtl"
                ? "يوجد عملاء أو أعضاء فريق غير نشطين يحتاجون إلى متابعتك."
                : "There are inactive leads or team members requiring your attention."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto">
            {inactiveTeamLeads.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">
                    {dir === "rtl" ? "العملاء غير النشطين (7+ أيام)" : "Inactive Team Leads (7+ Days)"} ({inactiveTeamLeads.length})
                  </span>
                  <Link
                    to="/manager/reports/inactive-leads"
                    onClick={() => setShowInactiveModal(false)}
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    {dir === "rtl" ? "عرض الكل" : "View Report"} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {inactiveTeamLeads.slice(0, 3).map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between rounded-lg bg-background/80 px-2.5 py-1.5 text-xs">
                      <div>
                        <div className="font-semibold text-foreground">{l.code || l.company}</div>
                        <div className="text-[10px] text-muted-foreground">{l.owner || "Team Member"}</div>
                      </div>
                      <span className="font-mono font-bold text-primary">{fmtMoney(l.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {inactiveTeamMembers.length > 0 && (
              <div className="rounded-xl border border-border p-3.5 space-y-2">
                <div className="font-semibold text-xs text-foreground">
                  {dir === "rtl" ? "أعضاء الفريق بدون نشاط في الـ 7 أيام الماضية" : "Team Members with No Recent Activities (7 Days)"} ({inactiveTeamMembers.length})
                </div>
                <div className="space-y-2">
                  {inactiveTeamMembers.map((emp: any) => (
                    <div key={emp.id || emp.name} className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {emp.name
                          ?.split(" ")
                          .map((w: string) => w[0])
                          .join("")
                          .slice(0, 2) || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-xs text-foreground">{emp.name}</div>
                        <div className="text-[10px] text-muted-foreground">{emp.role || (dir === "rtl" ? "موظف" : "Employee")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {inactiveTeamLeads.length > 0 && (
              <Button asChild variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                <Link to="/manager/reports/inactive-leads" onClick={() => setShowInactiveModal(false)}>
                  {dir === "rtl" ? "فتح تقرير العملاء غير النشطين" : "Open Inactive Leads"}
                </Link>
              </Button>
            )}
            <Button onClick={() => setShowInactiveModal(false)}>
              {dir === "rtl" ? "حسناً" : "Got it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
