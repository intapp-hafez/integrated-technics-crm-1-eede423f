import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import { getLeadLastActivity } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Download,
  AlertTriangle,
  ArrowRight,
  Target,
  BarChart3,
  Filter,
  Plus,
  Briefcase,
  Layers,
  Phone,
  Calendar,
  Zap,
  Award,
  ExternalLink,
  Search,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import * as XLSX from "xlsx";
import { NewActivityDialog } from "@/components/activities/NewActivityDialog";

export const Route = createFileRoute("/manager/reports/")({
  component: ManagerReportsPage,
  head: () => ({ meta: [{ title: "Reports & Analytics · Manager" }] }),
});

type PeriodKey = "all" | "thisMonth" | "thisQuarter" | "30d" | "ytd";
type ActiveTab = "team" | "pipeline" | "activities" | "sources";

export function ManagerReportsPage() {
  const { t, dir } = useI18n();
  const isAr = dir === "rtl";
  const navigate = useNavigate();
  const { activities, leads, history } = useStoreState();
  const { teamEmployees: employees, includesLead, includesActivity } = useMyTeam();

  const [period, setPeriod] = useState<PeriodKey>("thisMonth");
  const [selectedRep, setSelectedRep] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("team");
  const [searchRep, setSearchRep] = useState<string>("");
  const [showNewActivity, setShowNewActivity] = useState<boolean>(false);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Period date boundaries
  const periodRange = useMemo(() => {
    if (period === "all") return null;
    const start = new Date();
    if (period === "thisMonth") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === "thisQuarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start.setMonth(qMonth, 1);
      start.setHours(0, 0, 0, 0);
    } else if (period === "30d") {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (period === "ytd") {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }
    return start.toISOString();
  }, [period, now]);

  // Base team filtering
  const allTeamLeads = useMemo(
    () => leads.filter((l) => includesLead(l)),
    [leads, includesLead],
  );

  const allTeamActivities = useMemo(
    () => activities.filter((a) => includesActivity(a)),
    [activities, includesActivity],
  );

  // Filtered by selected rep and period
  const filteredLeads = useMemo(() => {
    return allTeamLeads.filter((l) => {
      if (selectedRep !== "all" && (l.owner || "").toLowerCase() !== selectedRep.toLowerCase()) {
        return false;
      }
      if (periodRange) {
        const dt = (l as any).updatedAtIso || l.updatedAt || l.created_at || (l as any).createdAt;
        if (dt && dt < periodRange) return false;
      }
      return true;
    });
  }, [allTeamLeads, selectedRep, periodRange]);

  const filteredActivities = useMemo(() => {
    return allTeamActivities.filter((a) => {
      if (selectedRep !== "all" && (a.owner || "").toLowerCase() !== selectedRep.toLowerCase()) {
        return false;
      }
      if (periodRange && a.dueDate) {
        if (a.dueDate < periodRange.slice(0, 10)) return false;
      }
      return true;
    });
  }, [allTeamActivities, selectedRep, periodRange]);

  // Inactive leads (stalled > 7 days)
  const inactiveTeamLeads = useMemo(() => {
    return allTeamLeads.filter((l: any) => {
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
      const { inactiveDays } = getLeadLastActivity(l, activities, history);
      return inactiveDays >= 7;
    });
  }, [allTeamLeads, activities, history]);

  // High-value deals in negotiation (Ready to close)
  const negotiationDeals = useMemo(() => {
    return filteredLeads
      .filter((l) => (l.status || "").toLowerCase() === "negotiation")
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [filteredLeads]);

  // Per-employee performance data
  const report = useMemo(() => {
    return employees.map((e) => {
      const myLeads = filteredLeads.filter(
        (l) => (l.owner || "").toLowerCase() === (e.name || "").toLowerCase(),
      );
      const myActs = filteredActivities.filter(
        (a) => (a.owner || "").toLowerCase() === (e.name || "").toLowerCase(),
      );
      const wonLeads = myLeads.filter((l) => l.status === "won");
      const doneActs = myActs.filter((a) => a.status === "done");
      const revenue = wonLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
      const pipelineVal = myLeads
        .filter((l) => l.status !== "won" && l.status !== "lost" && l.status !== "archived")
        .reduce((s, l) => s + (Number(l.value) || 0), 0);

      const target = Number(e.annualTarget) || 0;
      const achieved = Number(e.achievedTarget) || revenue;
      const attainment = target > 0 ? Math.round((achieved / target) * 100) : e.perf || 0;
      const convRate = myLeads.length ? Math.round((wonLeads.length / myLeads.length) * 100) : 0;

      return {
        ...e,
        totalLeads: myLeads.length,
        wonLeads: wonLeads.length,
        convRate,
        revenue,
        pipelineVal,
        totalActs: myActs.length,
        doneActs: doneActs.length,
        actCompletion: myActs.length ? Math.round((doneActs.length / myActs.length) * 100) : 0,
        target,
        achieved,
        attainment,
      };
    });
  }, [employees, filteredLeads, filteredActivities]);

  // Searched Reps list for Table
  const visibleReport = useMemo(() => {
    if (!searchRep.trim()) return report;
    const q = searchRep.toLowerCase().trim();
    return report.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.role?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q),
    );
  }, [report, searchRep]);

  // Aggregated totals
  const totals = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const wonLeads = filteredLeads.filter((l) => l.status === "won").length;
    const totalRevenue = filteredLeads
      .filter((l) => l.status === "won")
      .reduce((s, l) => s + (Number(l.value) || 0), 0);
    const activePipeline = filteredLeads
      .filter((l) => l.status !== "won" && l.status !== "lost" && l.status !== "archived")
      .reduce((s, l) => s + (Number(l.value) || 0), 0);
    const totalActs = filteredActivities.length;
    const doneActs = filteredActivities.filter((a) => a.status === "done").length;
    const convRate = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;
    const avgDealSize = wonLeads > 0 ? Math.round(totalRevenue / wonLeads) : 0;

    return {
      totalLeads,
      wonLeads,
      totalRevenue,
      activePipeline,
      totalActs,
      doneActs,
      convRate,
      avgDealSize,
    };
  }, [filteredLeads, filteredActivities]);

  // Stage distribution
  const stageStats = useMemo(() => {
    const stageKeys = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
    const stageColors: Record<string, string> = {
      new: "#94a3b8",
      contacted: "#0ea5e9",
      qualified: "#6366f1",
      proposal: "#f59e0b",
      negotiation: "#a855f7",
      won: "#10b981",
      lost: "#ef4444",
    };
    return stageKeys.map((k) => {
      const items = filteredLeads.filter((l) => (l.status || "").toLowerCase() === k);
      const val = items.reduce((s, l) => s + (Number(l.value) || 0), 0);
      return {
        stage: k.toUpperCase(),
        label: (t(k as any) as string) || k,
        count: items.length,
        value: val,
        color: stageColors[k] || "#F58220",
      };
    });
  }, [filteredLeads, t]);

  // Activity breakdown by type
  const activityTypeStats = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    filteredActivities.forEach((a) => {
      const type = a.type || "Call";
      map[type] = map[type] || { total: 0, done: 0 };
      map[type].total += 1;
      if (a.status === "done") map[type].done += 1;
    });
    return Object.entries(map).map(([type, stats]) => ({
      type,
      total: stats.total,
      done: stats.done,
      rate: stats.total ? Math.round((stats.done / stats.total) * 100) : 0,
    }));
  }, [filteredActivities]);

  // Lead Sources breakdown
  const sourceStats = useMemo(() => {
    const map: Record<string, { count: number; won: number; revenue: number }> = {};
    filteredLeads.forEach((l) => {
      const src = l.source || (isAr ? "غير محدد" : "Unspecified");
      map[src] = map[src] || { count: 0, won: 0, revenue: 0 };
      map[src].count += 1;
      if (l.status === "won") {
        map[src].won += 1;
        map[src].revenue += Number(l.value) || 0;
      }
    });
    return Object.entries(map)
      .map(([source, s]) => ({
        source,
        count: s.count,
        won: s.won,
        revenue: s.revenue,
        convRate: s.count ? Math.round((s.won / s.count) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredLeads, isAr]);

  // Excel Export with multi-sections
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const stamp = new Date().toISOString().slice(0, 10);

    // Sheet 1: Reps Performance
    const repRows = report.map((r) => ({
      Name: r.name,
      Role: r.role,
      Department: r.department,
      TotalLeads: r.totalLeads,
      WonLeads: r.wonLeads,
      ConversionRate: `${r.convRate}%`,
      ActivePipeline: r.pipelineVal,
      ClosedRevenue: r.revenue,
      AnnualTarget: r.target,
      Attainment: `${r.attainment}%`,
      TotalActivities: r.totalActs,
      CompletedActivities: r.doneActs,
      ActivityCompletionRate: `${r.actCompletion}%`,
    }));
    const wsReps = XLSX.utils.json_to_sheet(repRows);
    XLSX.utils.book_append_sheet(wb, wsReps, "Reps Performance");

    // Sheet 2: Stage Pipeline
    const stageRows = stageStats.map((s) => ({
      Stage: s.label,
      Count: s.count,
      TotalValue: s.value,
    }));
    const wsStages = XLSX.utils.json_to_sheet(stageRows);
    XLSX.utils.book_append_sheet(wb, wsStages, "Pipeline by Stage");

    // Sheet 3: Lead Sources
    const sourceRows = sourceStats.map((s) => ({
      Source: s.source,
      LeadsCount: s.count,
      WonDeals: s.won,
      ConversionRate: `${s.convRate}%`,
      Revenue: s.revenue,
    }));
    const wsSources = XLSX.utils.json_to_sheet(sourceRows);
    XLSX.utils.book_append_sheet(wb, wsSources, "Lead Sources ROI");

    XLSX.writeFile(wb, `Manager-Team-Analytics-${period}-${stamp}.xlsx`);
  };

  return (
    <AppShell
      panel="manager"
      user={{
        name: "",
        role: t("manager"),
        initials: "HR",
        photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
      }}
      pageTitle={t("reports")}
    >
      {/* 1. Header Command & Filter Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-foreground">
              {isAr ? "مركز تحليلات وتقارير الإدارة" : "Manager Intelligence & Reports"}
            </h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              {employees.length} {isAr ? "موظفين" : "Team Reps"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isAr
              ? "تحليل شامل لإنتاجية الفريق، مراحل خط المبيعات، ومصادر الصفقات مع إجراءات فورية"
              : "Comprehensive team performance, deal flow bottlenecks, effort ROI & action dispatch"}
          </p>
        </div>

        {/* Global Filter & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Filter */}
          <div className="inline-flex rounded-xl border border-border bg-secondary/40 p-1 text-xs font-semibold text-muted-foreground">
            {(
              [
                { key: "thisMonth", label: isAr ? "هذا الشهر" : "This Month" },
                { key: "thisQuarter", label: isAr ? "الربع الحالي" : "Qtr" },
                { key: "30d", label: isAr ? "30 يوم" : "30 Days" },
                { key: "ytd", label: isAr ? "منذ بداية العام" : "YTD" },
                { key: "all", label: isAr ? "الكل" : "All" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`rounded-lg px-3 py-1.5 transition ${
                  period === p.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Rep Filter Dropdown */}
          <select
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
          >
            <option value="all">{isAr ? "جميع أعضاء الفريق" : "All Team Reps"}</option>
            {employees.map((e) => (
              <option key={e.id} value={e.name}>
                {e.name}
              </option>
            ))}
          </select>

          {/* Quick Actions */}
          <button
            type="button"
            onClick={() => setShowNewActivity(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isAr ? "جدولة نشاط" : "Schedule Activity"}</span>
          </button>

          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-xs transition hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isAr ? "تصدير تقرير" : "Export Excel"}</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Metric Ribbon */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              {isAr ? "إجمالي خط الصفقات النشط" : "Active Pipeline Value"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-foreground">
            {fmtMoney(totals.activePipeline)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {totals.totalLeads} {isAr ? "صفقة جارية بالفريق" : "deals in scope"}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              {isAr ? "الإيرادات المحققة" : "Closed Won Revenue"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {fmtMoney(totals.totalRevenue)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {totals.wonLeads} {isAr ? "صفقة رابحة مغلقة" : "won deals closed"}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              {isAr ? "معدل التحويل ومتوسط الصفقة" : "Win Rate & Avg Deal"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-foreground">
            {totals.convRate}%
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {isAr ? "متوسط الصفقة:" : "Avg deal:"} <strong className="font-mono text-foreground">{fmtMoney(totals.avgDealSize)}</strong>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              {isAr ? "إنجاز الأنشطة الميدانية" : "Activities Velocity"}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-foreground">
            {totals.doneActs} / {totals.totalActs}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {totals.totalActs ? Math.round((totals.doneActs / totals.totalActs) * 100) : 100}% {isAr ? "نسبة إتمام الأنشطة" : "completion rate"}
          </div>
        </div>
      </div>

      {/* 3. Action Decision Matrix (Manager Intervention Cards) */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Alert 1: Urgent Inactive Deals */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {isAr ? "عملاء متوقفون بحاجة لتنشيط" : "Action: Stalled Leads"}
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                {inactiveTeamLeads.length} {isAr ? "صفقة" : "Deals"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isAr
                ? `يوجد ${inactiveTeamLeads.length} عميل في فريقك بدون أي تواصل منذ 7+ أيام. التدخل الفوري يحمي الصفقات من الضياع.`
                : `${inactiveTeamLeads.length} team leads have no touchpoints in 7+ days. Re-engage or re-assign to prevent attrition.`}
            </p>
          </div>
          <Link
            to="/manager/reports/inactive-leads"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
          >
            <span>{isAr ? "استعراض وإعادة تعيين العملاء" : "Review & Reassign Stalled Deals"}</span>
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>

        {/* Alert 2: Negotiation Deals to Close */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Zap className="h-4 w-4" />
                {isAr ? "فرص تفاوض جاهزة للإغلاق" : "Closing Priority: Negotiation"}
              </span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                {negotiationDeals.length} {isAr ? "صفقة" : "Deals"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isAr
                ? `إجمالي قيمة صفقات التفاوض ${fmtMoney(negotiationDeals.reduce((s, l) => s + (l.value || 0), 0))}. دعم الفريق في التفاوض يضمن تحقيق التارجت.`
                : `${fmtMoney(negotiationDeals.reduce((s, l) => s + (l.value || 0), 0))} in negotiation stage ready for executive close assistance.`}
            </p>
          </div>
          <Link
            to="/manager/pipeline"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <span>{isAr ? "فتح خط الصفقات بالتفاوض" : "Focus on Negotiation Stage"}</span>
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </Link>
        </div>

        {/* Alert 3: Coaching & Target Gap */}
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4.5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-400">
                <Award className="h-4 w-4" />
                {isAr ? "متابعة تدريب الموظفين" : "Rep Coaching & 1-on-1s"}
              </span>
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:text-sky-300">
                1-on-1
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isAr
                ? "حدد الموظفين أصحاب معدل التحويل الأقل من 15% لجدولة جلسة توجيه فردية ومراجعة عروض الأسعار."
                : "Identify reps with conversion rates below benchmark to schedule tactical coaching sessions."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewActivity(true)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline text-start"
          >
            <span>{isAr ? "+ جدولة جلسة متابعة فردية" : "+ Schedule Rep Coaching Session"}</span>
            <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* 4. Multi-Tab Analytical Workspace */}
      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-border bg-secondary/30 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "team", label: isAr ? "أداء الموظفين والمستهدفات" : "Team Quota & Performance", icon: Users },
              { id: "pipeline", label: isAr ? "مراحل خط الصفقات وعنق الزجاجة" : "Pipeline Flow & Funnel", icon: Layers },
              { id: "activities", label: isAr ? "تحليل جهود الأنشطة" : "Effort & Activity Types", icon: Clock },
              { id: "sources", label: isAr ? "مصادر العملاء وجودة الفرص" : "Lead Sources & ROI", icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "team" && (
            <div className="relative mt-2 sm:mt-0">
              <Search className="absolute start-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={isAr ? "بحث عن موظف..." : "Search rep..."}
                value={searchRep}
                onChange={(e) => setSearchRep(e.target.value)}
                className="h-8.5 w-48 rounded-xl border border-border bg-background ps-8 pe-3 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Team Quota & Performance Table + Chart */}
        {activeTab === "team" && (
          <div className="p-6 space-y-6">
            {/* Visual Rep Comparison Chart */}
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {isAr ? "مقارنة الإيرادات المحققة بالمستهدف لكل موظف" : "Won Revenue vs. Quota Target per Rep"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isAr ? "مقارنة مباشرة لإنجاز المستهدف السنوي" : "Visual attainment breakdown"}
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report.map((r) => ({
                      name: r.name?.split(" ")[0] || "Rep",
                      revenue: r.revenue,
                      pipeline: r.pipelineVal,
                    }))}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        fmtMoney(Number(val) || 0),
                        name === "revenue"
                          ? isAr
                            ? "الإيرادات المحققة"
                            : "Won Revenue"
                          : isAr
                            ? "قيمة الصفقات الجارية"
                            : "Active Pipeline",
                      ]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                      }}
                    />
                    <Legend
                      formatter={(val) =>
                        val === "revenue"
                          ? isAr
                            ? "الإيرادات المحققة"
                            : "Won Revenue"
                          : isAr
                            ? "الصفقات الجارية"
                            : "Active Pipeline"
                      }
                    />
                    <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pipeline" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Reps Performance Table with Action Dispatchers */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60">
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 text-start">{t("name")}</th>
                    <th className="px-4 py-3 text-center">{isAr ? "العملاء" : "Leads"}</th>
                    <th className="px-4 py-3 text-center">{isAr ? "الصفقات الرابحة" : "Won"}</th>
                    <th className="px-4 py-3 text-center">{isAr ? "معدل التحويل" : "Win Rate"}</th>
                    <th className="px-4 py-3 text-end">{isAr ? "خط الصفقات" : "Pipeline"}</th>
                    <th className="px-4 py-3 text-end">{isAr ? "الإيرادات" : "Revenue"}</th>
                    <th className="px-4 py-3 text-center">{isAr ? "نسبة الهدف" : "Attainment"}</th>
                    <th className="px-4 py-3 text-center">{isAr ? "إنجاز الأنشطة" : "Activities"}</th>
                    <th className="px-4 py-3 text-end">{isAr ? "إجراء سريع" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleReport.map((r, i) => (
                    <tr key={r.id || i} className="transition hover:bg-primary/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-xs text-foreground ring-1 ring-border">
                            {r.avatar || r.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{r.name}</div>
                            <div className="text-[10px] text-muted-foreground">{r.role || r.department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-foreground">
                        {r.totalLeads}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {r.wonLeads}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            r.convRate >= 25
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : r.convRate >= 15
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {r.convRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end font-mono text-xs font-semibold text-foreground">
                        {fmtMoney(r.pipelineVal)}
                      </td>
                      <td className="px-4 py-3 text-end font-mono text-xs font-bold text-primary">
                        {fmtMoney(r.revenue)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-28 mx-auto">
                          <div className="flex justify-between text-[11px] font-bold mb-0.5">
                            <span className={r.attainment >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                              {r.attainment}%
                            </span>
                            <span className="text-[9px] text-muted-foreground font-normal">
                              {r.target > 0 ? fmtMoney(r.target) : ""}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                r.attainment >= 100
                                  ? "bg-emerald-500"
                                  : r.attainment >= 75
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(r.attainment, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-xs text-foreground">
                          {r.doneActs} / {r.totalActs}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          ({r.actCompletion}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to="/manager/pipeline"
                            search={{ owner: r.name }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-accent transition"
                            title={isAr ? "عرض صفقات الموظف" : "View Deals in Pipeline"}
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>{isAr ? "الصفقات" : "Pipeline"}</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setShowNewActivity(true)}
                            className="rounded-lg bg-primary/10 p-1 text-primary hover:bg-primary hover:text-primary-foreground transition"
                            title={isAr ? "جدولة متابعة مع الموظف" : "Schedule 1-on-1"}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleReport.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-xs text-muted-foreground">
                        {isAr ? "لا يوجد موظفون مطابقون للبحث" : "No reps match your search query."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Pipeline Flow & Funnel Bottlenecks */}
        {activeTab === "pipeline" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Funnel Stage Breakdown */}
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-foreground">
                    {isAr ? "توزيع خط الصفقات عبر المراحل" : "Pipeline Distribution by Stage"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isAr ? "قيمة وعدد الصفقات في كل مرحلة" : "Deals volume and conversion flow"}
                  </p>
                </div>

                <div className="space-y-3">
                  {stageStats.map((st) => (
                    <div key={st.stage} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-foreground flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: st.color }} />
                          {st.label} ({st.count} {isAr ? "صفقة" : "deals"})
                        </span>
                        <span className="font-mono font-bold text-foreground">{fmtMoney(st.value)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${totals.activePipeline > 0 ? Math.min(100, Math.round((st.value / totals.activePipeline) * 100)) : 0}%`,
                            backgroundColor: st.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage Value Chart */}
              <div className="rounded-xl border border-border bg-background p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-1">
                    {isAr ? "رسم بياني لقيمة المراحل" : "Stage Deal Values Chart"}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {isAr ? "مقارنة حجم الأموال المحتجزة في كل مرحلة" : "Capital committed per pipeline stage"}
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageStats} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
                      />
                      <Tooltip
                        formatter={(val: any) => [fmtMoney(Number(val) || 0), isAr ? "القيمة" : "Total Value"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "0.75rem",
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {stageStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {isAr ? "المراحل الحرجة:" : "Priority Stage:"} <strong className="text-foreground">Negotiation ({negotiationDeals.length})</strong>
                  </span>
                  <Link to="/manager/pipeline" className="font-semibold text-primary hover:underline">
                    {isAr ? "إدارة خط الصفقات ←" : "Open Kanban Pipeline →"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Effort & Activity Types */}
        {activeTab === "activities" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Activity Types Table */}
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-foreground">
                    {isAr ? "توزيع الأنشطة ونسب الإنجاز" : "Activity Breakdown by Type"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isAr ? "مقارنة المكالمات، الاجتماعات، والزيارات الميدانية" : "Effort invested by activity category"}
                  </p>
                </div>

                <div className="space-y-3">
                  {activityTypeStats.map((item) => (
                    <div key={item.type} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-foreground">
                          {item.type} ({item.done} / {item.total})
                        </span>
                        <span className="font-mono font-bold text-primary">{item.rate}% {isAr ? "مكتمل" : "Done"}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {activityTypeStats.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      {isAr ? "لا توجد أنشطة مسجلة في هذه الفترة" : "No activities recorded in this period."}
                    </div>
                  )}
                </div>
              </div>

              {/* Activities Bar Chart */}
              <div className="rounded-xl border border-border bg-background p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-1">
                    {isAr ? "مقارنة الأنشطة المجدولة بالمنجزة" : "Scheduled vs. Completed Activities"}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {isAr ? "تحليل سرعة إتمام المهام" : "Team velocity across activity types"}
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityTypeStats} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="type" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "0.75rem",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="total" name={isAr ? "المجدولة" : "Total Scheduled"} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="done" name={isAr ? "المنجزة" : "Completed"} fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {isAr ? "الأنشطة المكتملة اليوم:" : "Done Today:"} <strong className="text-foreground">{totals.doneActs}</strong>
                  </span>
                  <Link to="/manager/activities" className="font-semibold text-primary hover:underline">
                    {isAr ? "إدارة جدول الأنشطة ←" : "Open Activities Calendar →"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Lead Sources ROI */}
        {activeTab === "sources" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lead Sources Table */}
              <div className="rounded-xl border border-border bg-background p-5">
                <div className="mb-4">
                  <h3 className="font-bold text-sm text-foreground">
                    {isAr ? "مردود مصادر العملاء (ROI)" : "Lead Sources & Conversion ROI"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isAr ? "أي القنوات تحقق أعلى عائد مالي وأعلى نسبة إغلاق؟" : "Which acquisition channels yield the highest revenue?"}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/60">
                      <tr className="font-semibold text-muted-foreground">
                        <th className="px-3 py-2 text-start">{isAr ? "المصدر" : "Source"}</th>
                        <th className="px-3 py-2 text-center">{isAr ? "العدد" : "Leads"}</th>
                        <th className="px-3 py-2 text-center">{isAr ? "الرابح" : "Won"}</th>
                        <th className="px-3 py-2 text-center">{isAr ? "التحويل" : "Win Rate"}</th>
                        <th className="px-3 py-2 text-end">{isAr ? "الإيرادات" : "Revenue"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sourceStats.map((s) => (
                        <tr key={s.source} className="hover:bg-primary/5">
                          <td className="px-3 py-2.5 font-semibold text-foreground">{s.source}</td>
                          <td className="px-3 py-2.5 text-center font-mono">{s.count}</td>
                          <td className="px-3 py-2.5 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {s.won}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="rounded-md bg-secondary px-1.5 py-0.5 font-mono font-semibold text-foreground">
                              {s.convRate}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-end font-mono font-bold text-primary">
                            {fmtMoney(s.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Source Revenue Chart */}
              <div className="rounded-xl border border-border bg-background p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground mb-1">
                    {isAr ? "توزيع الإيرادات حسب مصدر العميل" : "Revenue Contribution by Channel"}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {isAr ? "مصادر الصفقات الأكثر ربحية" : "Visual channel revenue comparison"}
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sourceStats}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => (v >= 1000 ? `$${v / 1000}k` : `$${v}`)}
                      />
                      <YAxis
                        type="category"
                        dataKey="source"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        formatter={(val: any) => [fmtMoney(Number(val) || 0), isAr ? "الإيرادات" : "Revenue"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "0.75rem",
                        }}
                      />
                      <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {isAr ? "أفضل مصدر:" : "Top Source:"} <strong className="text-foreground">{sourceStats[0]?.source || "Direct"}</strong>
                  </span>
                  <Link to="/manager/leads" className="font-semibold text-primary hover:underline">
                    {isAr ? "استعراض قائمة العملاء ←" : "Explore All Leads →"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Activity Dialog for Scheduling from Reports */}
      {showNewActivity && (
        <NewActivityDialog onClose={() => setShowNewActivity(false)} />
      )}
    </AppShell>
  );
}
