import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { shortId, formatDate } from "@/lib/utils";
import { CopyIdButton } from "@/components/shared/CopyIdButton";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { RealChat } from "@/components/chat/RealChat";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState } from "@/lib/store";
import {
  ArrowLeft,
  History as HistoryIcon,
  Activity as ActivityIcon,
  Clock4,
  Timer,
  CalendarDays,
  Users2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MessageCircle,
  ShieldCheck,
  ShieldOff,
  FolderGit2,
  Download,
  User,
  AlertTriangle,
  Workflow,
  Search,
} from "lucide-react";
import { ExcelImportModal } from "@/components/ExcelImportModal";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { AdminReviewTab } from "@/components/admin/AdminReviewTab";
import { useEffect, useMemo, useState, Fragment } from "react";
import { TargetCountdown, TargetRefreshIndicator } from "@/components/TargetCountdown";
import {
  computeTargetPeriod,
  fmtCairoDate,
  sumWonInPeriod,
  getKpiPeriodDates,
} from "@/lib/targetPeriod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAssignedToEmployee } from "@/lib/activityFilters";
import { isLeadRelatedToEmployee } from "@/lib/employeeTargets";
import { filterMyProjects } from "@/lib/employeeProjects";
import { useAuth } from "@/lib/auth";
import {
  cairoIsoDate,
  cairoWeekday,
  cairoYearMonth,
  isEgyptWeekend,
  cairoMonthDates,
  lastNCairoDates,
  CAIRO_TZ,
} from "@/lib/cairoTime";
import { EmployeeTargetsCard } from "@/components/EmployeeTargetsCard";

const ACTIVE_KEY = "int-crm:emp-active";
function loadActive(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveActive(map: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(map));
}

export const Route = createFileRoute("/admin/employees/$employeeId")({
  component: EmployeeDetailsPage,
  head: ({ params }) => ({ meta: [{ title: `${params.employeeId} · INT-CRM` }] }),
});

function fmtTime(iso: string) {
  const d = new Date(iso);
  // Stable, locale-independent format to avoid SSR/client hydration mismatch
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EmployeeDetailsPage() {
  const { employeeId } = Route.useParams();
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    activities,
    history,
    employees,
    leads: storeLeads,
    attendance: storeAttendance,
    settings,
    projects,
  } = useStoreState();
  const workdayHours = settings.workdayHours ?? 8;
  const emp = employees.find((e) => e.id === employeeId);
  const { profile: authProfile } = useAuth();
  const meName = authProfile?.full_name_en || authProfile?.full_name_ar || "Admin";
  const mePhoto = authProfile?.avatar_url || undefined;
  const meInitials =
    meName
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "AD";
  const user = { name: meName, role: t("admin"), initials: meInitials, photo: mePhoto };
  const [tab, setTab] = useState<
    | "overview"
    | "admin_review"
    | "attendance"
    | "leads"
    | "activities"
    | "chat"
    | "accounts"
    | "pipeline"
  >("overview");
  const [page, setPage] = useState(1);
  const [overviewActivitiesPage, setOverviewActivitiesPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [showImport, setShowImport] = useState<"leads" | "activities" | "accounts" | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [filterNoActivities, setFilterNoActivities] = useState(false);
  const [filterNoLeads, setFilterNoLeads] = useState(false);
  const [filterClosingThisMonth, setFilterClosingThisMonth] = useState(false);
  const [filterNext7Days, setFilterNext7Days] = useState(false);
  const [filterNext15Days, setFilterNext15Days] = useState(false);
  const [activitiesDateFilter, setActivitiesDateFilter] = useState("");
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setActiveMap(loadActive());
  }, []);
  const isActive = activeMap[employeeId] !== false; // default true
  const toggleActive = () => {
    const next = { ...activeMap, [employeeId]: !isActive };
    setActiveMap(next);
    saveActive(next);
  };

  const empIdentity = emp
    ? { profileId: emp.id, userId: (emp as any).userId, name: emp.name }
    : { profileId: undefined, userId: undefined, name: undefined };
  const empActivities = emp
    ? activities.filter((a) => isAssignedToEmployee(a as any, empIdentity))
    : [];
  const empHistory = emp
    ? history.filter((h) => h.actor === emp.name || h.target === emp.name)
    : [];
  const empLeads = emp
    ? storeLeads.filter((l: any) => isLeadRelatedToEmployee(l, empIdentity))
    : [];
  const empProjects = emp ? filterMyProjects(projects as any, empIdentity as any) : [];

  const todayDateObj = new Date();
  const todayStr = todayDateObj.toISOString().slice(0, 10);
  const thisMonthStr = todayStr.slice(0, 7);
  const in7DaysStr = new Date(todayDateObj.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const in15DaysStr = new Date(todayDateObj.getTime() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const timeFilteredLeads = empLeads.filter((l: any) => {
    if (!filterClosingThisMonth && !filterNext7Days && !filterNext15Days) return true;
    let match = false;
    if (
      filterClosingThisMonth &&
      l.expectedCloseDate &&
      l.expectedCloseDate.startsWith(thisMonthStr)
    )
      match = true;
    if (
      filterNext7Days &&
      l.expectedCloseDate &&
      l.expectedCloseDate >= todayStr &&
      l.expectedCloseDate <= in7DaysStr
    )
      match = true;
    if (
      filterNext15Days &&
      l.expectedCloseDate &&
      l.expectedCloseDate >= todayStr &&
      l.expectedCloseDate <= in15DaysStr
    )
      match = true;
    return match;
  });

  const displayedLeads = filterNoActivities
    ? timeFilteredLeads.filter((l) => !activities.some((a) => a.leadId === l.id))
    : timeFilteredLeads;

  const displayedProjects = filterNoLeads
    ? empProjects.filter((p: any) => !storeLeads.some((l: any) => l.projectId === p.id))
    : empProjects;

  const ITEMS_PER_PAGE = 20;
  
  const filteredEmpActivities = empActivities.filter(a => !activitiesDateFilter || a.dueDate === activitiesDateFilter);

  const paginatedActivities = filteredEmpActivities.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
  const paginatedLeads = displayedLeads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const paginatedProjects = displayedProjects.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const overviewActivitiesPaginated = empActivities.slice(
    (overviewActivitiesPage - 1) * 10,
    overviewActivitiesPage * 10,
  );
  const auditPaginated = empHistory.slice((auditPage - 1) * 10, auditPage * 10);

  const renderPagination = (total: number) => {
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between border-t border-border mt-4 pt-4">
        <div className="flex flex-1 items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to{" "}
            <span className="font-medium">{Math.min(page * ITEMS_PER_PAGE, total)}</span> of{" "}
            <span className="font-medium">{total}</span> results
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Real monthly attendance from Supabase, indexed per day for the visible month (Egypt / Africa/Cairo timezone)
  const monthlyAttendance = useMemo(() => {
    const { year: nowY, month0: nowM } = cairoYearMonth();
    const targetMonth0 = nowM + monthOffset;
    const year = nowY + Math.floor(targetMonth0 / 12);
    const month = ((targetMonth0 % 12) + 12) % 12; // 0-indexed
    const todayIso = cairoIsoDate();

    const empName = emp?.name ?? "";
    const empRows = storeAttendance.filter((r) => r.owner === empName);
    const byDate = new Map<string, (typeof empRows)[number]>();
    for (const r of empRows) byDate.set(r.date, r);

    type Row = {
      date: string;
      weekday: string;
      status: "present" | "late" | "absent" | "off" | "upcoming";
      in: string;
      out: string;
      hours: string;
    };
    const rows: Row[] = [];
    for (const iso of cairoMonthDates(year, month)) {
      const d = Number(iso.slice(8, 10));
      const anchor = new Date(Date.UTC(year, month, d, 12, 0, 0));
      const wd = cairoWeekday(anchor);
      const isWeekend = isEgyptWeekend(iso);
      const future = iso > todayIso;
      const rec = byDate.get(iso);
      let status: Row["status"];
      let inT = "—",
        outT = "—",
        hours = "—";
      if (rec) {
        inT = rec.checkIn || "—";
        outT = rec.checkOut || "—";
        hours = rec.hours || "—";
        const [h, m] = (rec.checkIn || "00:00").split(":").map(Number);
        const mins = (h || 0) * 60 + (m || 0);
        status = !rec.checkIn
          ? isWeekend
            ? "off"
            : future
              ? "upcoming"
              : "absent"
          : mins > 8 * 60 + 15
            ? "late"
            : "present";
      } else if (isWeekend) {
        status = "off";
      } else if (future) {
        status = "upcoming";
      } else {
        status = "absent";
      }
      rows.push({ date: iso, weekday: wd, status, in: inT, out: outT, hours });
    }
    const summary = {
      present: rows.filter((r) => r.status === "present").length,
      late: rows.filter((r) => r.status === "late").length,
      absent: rows.filter((r) => r.status === "absent").length,
      working: rows.filter((r) => r.status !== "off" && r.status !== "upcoming").length,
      label: new Date(Date.UTC(year, month, 1, 12)).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: CAIRO_TZ,
      }),
    };
    return { rows, summary };
  }, [emp?.name, storeAttendance, monthOffset]);

  // Daily working hours (last 7 days) — from real attendance records
  const parseHoursStr = (h: string): number => {
    if (!h || h === "—") return 0;
    const hm = h.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
    if (hm) return Number(hm[1]) * 60 + Number(hm[2] || 0);
    const n = parseFloat(h);
    return Number.isFinite(n) ? Math.round(n * 60) : 0;
  };
  const empAttendance = emp ? storeAttendance.filter((r) => r.owner === emp.name) : [];
  const days: { date: string; label: string; mins: number; done: number; count: number }[] = [];
  for (const iso of lastNCairoDates(7)) {
    const [y, m, d] = iso.split("-").map(Number);
    const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const rec = empAttendance.find((r) => r.date === iso);
    const mins = rec ? parseHoursStr(rec.hours) : 0;
    const done = rec && rec.checkOut ? mins : 0;
    days.push({ date: iso, label: cairoWeekday(anchor), mins, done, count: rec ? 1 : 0 });
  }
  const maxMins = Math.max(60, ...days.map((d) => d.mins));
  const todayIso = cairoIsoDate();
  const todayMins = days.find((d) => d.date === todayIso)?.mins ?? 0;
  const weekMins = days.reduce((s, d) => s + d.mins, 0);
  const fmtH = (rawMins: number) => {
    const mins = Math.round(rawMins);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return mins ? (h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`) : "0";
  };

  // KPI Calculations
  const [kpiPeriodOffset, setKpiPeriodOffset] = useState(0);

  const nowLocal = new Date();
  const curYear = nowLocal.getFullYear();
  const curMonth = nowLocal.getMonth();

  const tP = getKpiPeriodDates(
    emp?.kpiTargetPeriod || "monthly",
    curYear,
    curMonth,
    kpiPeriodOffset,
  );
  const acP = getKpiPeriodDates(
    emp?.kpiActivitiesPeriod || "monthly",
    curYear,
    curMonth,
    kpiPeriodOffset,
  );
  const atP = getKpiPeriodDates(
    emp?.kpiAttendancePeriod || "monthly",
    curYear,
    curMonth,
    kpiPeriodOffset,
  );

  const kpiPeriodLabel = tP.label;

  const actsInMonth = empActivities.filter((a) => {
    if (!(a as any).dueDate) return kpiPeriodOffset === 0;
    const d = new Date((a as any).dueDate).getTime();
    return d >= acP.start.getTime() && d <= acP.end.getTime();
  });
  const totalActs = actsInMonth.length;
  const completedActs = actsInMonth.filter((a) => a.status === "done").length;
  const activityScore =
    totalActs > 0
      ? (completedActs / totalActs) * 100
      : kpiPeriodOffset <= 0 && totalActs === 0
        ? 100
        : 0;

  // ---- Real-time target & period-aware achievement (unified with employee panel) ----
  const empUserId = (emp as any)?.userId as string | undefined;
  const targetQuery = useQuery({
    enabled: !!empUserId,
    queryKey: ["admin-emp-target", empUserId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("target_value,target_type,annual_target")
        .eq("user_id", empUserId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const targetType = (targetQuery.data?.target_type ?? (emp as any)?.targetType ?? "yearly") as
    | "yearly"
    | "quarterly"
    | "monthly";
  useEffect(() => {
    if (!empUserId) return;
    const channel = supabase
      .channel(`admin-profile-target-${empUserId}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${empUserId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["admin-emp-target", empUserId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [empUserId, queryClient]);

  const annualTarget = Number(
    (targetQuery.data as any)?.annual_target ??
      targetQuery.data?.target_value ??
      emp?.annualTarget ??
      0,
  );
  const period = useMemo(() => computeTargetPeriod(targetType), [targetType]);
  const {
    periodName,
    psY,
    psM,
    psD,
    peY,
    peM,
    peD,
    periodStartIso,
    periodEndIso,
    deadlineLabel,
    countdownLabel,
  } = period;
  const achievedTarget = useMemo(() => sumWonInPeriod(empLeads as any, period), [empLeads, period]);

  // Period Target Score
  const kpiMonthlyTarget = annualTarget / tP.divisor;
  const kpiMonthlyAchieved = useMemo(
    () =>
      sumWonInPeriod(empLeads as any, {
        periodStartMs: tP.start.getTime(),
        periodEndMs: tP.end.getTime(),
      }),
    [empLeads, tP],
  );

  const achieveRate = kpiMonthlyTarget > 0 ? (kpiMonthlyAchieved / kpiMonthlyTarget) * 100 : 0;
  const targetScore = Math.min(100, achieveRate);

  const periodAchieveRate = annualTarget > 0 ? (achievedTarget / annualTarget) * 100 : 0;

  // Attendance Rate for selected period
  const presentDays = storeAttendance.filter((r) => {
    if (r.owner !== emp?.name) return false;
    const d = new Date(r.date);
    return d >= atP.start && d <= atP.end;
  }).length;

  const targetDay =
    kpiPeriodOffset === 0 &&
    atP.start.getTime() <= nowLocal.getTime() &&
    nowLocal.getTime() <= atP.end.getTime()
      ? nowLocal
      : atP.end;
  let workingDays = 0;
  for (let d = new Date(atP.start); d <= targetDay; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay(); // 0=Sun..6=Sat
    if (wd !== 5 && wd !== 6) workingDays++; // exclude Fri/Sat
  }
  const attendanceRate = workingDays > 0 ? Math.min(100, (presentDays / workingDays) * 100) : 0;

  const tW = emp?.kpiTargetWeight ?? 33.33;
  const acW = emp?.kpiActivitiesWeight ?? 33.33;
  const atW = emp?.kpiAttendanceWeight ?? 33.34;

  const overallKpi = Math.round(
    targetScore * (tW / 100) + activityScore * (acW / 100) + attendanceRate * (atW / 100),
  );

  if (!emp) {
    return (
      <AppShell panel="admin" user={user} pageTitle="Employee">
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Employee <span className="font-mono">{employeeId}</span> not found.
          </p>
          <Link
            to="/admin/employees"
            className="mt-3 inline-block text-sm font-semibold text-primary"
          >
            {t("backToEmployees")}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell panel="admin" user={user} pageTitle={emp.name}>
      <button
        onClick={() => router.history.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> {t("backToEmployees")}
      </button>

      {!isActive && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <ShieldOff className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-bold uppercase tracking-wider text-[11px]">
              {t("accountDeactivated")}
            </div>
            <div className="mt-0.5">{t("cannotLoginWhenDeactivated")}</div>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-5">
          {emp.photo ? (
            <img
              src={emp.photo}
              alt={emp.name}
              loading="lazy"
              className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-primary/30 shadow-[var(--shadow-brand)]"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-600 text-2xl font-bold text-primary-foreground shadow-[var(--shadow-brand)]">
              {emp.avatar}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-extrabold text-foreground">{emp.name}</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {emp.role} · {emp.department}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {shortId(emp.id)}
              <CopyIdButton value={emp.id} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {emp.email && (
                <a
                  href={`mailto:${emp.email}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="font-mono">{emp.email}</span>
                </a>
              )}
              {emp.phone && (
                <a
                  href={`tel:${emp.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span className="font-mono">{emp.phone}</span>
                </a>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}
              >
                {isActive ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <ShieldOff className="h-3.5 w-3.5" />
                )}
                {isActive ? t("accountActive") : t("accountDeactivated")}
              </span>
              <button
                onClick={toggleActive}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${isActive ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
              >
                {isActive ? (
                  <ShieldOff className="h-3.5 w-3.5" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                {isActive ? t("deactivate") : t("activate")}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <Stat
              label={t("leads")}
              value={empLeads.length}
              subtext={
                empLeads.filter((l) => !activities.some((a) => a.leadId === l.id)).length > 0
                  ? `${empLeads.filter((l) => !activities.some((a) => a.leadId === l.id)).length} no activities`
                  : undefined
              }
              subtextTone="text-amber-600"
            />
            <Stat
              label="Accounts"
              value={empProjects.length}
              subtext={
                empProjects.filter((p: any) => !storeLeads.some((l: any) => l.projectId === p.id))
                  .length > 0
                  ? `${empProjects.filter((p: any) => !storeLeads.some((l: any) => l.projectId === p.id)).length} no leads`
                  : undefined
              }
              subtextTone="text-rose-600"
            />
            <Stat label={t("won")} value={emp.won} />
            <Stat
              label={t("performance")}
              value={`${overallKpi}%`}
              tone={
                overallKpi >= 100
                  ? "text-emerald-600"
                  : overallKpi >= 75
                    ? "text-amber-600"
                    : "text-rose-600"
              }
            />
          </div>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full ${overallKpi >= 100 ? "bg-emerald-500" : overallKpi >= 75 ? "bg-amber-500" : "bg-rose-500"}`}
            style={{ width: `${overallKpi}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500/80"></span>
            {t("sales") ?? "Sales"}:{" "}
            <span className="text-foreground">{Math.round(targetScore)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500/80"></span>
            {t("tasks") ?? "Tasks"}:{" "}
            <span className="text-foreground">{Math.round(activityScore)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-500/80"></span>
            {t("attendance") ?? "Attendance"}:{" "}
            <span className="text-foreground">{Math.round(attendanceRate)}%</span>
          </div>
        </div>
      </div>

      <div className="mb-5 inline-flex flex-wrap rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
        {(
          [
            { k: "overview", label: t("overview"), Icon: ActivityIcon },
            { k: "admin_review", label: "Admin Review", Icon: Search },
            { k: "attendance", label: t("attendance"), Icon: CalendarDays },
            { k: "pipeline", label: t("pipeline") ?? "Pipeline", Icon: Workflow },
            { k: "leads", label: `${t("relatedLeads")} (${empLeads.length})`, Icon: Users2 },
            {
              k: "activities",
              label: `${t("activities")} (${empActivities.length})`,
              Icon: ActivityIcon,
            },
            {
              k: "accounts",
              label: `${t("relatedAccounts")} (${empProjects.length})`,
              Icon: FolderGit2,
            },
            { k: "chat", label: t("chat"), Icon: MessageCircle },
          ] as const
        ).map(({ k, label, Icon }) => (
          <button
            key={k}
            onClick={() => {
              setTab(k);
              setPage(1);
            }}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
              tab === k
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "admin_review" && <AdminReviewTab leads={empLeads} activities={empActivities} />}

      {tab === "pipeline" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex flex-wrap items-center gap-4 border-b border-border pb-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              {t("pipeline") ?? "Pipeline"}
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="checkbox"
                  checked={filterClosingThisMonth}
                  onChange={(e) => setFilterClosingThisMonth(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Closing This Month
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="checkbox"
                  checked={filterNext7Days}
                  onChange={(e) => setFilterNext7Days(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Next 7 Days
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="checkbox"
                  checked={filterNext15Days}
                  onChange={(e) => setFilterNext15Days(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Next 15 Days
              </label>
            </div>
          </div>
          <PipelineBoard leads={timeFilteredLeads} role="admin" />
        </div>
      )}

      {tab === "activities" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {t("assignedActivities")}
              </h3>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {filteredEmpActivities.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={activitiesDateFilter}
                onChange={(e) => setActivitiesDateFilter(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              />
              <button
                onClick={() => setShowImport("activities")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5 rotate-180" />
              {t("importExcel")}
            </button>
          </div>
          </div>
          {empActivities.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noActivitiesOwned")}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("type")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Title
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("dueDate")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Time & Est.
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedActivities.map((a) => {
                  const isExpanded = expandedNoteId === a.id;
                  return (
                    <Fragment key={a.id}>
                      <tr
                        onClick={() =>
                          a.notes ? setExpandedNoteId(isExpanded ? null : a.id) : null
                        }
                        className={`transition-colors ${a.notes ? "cursor-pointer hover:bg-primary/5" : "hover:bg-primary/5"}`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {a.notes && (
                              <ChevronRight
                                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              />
                            )}
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                              {a.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-semibold text-foreground">{a.title}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatDate(a.dueDate)}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {a.time}
                          {a.estMinutes ? ` · ${fmtH(a.estMinutes)}` : ""}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              a.status === "done"
                                ? "bg-emerald-50 text-emerald-700"
                                : a.status === "in_progress"
                                  ? "bg-sky-50 text-sky-700"
                                  : a.status === "cancelled"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && a.notes && (
                        <tr className="bg-secondary/20">
                          <td colSpan={5} className="px-3 py-3 border-t border-border/50">
                            <div className="text-sm text-foreground whitespace-pre-wrap pl-6">
                              <span className="font-semibold block mb-1 text-xs text-muted-foreground uppercase tracking-wider">
                                Note
                              </span>
                              {a.notes}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {renderPagination(filteredEmpActivities.length)}
        </div>
      )}

      {tab === "chat" && (
        <RealChat
          peerProfileId={emp.id}
          peerName={emp.name}
          peerPhoto={emp.photo}
          peerInitials={emp.avatar}
          meName={user.name}
          mePhoto={user.photo}
          meInitials={user.initials}
        />
      )}

      {tab === "attendance" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                className="rounded-lg border border-border p-1.5 hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="font-display text-base font-bold text-foreground min-w-[140px] text-center">
                {monthlyAttendance.summary.label}
              </div>
              <button
                onClick={() => setMonthOffset((m) => m + 1)}
                className="rounded-lg border border-border p-1.5 hover:bg-accent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {monthOffset !== 0 && (
                <button
                  onClick={() => setMonthOffset(0)}
                  className="ml-2 text-xs font-semibold text-primary hover:underline"
                >
                  {t("thisMonthShort")}
                </button>
              )}
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-600">
                <b>{monthlyAttendance.summary.present}</b> present
              </span>
              <span className="text-amber-600">
                <b>{monthlyAttendance.summary.late}</b> late
              </span>
              <span className="text-rose-600">
                <b>{monthlyAttendance.summary.absent}</b> absent
              </span>
              <span className="text-muted-foreground">
                / {monthlyAttendance.summary.working} {t("workingDays")}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("monthAttDate")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("monthAttDay")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("checkIn")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("checkOut")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("hours")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {monthlyAttendance.rows.map((r) => (
                  <tr key={formatDate(r.date)} className="hover:bg-primary/5">
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {formatDate(r.date)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.weekday}</td>
                    <td className="px-3 py-2 font-mono text-foreground">{r.in}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{r.out}</td>
                    <td className="px-3 py-2 font-mono text-foreground">{r.hours}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          r.status === "present"
                            ? "bg-emerald-50 text-emerald-700"
                            : r.status === "late"
                              ? "bg-amber-50 text-amber-700"
                              : r.status === "absent"
                                ? "bg-rose-50 text-rose-700"
                                : r.status === "off"
                                  ? "bg-secondary text-muted-foreground"
                                  : "bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "leads" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {t("relatedLeads")}
              </h3>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {displayedLeads.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="checkbox"
                  checked={filterClosingThisMonth}
                  onChange={(e) => {
                    setFilterClosingThisMonth(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Closing This Month
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="checkbox"
                  checked={filterNext7Days}
                  onChange={(e) => {
                    setFilterNext7Days(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Next 7 Days
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="checkbox"
                  checked={filterNext15Days}
                  onChange={(e) => {
                    setFilterNext15Days(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Next 15 Days
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="checkbox"
                  checked={filterNoActivities}
                  onChange={(e) => {
                    setFilterNoActivities(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                No Activities
              </label>
              <button
                onClick={() => setShowImport("leads")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
              >
                <Download className="h-3.5 w-3.5 rotate-180" />
                {t("importExcel")}
              </button>
            </div>
          </div>
          {empLeads.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noLeadsAssigned")}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    ID
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("company")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("contact")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Close Date
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("status")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("value")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedLeads.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() =>
                      router.navigate({ to: "/admin/leads/$leadId", params: { leadId: l.id } })
                    }
                    className="hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground w-20">
                      {shortId(l.id)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-foreground">{l.company}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {l.contact} <span className="text-[10px] opacity-70">· {l.city}</span>
                      {!activities.some((a) => a.leadId === l.id) && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                          <AlertTriangle className="h-3 w-3" /> No Activities
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {formatDate(l.expectedCloseDate)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={l.status} label={t(l.status as any)} />
                      <div className="mt-1 text-[10px] text-muted-foreground">{l.updatedAt}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-sm font-bold text-foreground">
                      {fmtMoney(l.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination(displayedLeads.length)}
        </div>
      )}

      {tab === "accounts" && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {t("relatedAccounts")}
              </h3>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {displayedProjects.length}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <input
                  type="checkbox"
                  checked={filterNoLeads}
                  onChange={(e) => {
                    setFilterNoLeads(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                No Leads
              </label>
            </div>
          </div>
          {empProjects.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noAccountsAssigned")}</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    ID
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("client")}
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contact & Owner
                  </th>
                  <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("budget")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedProjects.map((p: any) => (
                  <tr
                    key={p.id}
                    onClick={() =>
                      router.navigate({
                        to: "/admin/projects/$projectId",
                        params: { projectId: p.id },
                      })
                    }
                    className="hover:bg-primary/5 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {shortId(p.id)}
                    </td>
                    <td className="px-3 py-2 font-semibold text-foreground">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.client}</td>
                    <td className="px-3 py-2 text-[11px] space-y-0.5">
                      {p.clientPhone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span className="font-mono text-foreground">{p.clientPhone}</span>
                        </div>
                      )}
                      {p.clientEmail && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="font-mono text-foreground">{p.clientEmail}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span className="font-medium text-foreground">
                          {p.createdByName || "Unknown"}
                        </span>
                      </div>
                      {!storeLeads.some((l: any) => l.projectId === p.id) && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 w-fit">
                          <AlertTriangle className="h-3 w-3" /> No Leads
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-sm font-bold text-foreground">
                      {fmtMoney(p.budget)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination(displayedProjects.length)}
        </div>
      )}

      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Target Countdown with traffic-light logic — unified with employee panel */}
          <div className="lg:col-span-2">
            <TargetCountdown
              achieved={achievedTarget}
              target={annualTarget}
              periodStart={periodStartIso}
              deadline={periodEndIso}
              deadlineLabel={deadlineLabel}
              label={`${emp.name} · ${countdownLabel}`}
              isRefreshing={targetQuery.isFetching}
              lastUpdatedAt={targetQuery.dataUpdatedAt}
            />
          </div>

          {/* Employment & Targets (start date, annual, quarterly, weekly meetings) */}
          <div className="lg:col-span-2">
            <EmployeeTargetsCard
              userId={(emp as any)?.userId}
              profileId={emp.id}
              leads={empLeads as any}
              activities={empActivities as any}
              canEdit
            />
          </div>

          {/* Target & KPI Monitoring */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <h3 className="font-display text-base font-bold text-foreground">
                {t("targetKpiMonitoring")}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setKpiPeriodOffset((m) => m - 1)}
                  className="rounded-lg border border-border p-1.5 hover:bg-accent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="font-display text-sm font-bold text-foreground min-w-[120px] text-center">
                  {kpiPeriodLabel}
                </div>
                <button
                  onClick={() => setKpiPeriodOffset((m) => m + 1)}
                  className="rounded-lg border border-border p-1.5 hover:bg-accent"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {kpiPeriodOffset !== 0 && (
                  <button
                    onClick={() => setKpiPeriodOffset(0)}
                    className="ml-2 text-xs font-semibold text-primary hover:underline"
                  >
                    Current
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Target Card */}
              <div className="rounded-lg bg-secondary/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {periodName}ly Sales Target
                  </div>
                  <TargetRefreshIndicator
                    isRefreshing={targetQuery.isFetching}
                    lastUpdatedAt={targetQuery.dataUpdatedAt}
                  />
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {fmtCairoDate(psY, psM, psD)} → {fmtCairoDate(peY, peM, peD)}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{periodName} Target:</span>
                    <span className="font-bold text-foreground">{fmtMoney(annualTarget)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Achieved ({periodName.toLowerCase()}):
                    </span>
                    <span className="font-bold text-foreground">{fmtMoney(achievedTarget)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="font-bold text-foreground">
                      {fmtMoney(Math.max(0, annualTarget - achievedTarget))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("achievementRate")}:</span>
                    <span
                      className={`font-bold ${
                        periodAchieveRate >= 100
                          ? "text-emerald-600"
                          : periodAchieveRate >= 75
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      {periodAchieveRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Achievement Bar */}
                <div className="mt-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full ${
                        periodAchieveRate >= 100
                          ? "bg-emerald-500"
                          : periodAchieveRate >= 75
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${Math.min(100, periodAchieveRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* KPI Weightage & Breakdown */}
              <div className="rounded-lg bg-secondary/30 p-4 col-span-1 md:col-span-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t("overallPerfIndex")}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Overall KPI Gauge */}
                  <div
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4"
                    style={{
                      borderColor:
                        overallKpi >= 100 ? "#10b981" : overallKpi >= 75 ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    <div className="text-center">
                      <div className="font-mono text-2xl font-bold text-foreground">
                        {overallKpi}%
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase">
                        {t("scoreLabel")}
                      </div>
                    </div>
                  </div>
                  {/* Score Breakdown List */}
                  <div className="flex-1 w-full space-y-2.5">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-muted-foreground">
                          Target Achievement KPI (Weight: {tW}%)
                        </span>
                        <span className="text-foreground">
                          {Math.min(100, achieveRate).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, achieveRate)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-muted-foreground">
                          Activity Performance (Weight: {acW}%)
                        </span>
                        <span className="text-foreground">{activityScore.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary">
                        <div className="h-full bg-sky-500" style={{ width: `${activityScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-muted-foreground">
                          Attendance Rate (Weight: {atW}%)
                        </span>
                        <span className="text-foreground">{attendanceRate.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${attendanceRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock4 className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                  {t("dailyWorkingHours")}
                </h3>
                <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Workday {workdayHours}h
                </span>
              </div>
              <div className="flex gap-5 text-end">
                <div>
                  <div className="font-mono text-lg font-bold text-foreground">
                    {fmtH(todayMins)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("today")}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-primary">{fmtH(weekMins)}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t("last7days")}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-end gap-2 sm:gap-3">
              {days.map((d) => {
                const STANDARD_MINS = workdayHours * 60;
                const pct = Math.min(100, Math.round((d.mins / STANDARD_MINS) * 100));
                const donePct = Math.min(100, Math.round((d.done / STANDARD_MINS) * 100));
                const h = d.mins > 0 ? Math.max(6, Math.round((pct / 100) * 120)) : 0;
                const doneH = Math.round((donePct / 100) * 120);
                return (
                  <div
                    key={formatDate(d.date)}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <div className="text-[10px] font-semibold text-muted-foreground">
                      {fmtH(d.mins)}
                    </div>
                    <div
                      className={`text-[10px] font-bold ${pct >= 100 ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {pct}%
                    </div>
                    <div
                      className="relative w-full max-w-[40px] overflow-hidden rounded-md bg-secondary"
                      style={{ height: 120 }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 border-t border-dashed border-primary/40"
                        style={{ bottom: 120 }}
                      />
                      <div
                        className="absolute bottom-0 w-full bg-primary/30"
                        style={{ height: `${h}px` }}
                      />
                      <div
                        className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-orange-500"
                        style={{ height: `${doneH}px` }}
                      />
                    </div>
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wider ${d.date === todayIso ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> Checked out
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary/30" /> In progress
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {t("assignedActivities")}
              </h3>
            </div>
            {empActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noActivitiesOwned")}</p>
            )}
            <div className="space-y-2">
              {overviewActivitiesPaginated.map((a) => {
                const isExpanded = expandedNoteId === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => (a.notes ? setExpandedNoteId(isExpanded ? null : a.id) : null)}
                    className={`flex flex-col rounded-lg border border-border p-3 transition-colors ${a.notes ? "cursor-pointer hover:bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {a.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-foreground">{a.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(a.dueDate)} {a.time}
                          {a.estMinutes ? ` · ${fmtH(a.estMinutes)}` : ""}
                        </div>
                      </div>
                      {a.estMinutes != null && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/20">
                          <Timer className="h-3 w-3" /> {fmtH(a.estMinutes)}
                        </span>
                      )}
                      <span className="text-xs font-semibold capitalize text-muted-foreground">
                        {a.status.replace("_", " ")}
                      </span>
                      {a.notes && (
                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        />
                      )}
                    </div>
                    {isExpanded && a.notes && (
                      <div className="mt-3 rounded-md bg-secondary/50 p-3 text-sm text-foreground border border-border/50">
                        {a.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {empActivities.length > 10 && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">
                  Showing {(overviewActivitiesPage - 1) * 10 + 1} to{" "}
                  {Math.min(overviewActivitiesPage * 10, empActivities.length)} of{" "}
                  {empActivities.length}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={overviewActivitiesPage === 1}
                    onClick={() => setOverviewActivitiesPage(overviewActivitiesPage - 1)}
                    className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={overviewActivitiesPage * 10 >= empActivities.length}
                    onClick={() => setOverviewActivitiesPage(overviewActivitiesPage + 1)}
                    className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center gap-2">
              <HistoryIcon className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {t("auditTrail")}
              </h3>
            </div>
            <ol className="relative ms-3 border-s border-border ps-5">
              {empHistory.length === 0 && (
                <li className="text-sm text-muted-foreground">{t("noHistoryYet")}</li>
              )}
              {auditPaginated.map((h) => (
                <li key={h.id} className="relative pb-5 last:pb-0">
                  <span className="absolute -start-[27px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                  <div className="text-xs text-muted-foreground">{fmtTime(h.ts)}</div>
                  <div className="text-sm font-semibold text-foreground">
                    {h.action} —{" "}
                    <span className="text-muted-foreground font-normal">{h.target}</span>
                  </div>
                  {h.details && <div className="text-xs text-muted-foreground">{h.details}</div>}
                </li>
              ))}
            </ol>
            {empHistory.length > 10 && (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">
                  Showing {(auditPage - 1) * 10 + 1} to{" "}
                  {Math.min(auditPage * 10, empHistory.length)} of {empHistory.length}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={auditPage === 1}
                    onClick={() => setAuditPage(auditPage - 1)}
                    className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={auditPage * 10 >= empHistory.length}
                    onClick={() => setAuditPage(auditPage + 1)}
                    className="inline-flex items-center rounded-md border border-border bg-card px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showImport && (
        <ExcelImportModal
          type={showImport}
          ownerOverride={emp.name}
          ownerOverrideProfileId={emp.id}
          onClose={() => setShowImport(null)}
        />
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone = "text-foreground",
  subtext,
  subtextTone,
}: {
  label: string;
  value: any;
  tone?: string;
  subtext?: React.ReactNode;
  subtextTone?: string;
}) {
  return (
    <div>
      <div className={`font-mono text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {subtext && (
        <div className={`mt-1 text-[10px] font-bold ${subtextTone || "text-muted-foreground"}`}>
          {subtext}
        </div>
      )}
    </div>
  );
}
