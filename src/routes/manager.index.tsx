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
import { Users, TrendingUp, CheckCircle2, Clock, Target, ArrowRight, AlertTriangle, ExternalLink, Trophy, DollarSign } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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

  const activePipelineLeads = useMemo(
    () =>
      teamLeads.filter(
        (l) => l.status !== "won" && l.status !== "lost" && l.status !== "archived",
      ),
    [teamLeads],
  );
  const activePipelineValue = useMemo(
    () => activePipelineLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0),
    [activePipelineLeads],
  );

  const stageKeys = ["new", "contacted", "qualified", "proposal", "negotiation", "won"] as const;
  const stageColors: Record<string, string> = {
    new: "#94a3b8",
    contacted: "#0ea5e9",
    qualified: "#6366f1",
    proposal: "#f59e0b",
    negotiation: "#a855f7",
    won: "#10b981",
  };

  const stageStats = useMemo(() => {
    return stageKeys.map((k) => {
      const items = teamLeads.filter((l) => (l.status || "").toLowerCase() === k);
      const val = items.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
      return {
        key: k,
        label: (t(k as any) as string) || k,
        count: items.length,
        value: val,
        color: stageColors[k] || "#f97316",
        percent:
          activePipelineValue > 0
            ? Math.min(100, Math.round((val / (activePipelineValue + 1)) * 100))
            : 0,
      };
    });
  }, [teamLeads, activePipelineValue, t]);

  const callsToday = useMemo(
    () => todayActs.filter((a) => (a.type || "").toLowerCase().includes("call")).length,
    [todayActs],
  );
  const meetingsToday = useMemo(
    () => todayActs.filter((a) => (a.type || "").toLowerCase().includes("meet")).length,
    [todayActs],
  );

  const quotaAttainment = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

  const revenueMonths = useMemo(() => {
    const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const result: { label: string; won: number; target: number }[] = [];
    const monthlyTarget = totalTarget > 0 ? Math.round(totalTarget / 12) : 50000;

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextM = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = monthNamesEn[d.getMonth()];
      const wonSum = teamLeads
        .filter((l) => {
          if (l.status !== "won") return false;
          const dt = l.updatedAt || l.created_at || (l as any).createdAt;
          if (!dt) return true;
          const leadDate = new Date(dt);
          return leadDate >= d && leadDate < nextM;
        })
        .reduce((sum, l) => sum + (Number(l.value) || 0), 0);

      result.push({
        label,
        won: wonSum,
        target: monthlyTarget,
      });
    }
    return result;
  }, [teamLeads, totalTarget]);

  return (
    <AppShell panel="manager" user={user} pageTitle={t("dashboard")}>
      {/* 1. Header Command Center */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-4">
          <div className="relative">
            {user.photo ? (
              <img
                src={user.photo}
                alt=""
                className="h-12 w-12 rounded-xl object-cover shadow-sm ring-1 ring-border"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-amber-500 text-lg font-bold text-primary-foreground shadow-sm">
                {user.initials}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-foreground">
                {dir === "rtl" ? "مركز قيادة المبيعات" : "Manager Command Center"}
              </h1>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {dir === "rtl"
                  ? `فريق المبيعات (${myEmployees.length} موظف)`
                  : `Sales Team (${myEmployees.length} Reps)`}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dir === "rtl"
                ? "متابعة أداء المبيعات، ونمو خط الصفقات، وإنجاز المستهدفات في الوقت الفعلي"
                : "Real-time team revenue, pipeline velocity & reps target performance"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/manager/activities"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <span>+ {t("addActivity") || "Schedule Activity"}</span>
          </Link>
          <Link
            to="/manager/pipeline"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-accent"
          >
            <span>{t("pipeline") || "View Pipeline"} →</span>
          </Link>
        </div>
      </div>

      {/* 2. Four High-Impact KPI Cards with Sparklines & Micro-Indicators */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Pipeline Value */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                {dir === "rtl" ? "قيمة خط المبيعات النشط" : "Active Pipeline Value"}
              </span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
            <div className="font-mono text-2xl font-black text-foreground">
              {fmtMoney(activePipelineValue)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {activePipelineLeads.length}{" "}
              {dir === "rtl" ? "صفقة جارية في خط المبيعات" : "open deals in pipeline"}
            </div>
          </div>
          <div className="mt-3 h-8 w-full">
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 100 25"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="sparklineGradMgr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path
                d="M0,20 Q20,15 35,18 T70,8 T100,2"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
              />
              <path
                d="M0,20 Q20,15 35,18 T70,8 T100,2 L100,25 L0,25 Z"
                fill="url(#sparklineGradMgr)"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Team Quota Attainment */}
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {dir === "rtl" ? "نسبة تحقيق الهدف" : "Team Quota Attainment"}
            </div>
            <div className="font-mono text-2xl font-black text-foreground">
              {quotaAttainment}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-mono font-bold text-foreground">{fmtMoney(totalAchieved)}</span>{" "}
              / {fmtMoney(totalTarget)}
            </div>
            <div className="mt-1 text-[11px] font-medium text-primary">
              {quotaAttainment >= 75
                ? dir === "rtl"
                  ? "على المسار الصحيح لتحقيق المستهدف"
                  : "On track to hit quota"
                : dir === "rtl"
                  ? "بحاجة إلى تكثيف الصفقات"
                  : "Needs pipeline boost"}
            </div>
          </div>
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-secondary"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-primary transition-all duration-700"
                strokeDasharray={`${Math.min(quotaAttainment, 100)}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-xs font-bold text-foreground">
              {quotaAttainment}%
            </span>
          </div>
        </div>

        {/* Card 3: Win Conversion Rate */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {t("conversionRate")}
            </span>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {wonLeads} {dir === "rtl" ? "رابح" : "Won"}
            </span>
          </div>
          <div className="font-mono text-2xl font-black text-foreground">{convRate}%</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {wonLeads} {dir === "rtl" ? "صفقة رابحة من إجمالي" : "won deals out of"} {totalLeads}
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
              <span>{dir === "rtl" ? "المعدل المستهدف" : "Team Benchmark"}</span>
              <span className="font-bold text-foreground">25%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(convRate * 3, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Activity Velocity */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {dir === "rtl" ? "سرعة الأنشطة اليومية" : "Activity Velocity"}
            </span>
            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
              {dir === "rtl" ? "اليوم" : "Today"}
            </span>
          </div>
          <div className="font-mono text-2xl font-black text-foreground">
            {doneToday} / {todayActs.length}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {todayActs.length ? Math.round((doneToday / todayActs.length) * 100) : 100}%{" "}
            {dir === "rtl" ? "من أنشطة اليوم مكتملة" : "completed today"}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-foreground">
              {callsToday} {dir === "rtl" ? "مكالمات" : "Calls"}
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
            <span className="text-xs font-semibold text-foreground">
              {meetingsToday} {dir === "rtl" ? "اجتماعات" : "Meetings"}
            </span>
          </div>
        </div>
      </div>

      {/* Inactive Leads Team Alert Banner (if any) */}
      {inactiveTeamLeads.length > 0 && (
        <Link
          to="/manager/reports/inactive-leads"
          className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 transition hover:border-amber-500/50 hover:bg-amber-500/15"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display font-bold text-foreground">
                {dir === "rtl" ? "تنبيه: عملاء غير نشطين في فريقك" : "Alert: Team Inactive Leads"} (
                {inactiveTeamLeads.length})
              </div>
              <div className="text-xs text-muted-foreground">
                {dir === "rtl"
                  ? `يوجد ${inactiveTeamLeads.length} عميل محتمل لدى فريقك لم يُسجل عليهم أي نشاط منذ 7 أيام أو أكثر.`
                  : `${inactiveTeamLeads.length} leads assigned to your team members have no activity in 7+ days.`}
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700">
            <span>
              {dir === "rtl" ? "فتح تقرير العملاء غير النشطين" : "Open Inactive Leads Report"}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      )}

      {/* Smart Insights */}
      <div className="mt-6">
        <SmartInsights leads={teamLeads} employees={myEmployees} activities={teamActivities} />
      </div>

      {/* 3. Core Charts Row: Revenue Trajectory + Pipeline Stage Breakdown */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Revenue & Target Trajectory Area Chart */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] lg:col-span-2">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                {dir === "rtl"
                  ? "مسار الإيرادات المحققة مقابل المستهدف"
                  : "Team Target vs. Achieved Revenue"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {dir === "rtl"
                  ? "تطور الصفقات الرابحة شهرياً مقارنة بالمستهدف التراكمي"
                  : "Monthly cumulative won revenue compared to assigned quota"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-primary" />
                <span className="font-medium text-foreground">
                  {dir === "rtl" ? "الإيرادات المحققة" : "Won Revenue"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 border-t-2 border-dashed border-muted-foreground/60" />
                <span className="font-medium text-muted-foreground">
                  {dir === "rtl" ? "المستهدف" : "Target Line"}
                </span>
              </div>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueMonths}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="managerRevenueGradFull" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
                  dx={-5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "0.75rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value: any, name: any) => [
                    fmtMoney(Number(value) || 0),
                    name === "won"
                      ? dir === "rtl"
                        ? "المحقق"
                        : "Won Revenue"
                      : dir === "rtl"
                        ? "الهدف"
                        : "Target",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="won"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#managerRevenueGradFull)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Pipeline Flow by Stage */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] lg:col-span-1">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  {dir === "rtl" ? "توزيع خط المبيعات" : "Pipeline Flow by Stage"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {dir === "rtl" ? "قيمة وعدد الصفقات بكل مرحلة" : "Deal volume across stages"}
                </p>
              </div>
              <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {fmtMoney(activePipelineValue)}
              </span>
            </div>

            <div className="mt-2 space-y-3.5">
              {stageStats.map((st) => (
                <div key={st.key}>
                  <div className="mb-1 flex justify-between text-xs font-medium">
                    <span className="font-semibold text-foreground">
                      {st.label} ({st.count})
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {fmtMoney(st.value)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(st.percent, st.count > 0 ? 8 : 0)}%`,
                        backgroundColor: st.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              {dir === "rtl" ? "إجمالي المراحل المفتوحة:" : "Active stages:"}{" "}
              <strong className="text-foreground">{stageStats.filter((s) => s.count > 0).length}</strong>
            </span>
            <Link to="/manager/pipeline" className="font-semibold text-primary hover:underline">
              {dir === "rtl" ? "فتح خط المبيعات ←" : "View Pipeline →"}
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row: Sales Reps Leaderboard + Attention Required */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Sales Reps Leaderboard */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                {dir === "rtl" ? "لوحة تصنيف موظفي المبيعات" : "Sales Reps Leaderboard"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {dir === "rtl"
                  ? "نسبة تحقيق الأهداف والمساهمة في الإيرادات لكل موظف"
                  : "Target attainment & revenue contribution per employee"}
              </p>
            </div>
            <Link
              to="/manager/employees"
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("viewAll")} →
            </Link>
          </div>

          <div className="divide-y divide-border">
            {teamMembers.map((e, i) => {
              const targetPerc = e.annualTarget
                ? Math.round(((e.achievedTarget ?? 0) / e.annualTarget) * 100)
                : e.perf;
              const barColor =
                targetPerc >= 100
                  ? "bg-emerald-500"
                  : targetPerc >= 75
                    ? "bg-amber-500"
                    : "bg-rose-500";
              const textColor =
                targetPerc >= 100
                  ? "text-emerald-600 dark:text-emerald-400"
                  : targetPerc >= 75
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400";
              const dealsCount = teamLeads.filter(
                (l) => (l.owner || "").toLowerCase() === (e.name || "").toLowerCase(),
              ).length;

              return (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-3.5 first:pt-1 last:pb-1"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-sm font-bold">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (
                        <span className="text-xs text-muted-foreground">{i + 1}</span>
                      )}
                    </span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground ring-1 ring-border">
                      {e.avatar || e.name?.slice(0, 2).toUpperCase() || "EM"}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">{e.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {e.role || "Sales Representative"} • {dealsCount}{" "}
                        {dir === "rtl" ? "صفقات" : "Deals"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-end">
                      <div className="font-mono text-xs font-bold text-foreground">
                        {fmtMoney(e.achievedTarget ?? 0)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {e.annualTarget
                          ? `${dir === "rtl" ? "من هدف" : "of"} ${fmtMoney(e.annualTarget)}`
                          : `${e.perf}% Perf`}
                      </div>
                    </div>
                    <div className="w-24">
                      <div className={`mb-0.5 text-end font-mono text-xs font-bold ${textColor}`}>
                        {targetPerc}%
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${Math.min(targetPerc, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Attention Required (At-Risk Leads) */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] lg:col-span-1">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="font-display text-base font-bold text-foreground">
                  {dir === "rtl" ? "عملاء بحاجة للمتابعة" : "Attention Required"}
                </h2>
              </div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                {inactiveTeamLeads.length} {dir === "rtl" ? "عملاء" : "Deals"}
              </span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {dir === "rtl"
                ? "صفقات متوقفة منذ 7+ أيام بدون تسجيل أي نشاط أو متابعة"
                : "High-value deals stalled for 7+ days without recorded activities"}
            </p>

            <div className="space-y-2.5">
              {inactiveTeamLeads.slice(0, 3).map((l: any) => (
                <div
                  key={l.id}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 transition hover:border-amber-500/40"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold text-foreground">{l.code || l.company}</span>
                    <span className="font-mono text-xs font-bold text-primary">
                      {fmtMoney(Number(l.value) || 0)}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {dir === "rtl" ? "المسؤول:" : "Assigned:"} {l.owner || "Team Member"}
                  </div>
                </div>
              ))}
              {inactiveTeamLeads.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  {dir === "rtl" ? "لا توجد صفقات معلقة، أداء رائع!" : "No stalled deals, great job!"}
                </div>
              )}
            </div>
          </div>

          <Link
            to="/manager/reports/inactive-leads"
            className="mt-4 block w-full rounded-xl border border-primary/20 bg-primary/10 py-2.5 text-center text-xs font-bold text-primary transition hover:bg-primary/20"
          >
            {dir === "rtl"
              ? "عرض تقرير العملاء غير النشطين ←"
              : "View All Inactive Leads Report →"}
          </Link>
        </div>
      </div>

      {/* 5. Recent Activities Timeline */}
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
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${a.status === "done" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : a.status === "in_progress" ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-secondary text-muted-foreground"}`}
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
