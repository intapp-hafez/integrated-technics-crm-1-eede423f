import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/admin/reports")({
  component: AdminReportsPage,
  head: () => ({ meta: [{ title: "Reports · Admin" }] }),
});

function AdminReportsPage() {
  const { t, dir } = useI18n();
  const ar = dir === "rtl";
  const { activities, leads, projects, quotations, employees, attendance, settings } =
    useStoreState();
  const today = new Date().toISOString().slice(0, 10);

  // ===== Interactive filters =====
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");

  const departmentsList = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).filter(Boolean),
    [employees],
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter(
        (e) =>
          (deptFilter === "all" || e.department === deptFilter) &&
          (employeeFilter === "all" || e.id === employeeFilter),
      ),
    [employees, deptFilter, employeeFilter],
  );
  const filteredEmpNames = useMemo(
    () => new Set(filteredEmployees.map((e) => e.name)),
    [filteredEmployees],
  );

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - rangeDays + 1);
    return d.toISOString().slice(0, 10);
  }, [rangeDays]);

  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (l) => filteredEmpNames.has(l.owner) || filteredEmployees.length === employees.length,
      ),
    [leads, filteredEmpNames, filteredEmployees.length, employees.length],
  );

  // Real pipeline stages computed from leads
  const pipelineStages = useMemo(() => {
    return settings.stages.map((st) => {
      const stageLeads = leads.filter((l) => l.status === st.key);
      return {
        key: st.key,
        label: st.label,
        color: st.color,
        count: stageLeads.length,
        value: stageLeads.reduce((s, l) => s + (l.value ?? 0), 0),
      };
    });
  }, [leads, settings.stages]);

  // Real today's attendance computed from records
  const attendanceToday = useMemo(() => {
    const todays = attendance.filter((r) => r.date === today);
    const present = todays.filter((r) => r.checkIn && r.checkIn <= "08:15").length;
    const late = todays.filter((r) => r.checkIn && r.checkIn > "08:15").length;
    const checkedIn = todays.filter((r) => r.checkIn).length;
    const total = employees.length || todays.length;
    const absent = Math.max(0, total - checkedIn);
    return { present, late, absent, total };
  }, [attendance, employees, today]);

  const teamReport = useMemo(
    () =>
      employees.map((e) => {
        const myLeads = leads.filter((l) => l.owner === e.name);
        const myActs = activities.filter((a) => a.owner === e.name);
        const wonLeads = myLeads.filter((l) => l.status === "won");
        const doneActs = myActs.filter((a) => a.status === "done");
        const revenue = wonLeads.reduce((s, l) => s + l.value, 0);
        const pipelineValue = myLeads
          .filter((l) => !["won", "lost"].includes(l.status))
          .reduce((s, l) => s + l.value, 0);
        return {
          ...e,
          totalLeads: myLeads.length,
          wonLeads: wonLeads.length,
          totalActs: myActs.length,
          doneActs: doneActs.length,
          revenue,
          pipelineValue,
          convRate: myLeads.length ? Math.round((wonLeads.length / myLeads.length) * 100) : 0,
          targetPerc: e.annualTarget
            ? Math.round(((e.achievedTarget ?? 0) / e.annualTarget) * 100)
            : 0,
        };
      }),
    [activities, leads],
  );

  const totals = {
    leads: teamReport.reduce((s, r) => s + r.totalLeads, 0),
    won: teamReport.reduce((s, r) => s + r.wonLeads, 0),
    revenue: teamReport.reduce((s, r) => s + r.revenue, 0),
    pipeline: teamReport.reduce((s, r) => s + r.pipelineValue, 0),
    annualTarget: employees.reduce((s, e) => s + (e.annualTarget ?? 0), 0),
    achievedTarget: employees.reduce((s, e) => s + (e.achievedTarget ?? 0), 0),
  };
  const orgTargetPerc = totals.annualTarget
    ? Math.round((totals.achievedTarget / totals.annualTarget) * 100)
    : 0;

  // Department aggregation
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
    avgPerf: Math.round(v.perfSum / v.headcount),
  }));

  // Projects status summary
  const projectStatus = projects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});
  const projectsBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0);

  // Quotations summary
  const quotesSummary = quotations.reduce<Record<string, { count: number; value: number }>>(
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

  const exportCsv = () => {
    const headers = [
      "ID",
      "Name",
      "Department",
      "Role",
      "Leads",
      "Won",
      "Conv%",
      "Activities",
      "Done",
      "Revenue",
      "Pipeline",
      "Annual Target",
      "Achieved",
      "Target%",
      "Performance",
    ];
    const rows = teamReport.map((r) => [
      r.id,
      r.name,
      r.department,
      r.role,
      r.totalLeads,
      r.wonLeads,
      r.convRate,
      r.totalActs,
      r.doneActs,
      r.revenue,
      r.pipelineValue,
      r.annualTarget ?? 0,
      r.achievedTarget ?? 0,
      r.targetPerc,
      r.perf,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
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
        name: "hafez Rahim",
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

      {/* Executive summary KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          {
            icon: Users,
            label: ar ? "إجمالي العملاء" : "Total Leads",
            value: totals.leads,
            color: "text-sky-600",
            bg: "bg-sky-50",
          },
          {
            icon: CheckCircle2,
            label: ar ? "صفقات مُغلقة" : "Won Deals",
            value: totals.won,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            icon: TrendingUp,
            label: ar ? "الإيرادات المُحققة" : "Revenue",
            value: fmtMoney(totals.revenue),
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            icon: Target,
            label: ar ? "الأنابيب المفتوحة" : "Open Pipeline",
            value: fmtMoney(totals.pipeline),
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg} ${s.color}`}
              >
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

      {/* Annual target gauge */}
      <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-card to-primary/5 p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              {ar ? "الهدف السنوي للمؤسسة" : "Organization Annual Target"}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {fmtMoney(totals.achievedTarget)} / {fmtMoney(totals.annualTarget)}
            </p>
          </div>
          <div
            className={`font-mono text-3xl font-bold ${orgTargetPerc >= 100 ? "text-emerald-600" : orgTargetPerc >= 75 ? "text-amber-600" : "text-rose-600"}`}
          >
            {orgTargetPerc}%
          </div>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${orgTargetPerc >= 100 ? "from-emerald-400 to-emerald-600" : orgTargetPerc >= 75 ? "from-amber-400 to-amber-600" : "from-rose-400 to-primary"}`}
            style={{ width: `${Math.min(orgTargetPerc, 100)}%` }}
          />
        </div>
      </div>

      {/* ===== Interactive filters & advanced charts ===== */}
      <FiltersAndCharts
        ar={ar}
        rangeDays={rangeDays}
        setRangeDays={setRangeDays}
        deptFilter={deptFilter}
        setDeptFilter={setDeptFilter}
        employeeFilter={employeeFilter}
        setEmployeeFilter={setEmployeeFilter}
        departmentsList={departmentsList}
        filteredEmployees={filteredEmployees}
        filteredEmpNames={filteredEmpNames}
        leads={filteredLeads}
        attendance={attendance}
        rangeStart={rangeStart}
        stages={settings.stages}
        employees={employees}
      />

      {/* Two-column: Departments + Pipeline */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              {ar ? "أداء الأقسام" : "Department Performance"}
            </h3>
          </div>
          <div className="space-y-3">
            {departments.map((d) => (
              <div key={d.name} className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="font-semibold text-foreground">{d.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {d.headcount} {ar ? "موظف" : "members"}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <div className="text-muted-foreground">{ar ? "إيراد" : "Revenue"}</div>
                    <div className="font-mono font-semibold text-primary">
                      {fmtMoney(d.revenue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{ar ? "صفقات" : "Won"}</div>
                    <div className="font-mono font-semibold text-emerald-600">
                      {d.won}/{d.leads}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{ar ? "الأداء" : "Avg Perf"}</div>
                    <div className="font-mono font-semibold text-amber-600">{d.avgPerf}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              {ar ? "توزيع خط البيع" : "Pipeline Distribution"}
            </h3>
          </div>
          <div className="space-y-3">
            {pipelineStages.map((st) => {
              const max = Math.max(...pipelineStages.map((x) => x.value));
              const w = Math.round((st.value / max) * 100);
              return (
                <div key={st.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{st.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {st.count} · {fmtMoney(st.value)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${w}%`, background: st.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Projects + Quotations + Attendance */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              {ar ? "حالة المشاريع" : "Projects Status"}
            </h3>
          </div>
          <div className="mb-3 font-mono text-xs text-muted-foreground">
            {ar ? "الميزانية الإجمالية" : "Total Budget"}:{" "}
            <span className="font-semibold text-foreground">{fmtMoney(projectsBudget)}</span>
          </div>
          <div className="space-y-2">
            {Object.entries(projectStatus).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">{k}</span>
                <span className="font-mono font-bold text-primary">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <FileBadge className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              {ar ? "ملخّص العروض" : "Quotations Summary"}
            </h3>
          </div>
          <div className="space-y-2">
            {Object.entries(quotesSummary).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize text-foreground">
                    {k.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono font-bold text-primary">{v.count}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {fmtMoney(v.value)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              {ar ? "حضور اليوم" : "Today's Attendance"}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="font-mono text-2xl font-bold text-emerald-600">
                {attendanceToday.present}
              </div>
              <div className="text-[11px] text-muted-foreground">{ar ? "حاضر" : "Present"}</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="font-mono text-2xl font-bold text-amber-600">
                {attendanceToday.late}
              </div>
              <div className="text-[11px] text-muted-foreground">{ar ? "متأخر" : "Late"}</div>
            </div>
            <div className="rounded-lg bg-rose-50 p-3">
              <div className="font-mono text-2xl font-bold text-rose-600">
                {attendanceToday.absent}
              </div>
              <div className="text-[11px] text-muted-foreground">{ar ? "غائب" : "Absent"}</div>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <div className="font-mono text-2xl font-bold text-primary">
                {attendanceToday.total}
              </div>
              <div className="text-[11px] text-muted-foreground">{ar ? "الإجمالي" : "Total"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top performers */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h3 className="mb-4 font-display text-base font-bold text-foreground">
          {ar ? "أفضل المؤدّين" : "Top Performers"}
        </h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {topPerformers.map((r, i) => (
            <div
              key={r.id}
              className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-secondary/40 to-card p-4"
            >
              <div className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <div className="flex items-center gap-3">
                <img src={r.photo} alt={r.name} className="h-12 w-12 rounded-full object-cover" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">{r.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{r.role}</div>
                </div>
              </div>
              <div className="mt-3 font-mono text-lg font-bold text-primary">
                {fmtMoney(r.revenue)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {r.wonLeads} {ar ? "صفقة" : "deals"} · {r.convRate}% {ar ? "تحويل" : "conv"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-employee table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="border-b border-border px-6 py-4">
          <h3 className="font-display text-base font-bold text-foreground">
            {ar ? "تقرير أداء الفريق التفصيلي" : "Detailed Team Performance"}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("name")}
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("leads")}
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("won")}
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {ar ? "تحويل" : "Conv %"}
                </th>
                <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {ar ? "الإيرادات" : "Revenue"}
                </th>
                <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {ar ? "الأنبوب" : "Pipeline"}
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {ar ? "الهدف" : "Target"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teamReport.map((r) => (
                <tr key={r.id} className="transition hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={r.photo}
                        alt={r.name}
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-semibold text-foreground">{r.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {r.department} · {r.role}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold text-foreground">
                    {r.totalLeads}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold text-emerald-600">
                    {r.wonLeads}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.convRate >= 30 ? "bg-emerald-50 text-emerald-700" : r.convRate >= 15 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}
                    >
                      {r.convRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end font-mono font-semibold text-primary">
                    {fmtMoney(r.revenue)}
                  </td>
                  <td className="px-4 py-3 text-end font-mono text-foreground">
                    {fmtMoney(r.pipelineValue)}
                  </td>
                  <td className="px-4 py-3">
                    {r.annualTarget ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${r.targetPerc >= 100 ? "from-emerald-400 to-emerald-600" : r.targetPerc >= 75 ? "from-amber-400 to-amber-600" : "from-rose-400 to-rose-600"}`}
                            style={{ width: `${Math.min(r.targetPerc, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`font-mono text-xs font-bold ${r.targetPerc >= 100 ? "text-emerald-600" : r.targetPerc >= 75 ? "text-amber-600" : "text-rose-600"}`}
                        >
                          {r.targetPerc}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
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

interface FiltersAndChartsProps {
  ar: boolean;
  rangeDays: number;
  setRangeDays: (n: number) => void;
  deptFilter: string;
  setDeptFilter: (s: string) => void;
  employeeFilter: string;
  setEmployeeFilter: (s: string) => void;
  departmentsList: string[];
  filteredEmployees: any[];
  filteredEmpNames: Set<string>;
  leads: any[];
  attendance: any[];
  rangeStart: string;
  stages: { key: string; label: string; color: string }[];
  employees: any[];
}

function FiltersAndCharts(p: FiltersAndChartsProps) {
  const {
    ar,
    rangeDays,
    setRangeDays,
    deptFilter,
    setDeptFilter,
    employeeFilter,
    setEmployeeFilter,
    departmentsList,
    filteredEmployees,
    filteredEmpNames,
    leads,
    attendance,
    rangeStart,
    stages,
    employees,
  } = p;

  // Pipeline trends — count per stage with value
  const pipelineTrend = useMemo(() => {
    return stages.map((st) => {
      const stageLeads = leads.filter((l: any) => l.status === st.key);
      return {
        stage: st.label,
        count: stageLeads.length,
        value: stageLeads.reduce((s: number, l: any) => s + (l.value ?? 0), 0),
        color: st.color,
      };
    });
  }, [leads, stages]);

  // Lead conversion funnel (use ordered stage progression)
  const funnelData = useMemo(() => {
    const order = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
    return order
      .map((k) => {
        const st = stages.find((s) => s.key === k);
        const stageLeads = leads.filter((l: any) => l.status === k);
        return st ? { name: st.label, value: stageLeads.length || 0.001, fill: st.color } : null;
      })
      .filter(Boolean) as { name: string; value: number; fill: string }[];
  }, [leads, stages]);

  // Attendance breakdown: last N days per status
  const attendanceTrend = useMemo(() => {
    const days: { date: string; label: string; present: number; late: number; absent: number }[] =
      [];
    const totalEmployees = filteredEmployees.length || employees.length;
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const todays = attendance.filter(
        (r: any) =>
          r.date === iso && (filteredEmpNames.size === 0 || filteredEmpNames.has(r.owner)),
      );
      const present = todays.filter((r: any) => r.checkIn && r.checkIn <= "08:15").length;
      const late = todays.filter((r: any) => r.checkIn && r.checkIn > "08:15").length;
      const checkedIn = todays.filter((r: any) => r.checkIn).length;
      const absent = Math.max(0, totalEmployees - checkedIn);
      days.push({
        date: iso,
        label: d.toLocaleDateString(ar ? "ar-EG" : "en-US", { month: "short", day: "numeric" }),
        present,
        late,
        absent,
      });
    }
    return days;
  }, [attendance, filteredEmpNames, filteredEmployees.length, employees.length, rangeDays, ar]);

  // Per-employee attendance summary in range
  const perEmpAttendance = useMemo(() => {
    return filteredEmployees.map((e: any) => {
      const recs = attendance.filter((r: any) => r.owner === e.name && r.date >= rangeStart);
      const present = recs.filter((r: any) => r.checkIn && r.checkIn <= "08:15").length;
      const late = recs.filter((r: any) => r.checkIn && r.checkIn > "08:15").length;
      return { name: e.name.split(" ")[0], present, late, total: recs.length };
    });
  }, [filteredEmployees, attendance, rangeStart]);

  return (
    <div className="mb-6 space-y-4 print:hidden">
      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4 text-primary" />
            {ar ? "تصفية" : "Filters"}
          </div>
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
          >
            <option value={7}>{ar ? "آخر 7 أيام" : "Last 7 days"}</option>
            <option value={30}>{ar ? "آخر 30 يوماً" : "Last 30 days"}</option>
            <option value={90}>{ar ? "آخر 90 يوماً" : "Last 90 days"}</option>
          </select>
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setEmployeeFilter("all");
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
          >
            <option value="all">{ar ? "كل الأقسام" : "All departments"}</option>
            {departmentsList.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
          >
            <option value="all">{ar ? "كل الموظفين" : "All employees"}</option>
            {employees
              .filter((e: any) => deptFilter === "all" || e.department === deptFilter)
              .map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Pipeline trends + funnel */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-4 font-display text-base font-bold text-foreground">
            {ar ? "اتجاه خط البيع" : "Pipeline Trends"}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={pipelineTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="left"
                dataKey="count"
                name={ar ? "العدد" : "Count"}
                radius={[4, 4, 0, 0]}
              >
                {pipelineTrend.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="value"
                name={ar ? "القيمة" : "Value"}
                stroke="#6366f1"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-4 font-display text-base font-bold text-foreground">
            {ar ? "قمع تحويل العملاء" : "Lead Conversion Funnel"}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList
                  position="right"
                  fill="hsl(var(--foreground))"
                  stroke="none"
                  dataKey="name"
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-4 font-display text-base font-bold text-foreground">
            {ar ? `الحضور خلال ${rangeDays} يوماً` : `Attendance · last ${rangeDays} days`}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" stackId="a" fill="#10b981" name={ar ? "حاضر" : "Present"} />
              <Bar dataKey="late" stackId="a" fill="#f59e0b" name={ar ? "متأخر" : "Late"} />
              <Bar dataKey="absent" stackId="a" fill="#ef4444" name={ar ? "غائب" : "Absent"} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-4 font-display text-base font-bold text-foreground">
            {ar ? "الحضور لكل موظف" : "Attendance by Employee"}
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perEmpAttendance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="present" stackId="b" fill="#10b981" name={ar ? "حاضر" : "Present"} />
              <Bar dataKey="late" stackId="b" fill="#f59e0b" name={ar ? "متأخر" : "Late"} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
