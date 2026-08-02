import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState } from "@/lib/store";
import { useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Briefcase,
  FileBadge,
  Clock,
  Printer,
  Download,
  Target,
  Building2,
  Filter,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Line,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
  ComposedChart,
} from "recharts";

export const Route = createFileRoute("/admin/reports/")({
  component: AdminReportsPage,
  head: () => ({ meta: [{ title: "Reports · Admin" }] }),
});

function AdminReportsPage() {
  const { t, dir } = useI18n();
  const ar = dir === "rtl";
  const { activities, leads, projects, quotations, employees, attendance, settings, users } =
    useStoreState();

  const activeEmployees = useMemo(() => {
    return employees.filter((e) => {
      const u = users.find((user) => user.profileId === e.id || user.id === (e as any).userId);
      return (u as any)?.status !== "inactive";
    });
  }, [employees, users]);

  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [empFilter, setEmpFilter] = useState<string>("all");

  const depts = useMemo(() => {
    const s = new Set<string>();
    activeEmployees.forEach((e) => {
      if (e.department) s.add(e.department);
    });
    return Array.from(s).sort();
  }, [activeEmployees]);

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter((e) => {
      if (deptFilter !== "all" && e.department !== deptFilter) return false;
      if (empFilter !== "all" && e.id !== empFilter) return false;
      return true;
    });
  }, [activeEmployees, deptFilter, empFilter]);

  const filteredEmpNames = useMemo(
    () => new Set(filteredEmployees.map((e) => e.name)),
    [filteredEmployees],
  );

  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (l) => filteredEmployees.length === activeEmployees.length || filteredEmpNames.has(l.owner),
      ),
    [leads, filteredEmployees, activeEmployees.length, filteredEmpNames],
  );

  const filteredActivities = useMemo(
    () =>
      activities.filter(
        (a) =>
          filteredEmployees.length === activeEmployees.length ||
          filteredEmpNames.has(a.owner) ||
          filteredEmpNames.has((a as any).createdByName ?? ""),
      ),
    [activities, filteredEmployees, activeEmployees.length, filteredEmpNames],
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (p) =>
          filteredEmployees.length === activeEmployees.length ||
          filteredEmpNames.has((p as any).owner ?? "") ||
          filteredEmpNames.has((p as any).createdByName ?? ""),
      ),
    [projects, filteredEmployees, activeEmployees.length, filteredEmpNames],
  );

  const teamReport = useMemo(
    () =>
      filteredEmployees.map((e) => {
        const empLeads = leads.filter((l) => l.owner === e.name);
        const totalLeads = empLeads.length;
        const wonLeads = empLeads.filter((l) => l.status === "won").length;
        const revenue = empLeads
          .filter((l) => l.status === "won")
          .reduce((s, l) => s + (l.value ?? 0), 0);
        const pipelineValue = empLeads
          .filter((l) => l.status !== "won" && l.status !== "lost")
          .reduce((s, l) => s + (l.value ?? 0), 0);

        const empActs = activities.filter((a) => a.owner === e.name);
        const actsCount = empActs.length;
        const completedActs = empActs.filter((a) => a.status === "done").length;

        const conv = totalLeads ? Math.round((wonLeads / totalLeads) * 100) : 0;
        const target = e.annualTarget ?? 0;
        const achieved = e.achievedTarget ?? revenue;
        const perf = target ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

        return {
          id: e.id,
          name: e.name,
          department: e.department || (ar ? "عام" : "General"),
          role: e.role,
          totalLeads,
          wonLeads,
          revenue,
          pipelineValue,
          actsCount,
          completedActs,
          conv,
          perf,
          target,
          achieved,
        };
      }),
    [filteredEmployees, leads, activities, ar],
  );

  const pipelineByStage = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    filteredLeads.forEach((l) => {
      const st = (l as any).stageId || l.status || "New";
      map[st] = map[st] ?? { count: 0, value: 0 };
      map[st].count += 1;
      map[st].value += l.value ?? 0;
    });
    const order = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
    return Object.entries(map)
      .map(([stage, v]) => ({ stage, ...v }))
      .sort((a, b) => {
        const ia = order.indexOf(a.stage.toLowerCase());
        const ib = order.indexOf(b.stage.toLowerCase());
        if (ia !== -1 && ib !== -1) return ia - ib;
        return a.stage.localeCompare(b.stage);
      });
  }, [filteredLeads]);

  const funnelData = useMemo(() => {
    const total = filteredLeads.length || 1;
    return pipelineByStage.map((s) => ({
      name: s.stage,
      value: s.count,
      valStr: `${s.count} (${Math.round((s.count / total) * 100)}%)`,
    }));
  }, [pipelineByStage, filteredLeads.length]);

  const actTypeDist = useMemo(() => {
    const map: Record<string, number> = {};
    filteredActivities.forEach((a) => {
      const t = a.type || "Call";
      map[t] = (map[t] ?? 0) + 1;
    });
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }, [filteredActivities]);

  const leadSources = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeads.forEach((l) => {
      const src = l.source || (ar ? "غير محدد" : "Unspecified");
      map[src] = (map[src] ?? 0) + 1;
    });
    return Object.entries(map).map(([source, count]) => ({ source, count }));
  }, [filteredLeads, ar]);

  const monthlyTrend = useMemo(() => {
    const months = ar
      ? [
          "يناير",
          "فبراير",
          "مارس",
          "أبريل",
          "مايو",
          "يونيو",
          "يوليو",
          "أغسطس",
          "سبتمبر",
          "أكتوبر",
          "نوفمبر",
          "ديسمبر",
        ]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const now = new Date();
    const currM = now.getMonth();

    const last6 = Array.from({ length: 6 }).map((_, i) => {
      const idx = (currM - 5 + i + 12) % 12;
      return { month: months[idx], mIdx: idx, leads: 0, revenue: 0 };
    });

    filteredLeads.forEach((l) => {
      const created = (l as any).createdAt || l.updatedAt;
      if (created) {
        const d = new Date(created);
        const item = last6.find((x) => x.mIdx === d.getMonth());
        if (item) {
          item.leads += 1;
          if (l.status === "won") item.revenue += l.value ?? 0;
        }
      }
    });

    return last6;
  }, [filteredLeads, ar]);

  const attendanceAgg = useMemo(() => {
    const totalDays = attendance.length || 1;
    const present = attendance.filter((a) => a.checkIn).length;
    const late = attendance.filter((a) => (a as any).isLate).length;
    const totalHours = attendance.reduce((s, a) => s + ((a as any).workingHours ?? 0), 0);
    return {
      rate: Math.round((present / totalDays) * 100),
      lateRate: Math.round((late / totalDays) * 100),
      avgHours: Math.round((totalHours / totalDays) * 10) / 10,
    };
  }, [attendance]);

  const projectsSummary = useMemo(
    () =>
      filteredProjects.map((p) => {
        const pActs = activities.filter((a) => (a as any).projectId === p.id);
        const completedActs = pActs.filter((a) => a.status === "done").length;
        return {
          id: p.id,
          name: p.name,
          client: (p as any).clientName ?? p.client,
          budget: p.budget ?? 0,
          progress: p.progress ?? 0,
          status: p.status,
          totalActs: pActs.length,
          completedActs,
          actCompRate: pActs.length ? Math.round((completedActs / pActs.length) * 100) : 0,
        };
      }),
    [filteredProjects, activities],
  );

  const totals = {
    leads: teamReport.reduce((s, r) => s + r.totalLeads, 0),
    won: teamReport.reduce((s, r) => s + r.wonLeads, 0),
    revenue: teamReport.reduce((s, r) => s + r.revenue, 0),
    pipeline: teamReport.reduce((s, r) => s + r.pipelineValue, 0),
    annualTarget: filteredEmployees.reduce((s, e) => s + (e.annualTarget ?? 0), 0),
    achievedTarget: filteredEmployees.reduce((s, e) => s + (e.achievedTarget ?? 0), 0),
  };
  const orgTargetPerc = totals.annualTarget
    ? Math.round((totals.achievedTarget / totals.annualTarget) * 100)
    : 0;

  const deptMap = new Map<
    string,
    { revenue: number; leads: number; won: number; headcount: number; perfSum: number }
  >();
  teamReport.forEach((r) => {
    const cur = deptMap.get(r.department) ?? {
      revenue: 0,
      leads: 0,
      won: 0,
      headcount: 0,
      perfSum: 0,
    };
    cur.revenue += r.revenue;
    cur.leads += r.totalLeads;
    cur.won += r.wonLeads;
    cur.headcount += 1;
    cur.perfSum += r.perf;
    deptMap.set(r.department, cur);
  });
  const departments = Array.from(deptMap.entries()).map(([name, v]) => ({
    name,
    ...v,
    avgPerf: v.headcount ? Math.round(v.perfSum / v.headcount) : 0,
    convRate: v.leads ? Math.round((v.won / v.leads) * 100) : 0,
  }));

  const projectsBudget = filteredProjects.reduce((s, p) => s + (p.budget ?? 0), 0);

  const filteredQuotes = useMemo(
    () =>
      quotations.filter(
        (q) =>
          filteredEmployees.length === activeEmployees.length ||
          filteredEmpNames.has((q as any).owner ?? "") ||
          filteredEmpNames.has((q as any).createdByName ?? ""),
      ),
    [quotations, filteredEmployees, activeEmployees.length, filteredEmpNames],
  );

  const quotesSummary = filteredQuotes.reduce<Record<string, { count: number; value: number }>>(
    (acc, q) => {
      const k = q.status;
      acc[k] = acc[k] ?? { count: 0, value: 0 };
      acc[k].count += 1;
      acc[k].value += q.value;
      return acc;
    },
    {},
  );

  const topPerformers = [...teamReport].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const generatedAt = new Intl.DateTimeFormat(ar ? "ar-EG" : "en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const today = new Date().toISOString().slice(0, 10);

  const exportCsv = () => {
    const headers = [
      "ID",
      "Name",
      "Department",
      "Role",
      "Leads",
      "Won",
      "Conv%",
      "Revenue",
      "Pipeline",
      "Activities",
      "Target",
      "Achieved",
      "Perf%",
    ];
    const rows = teamReport.map((r) => [
      r.id,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.department.replace(/"/g, '""')}"`,
      `"${r.role}"`,
      r.totalLeads,
      r.wonLeads,
      `${r.conv}%`,
      r.revenue,
      r.pipelineValue,
      r.actsCount,
      r.target,
      r.achieved,
      `${r.perf}%`,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-report-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      panel="admin"
      user={{
        name: "",
        role: t("admin"),
        initials: "HR",
        photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
      }}
      pageTitle={t("reports")}
    >
      {/* Header / actions */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            {ar ? "تقارير المؤسسة" : "Organization Reports"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {ar ? "تم الإنشاء في" : "Generated on"} {generatedAt}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/reports/inactive-leads"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-primary/20"
          >
            <AlertTriangle className="h-4 w-4" />
            {ar ? "تقرير العملاء غير النشطين" : "Inactive Leads Report"}
          </Link>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
          >
            <Download className="h-4 w-4" /> {ar ? "تصدير CSV" : "Export CSV"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" /> {ar ? "طباعة" : "Print"}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] print:hidden">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {ar ? "تصفية حسب:" : "Filter by:"}
        </div>
        <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value);
            setEmpFilter("all");
          }}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">{ar ? "جميع الأقسام" : "All Departments"}</option>
          {depts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={empFilter}
          onChange={(e) => setEmpFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">{ar ? "جميع الموظفين" : "All Employees"}</option>
          {activeEmployees
            .filter((e) => deptFilter === "all" || e.department === deptFilter)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.department || (ar ? "عام" : "General")})
              </option>
            ))}
        </select>

        {(deptFilter !== "all" || empFilter !== "all") && (
          <button
            onClick={() => {
              setDeptFilter("all");
              setEmpFilter("all");
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {ar ? "إعادة ضبط" : "Reset"}
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{ar ? "إجمالي العملاء" : "Total Leads"}</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{totals.leads}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {totals.won} {ar ? "فوز" : "won"} (
            {totals.leads ? Math.round((totals.won / totals.leads) * 100) : 0}%)
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{ar ? "الإيرادات الكلية" : "Won Revenue"}</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{fmtMoney(totals.revenue)}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-semibold">
            {ar ? "من الصفقات الفائزة" : "From closed-won"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{ar ? "قيمة الفرص" : "Pipeline Value"}</span>
            <Briefcase className="h-4 w-4 text-violet-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{fmtMoney(totals.pipeline)}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {ar ? "صفقات نشطة" : "Active open deals"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{ar ? "تحقيق الهدف" : "Target Achievement"}</span>
            <Target className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{orgTargetPerc}%</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {fmtMoney(totals.achievedTarget)} / {fmtMoney(totals.annualTarget)}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{ar ? "المشاريع النشطة" : "Active Projects"}</span>
            <Building2 className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{filteredProjects.length}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {fmtMoney(projectsBudget)} {ar ? "ميزانية" : "budget"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{ar ? "نسبة الحضور" : "Attendance Rate"}</span>
            <Clock className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{attendanceAgg.rate}%</div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {attendanceAgg.lateRate}% {ar ? "تأخير" : "late rate"}
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lead & Revenue Trend Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-base font-bold text-foreground mb-4">
            {ar ? "اتجاه العملاء والإيرادات (آخر 6 أشهر)" : "Leads & Revenue Trend (Last 6 Months)"}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="leads"
                  name={ar ? "العملاء" : "Leads"}
                  fill="var(--color-primary, #3b82f6)"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  name={ar ? "الإيرادات" : "Revenue"}
                  stroke="#10b981"
                  strokeWidth={3}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Stage Distribution Funnel */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-base font-bold text-foreground mb-4">
            {ar ? "توزيع المراحل في مسار المبيعات" : "Pipeline Stage Distribution"}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineByStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={90} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    name === "count" ? value : fmtMoney(Number(value)),
                    name === "count" ? (ar ? "العدد" : "Count") : ar ? "القيمة" : "Value",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="count"
                  name={ar ? "عدد الصفقات" : "Deals Count"}
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-base font-bold text-foreground mb-4">
          {ar ? "أداء أعضاء الفريق التفصيلي" : "Team Members Performance Breakdown"}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="border-b border-border bg-secondary/50 font-bold text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">{ar ? "الموظف" : "Employee"}</th>
                <th className="px-4 py-3 text-start">{ar ? "القسم" : "Department"}</th>
                <th className="px-4 py-3 text-start">{ar ? "إجمالي العملاء" : "Total Leads"}</th>
                <th className="px-4 py-3 text-start">{ar ? "الفوز" : "Won"}</th>
                <th className="px-4 py-3 text-start">{ar ? "نسبة التحويل" : "Conv %"}</th>
                <th className="px-4 py-3 text-start">{ar ? "الإيرادات المحققة" : "Revenue"}</th>
                <th className="px-4 py-3 text-start">{ar ? "قيمة الفرص" : "Pipeline"}</th>
                <th className="px-4 py-3 text-start">{ar ? "الهدف السنوي" : "Annual Target"}</th>
                <th className="px-4 py-3 text-start">{ar ? "نسبة الإنجاز" : "Achievement"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teamReport.map((r) => (
                <tr key={r.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-bold text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.department}</td>
                  <td className="px-4 py-3 font-semibold">{r.totalLeads}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">{r.wonLeads}</td>
                  <td className="px-4 py-3 font-semibold">{r.conv}%</td>
                  <td className="px-4 py-3 font-bold text-foreground">{fmtMoney(r.revenue)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtMoney(r.pipelineValue)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtMoney(r.target)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${
                            r.perf >= 100
                              ? "bg-emerald-500"
                              : r.perf >= 60
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{ width: `${Math.min(100, r.perf)}%` }}
                        />
                      </div>
                      <span className="font-bold text-foreground">{r.perf}%</span>
                    </div>
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
