import React, { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { isAssignedToEmployee, isRelatedToEmployee } from "@/lib/activityFilters";
import {
  Users,
  UserX,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  Mail,
  Eye,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  ShieldAlert,
  Flame,
  Activity as ActivityIcon,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/inactive-staff")({
  component: InactiveStaffPage,
  head: () => ({ meta: [{ title: "Inactive Staff · INT-CRM" }] }),
});

type InactiveFilterType = "all" | "today" | "yesterday" | "working_5_days" | "active";

function getTodayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Returns the date strings (YYYY-MM-DD) for the last 5 working days (Sun-Thu default, skipping Fri & Sat).
 */
function getLast5WorkingDays(): string[] {
  const dates: string[] = [];
  const curr = new Date();
  let daysChecked = 0;
  while (dates.length < 5 && daysChecked < 30) {
    const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    const isWorkingDay = dayOfWeek !== 5 && dayOfWeek !== 6;
    if (isWorkingDay) {
      const pad = (n: number) => String(n).padStart(2, "0");
      dates.push(`${curr.getFullYear()}-${pad(curr.getMonth() + 1)}-${pad(curr.getDate())}`);
    }
    curr.setDate(curr.getDate() - 1);
    daysChecked++;
  }
  return dates;
}

function wrapWords(text: string, wordsPerLine = 5): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }
  return lines;
}

const DEPT_COLORS: Record<string, string> = {
  Sales: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800",
  Technical: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  Operations: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  HR: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  Projects: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
};

export function InactiveStaffPage() {
  const { t, lang, dir } = useI18n();
  const isAr = lang === "ar";
  const { activities, employees, users } = useStoreState();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<InactiveFilterType>("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "activities_asc" | "last_activity">("activities_asc");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const todayStr = useMemo(() => getTodayStr(), []);
  const yesterdayStr = useMemo(() => getYesterdayStr(), []);
  const workingDays5 = useMemo(() => getLast5WorkingDays(), []);

  // Filter staff: active profiles excluding admin and presales roles
  const staffList = useMemo(() => {
    return employees.filter((e) => {
      const u = users.find((user) => user.profileId === e.id || user.id === (e as any).userId);
      if (u?.active === false || (u as any)?.status === "inactive") return false;

      // Exclude admin and presales roles
      if (u?.role === "admin" || u?.role === "presales") return false;
      if (
        Array.isArray((u as any)?.roles) &&
        ((u as any).roles.includes("admin") || (u as any).roles.includes("presales"))
      ) {
        return false;
      }
      const roleStr = (e.role || "").toLowerCase();
      const deptStr = (e.department || "").toLowerCase();
      if (
        roleStr === "admin" ||
        roleStr === "presales" ||
        roleStr.includes("presales") ||
        roleStr.includes("administrator")
      ) {
        return false;
      }
      if (deptStr === "presales") {
        return false;
      }

      return true;
    });
  }, [employees, users]);

  // Compute activity stats for each employee
  const staffWithStats = useMemo(() => {
    return staffList.map((emp) => {
      const empIdentity = { profileId: emp.id, userId: (emp as any).userId, name: emp.name };
      
      const empActs = activities.filter((a) => isRelatedToEmployee(a as any, empIdentity));

      // Today's activities
      const todayActs = empActs.filter((a) => {
        const d = a.dueDate || a.createdAt?.slice(0, 10);
        return d === todayStr;
      });

      // Yesterday's activities
      const yesterdayActs = empActs.filter((a) => {
        const d = a.dueDate || a.createdAt?.slice(0, 10);
        return d === yesterdayStr;
      });

      // Last 5 working days activities
      const working5DaysActs = empActs.filter((a) => {
        const d = a.dueDate || a.createdAt?.slice(0, 10);
        return d ? workingDays5.includes(d) : false;
      });

      // Sort all activities by date descending to find the last activity
      const sortedActs = [...empActs].sort((a, b) => {
        const da = a.dueDate || a.createdAt || "";
        const db = b.dueDate || b.createdAt || "";
        return db.localeCompare(da);
      });

      const lastActivity = sortedActs[0] || null;

      const noActivityToday = todayActs.length === 0;
      const noActivityYesterday = yesterdayActs.length === 0;
      const noActivity5WorkingDays = working5DaysActs.length === 0;

      // Inactivity score/level
      const isCompletelyInactive = noActivityToday && noActivityYesterday && noActivity5WorkingDays;

      return {
        ...emp,
        empIdentity,
        totalActivities: empActs.length,
        todayCount: todayActs.length,
        yesterdayCount: yesterdayActs.length,
        working5DaysCount: working5DaysActs.length,
        noActivityToday,
        noActivityYesterday,
        noActivity5WorkingDays,
        isCompletelyInactive,
        lastActivity,
        lastActivityDate: lastActivity?.dueDate || lastActivity?.createdAt?.slice(0, 10) || null,
      };
    });
  }, [staffList, activities, todayStr, yesterdayStr, workingDays5]);

  // High-level counts
  const metrics = useMemo(() => {
    const totalStaff = staffWithStats.length;
    const inactiveToday = staffWithStats.filter((s) => s.noActivityToday).length;
    const inactiveYesterday = staffWithStats.filter((s) => s.noActivityYesterday).length;
    const inactive5WorkingDays = staffWithStats.filter((s) => s.noActivity5WorkingDays).length;
    const activeStaff = staffWithStats.filter((s) => !s.noActivityToday || !s.noActivityYesterday).length;

    return {
      totalStaff,
      inactiveToday,
      inactiveYesterday,
      inactive5WorkingDays,
      activeStaff,
    };
  }, [staffWithStats]);

  // Departments list for filter
  const departments = useMemo(() => {
    const s = new Set<string>();
    staffList.forEach((e) => {
      if (e.department && e.department !== "—") s.add(e.department);
    });
    return Array.from(s).sort();
  }, [staffList]);

  // Filtered & Sorted employees
  const filteredStaff = useMemo(() => {
    return staffWithStats
      .filter((emp) => {
        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = emp.name.toLowerCase().includes(q);
          const matchEmail = (emp.email || "").toLowerCase().includes(q);
          const matchRole = (emp.role || "").toLowerCase().includes(q);
          const matchDept = (emp.department || "").toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchRole && !matchDept) return false;
        }

        // Department filter
        if (deptFilter !== "all" && emp.department !== deptFilter) {
          return false;
        }

        // Inactivity period filter
        if (filterType === "today") {
          return emp.noActivityToday;
        }
        if (filterType === "yesterday") {
          return emp.noActivityYesterday;
        }
        if (filterType === "working_5_days") {
          return emp.noActivity5WorkingDays;
        }
        if (filterType === "active") {
          return !emp.noActivityToday || !emp.noActivityYesterday;
        }

        // "all" shows all staff (or you can toggle)
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "activities_asc") {
          return a.working5DaysCount - b.working5DaysCount || a.todayCount - b.todayCount;
        }
        if (sortBy === "last_activity") {
          const da = a.lastActivityDate || "0000-00-00";
          const db = b.lastActivityDate || "0000-00-00";
          return da.localeCompare(db);
        }
        return 0;
      });
  }, [staffWithStats, search, deptFilter, filterType, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
  const paginatedStaff = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStaff.slice(start, start + pageSize);
  }, [filteredStaff, page, pageSize]);

  // Excel export
  const handleExportExcel = () => {
    const rows = filteredStaff.map((s, idx) => ({
      "#": idx + 1,
      Name: s.name,
      Email: s.email || "—",
      Phone: s.phone || "—",
      Department: s.department || "—",
      Role: s.role || "—",
      "Activities Today": s.todayCount,
      "Activities Yesterday": s.yesterdayCount,
      "Activities Last 5 Working Days": s.working5DaysCount,
      "Total Recorded Activities": s.totalActivities,
      "Last Activity Date": s.lastActivityDate || "No activities recorded",
      "Inactive Today?": s.noActivityToday ? "Yes" : "No",
      "Inactive Yesterday?": s.noActivityYesterday ? "Yes" : "No",
      "Inactive 5 Working Days?": s.noActivity5WorkingDays ? "Yes" : "No",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inactive Staff Report");
    XLSX.writeFile(wb, `inactive-staff-report-${todayStr}.xlsx`);
    toast.success(isAr ? "تم تصدير تقرير الموظفين بنجاح" : "Staff report exported successfully");
  };

  const handleSendReminder = (empName: string) => {
    toast.info(
      isAr
        ? `تم إرسال تذكير تسجيل الأنشطة إلى ${empName}`
        : `Activity logging reminder sent to ${empName}`,
    );
  };

  return (
    <AppShell
      panel="admin"
      pageTitle={isAr ? "الموظفون غير النشطين" : "Inactive Staff"}
      user={{ name: "Admin", role: "Admin", initials: "AD" }}
    >
      <div className="space-y-6 pb-12">
        {/* Header section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {isAr ? "مراقبة نشاط الموظفين" : "Inactive Staff Monitoring"}
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {isAr
                    ? "متابعة الموظفين الذين ليس لديهم أنشطة مسجلة اليوم، أمس، أو خلال آخر 5 أيام عمل"
                    : "Track employees with no activities recorded today, yesterday, or during the last 5 working days"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPage(1);
                toast.success(isAr ? "تم تحديث البيانات" : "Data refreshed");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isAr ? "تحديث" : "Refresh"}</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-brand)] transition-opacity hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isAr ? "تصدير إلى Excel" : "Export Excel"}</span>
            </button>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card: Inactive Today */}
          <button
            type="button"
            onClick={() => {
              setFilterType("today");
              setPage(1);
            }}
            className={`flex flex-col rounded-2xl border p-4 text-left transition-all ${
              filterType === "today"
                ? "border-rose-500 bg-rose-50/50 shadow-md ring-2 ring-rose-500/20 dark:bg-rose-950/20"
                : "border-border bg-card hover:border-border/80 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isAr ? "بدون نشاط اليوم" : "No Activity Today"}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                <Clock className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold text-foreground">
                {metrics.inactiveToday}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                / {metrics.totalStaff} {isAr ? "موظف" : "staff"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
              {metrics.totalStaff > 0
                ? `${Math.round((metrics.inactiveToday / metrics.totalStaff) * 100)}% ${
                    isAr ? "من إجمالي الفريق" : "of team"
                  }`
                : "—"}
            </div>
          </button>

          {/* Card: Inactive Yesterday */}
          <button
            type="button"
            onClick={() => {
              setFilterType("yesterday");
              setPage(1);
            }}
            className={`flex flex-col rounded-2xl border p-4 text-left transition-all ${
              filterType === "yesterday"
                ? "border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-500/20 dark:bg-amber-950/20"
                : "border-border bg-card hover:border-border/80 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isAr ? "بدون نشاط أمس" : "No Activity Yesterday"}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold text-foreground">
                {metrics.inactiveYesterday}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                / {metrics.totalStaff} {isAr ? "موظف" : "staff"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
              {metrics.totalStaff > 0
                ? `${Math.round((metrics.inactiveYesterday / metrics.totalStaff) * 100)}% ${
                    isAr ? "من إجمالي الفريق" : "of team"
                  }`
                : "—"}
            </div>
          </button>

          {/* Card: Inactive 5 Working Days */}
          <button
            type="button"
            onClick={() => {
              setFilterType("working_5_days");
              setPage(1);
            }}
            className={`flex flex-col rounded-2xl border p-4 text-left transition-all ${
              filterType === "working_5_days"
                ? "border-red-600 bg-red-50/50 shadow-md ring-2 ring-red-600/20 dark:bg-red-950/20"
                : "border-border bg-card hover:border-border/80 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isAr ? "بدون نشاط (5 أيام عمل)" : "No Activity (5 Working Days)"}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                <ShieldAlert className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold text-foreground">
                {metrics.inactive5WorkingDays}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                / {metrics.totalStaff} {isAr ? "موظف" : "staff"}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
              {metrics.totalStaff > 0
                ? `${Math.round((metrics.inactive5WorkingDays / metrics.totalStaff) * 100)}% ${
                    isAr ? "خمول كامل 5 أيام" : "completely inactive"
                  }`
                : "—"}
            </div>
          </button>

          {/* Card: Total Monitored */}
          <button
            type="button"
            onClick={() => {
              setFilterType("all");
              setPage(1);
            }}
            className={`flex flex-col rounded-2xl border p-4 text-left transition-all ${
              filterType === "all"
                ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
                : "border-border bg-card hover:border-border/80 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isAr ? "إجمالي الموظفين الخاضعين للمتابعة" : "Total Monitored Staff"}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold text-foreground">
                {metrics.totalStaff}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                {isAr ? "موظف نشط بالنظام" : "active staff"}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              {metrics.activeStaff} {isAr ? "موظف لديهم أنشطة مسجلة" : "logged recent activities"}
            </div>
          </button>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => {
                setFilterType("all");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {isAr ? "جميع الموظفين" : "All Staff"} ({metrics.totalStaff})
            </button>
            <button
              onClick={() => {
                setFilterType("today");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === "today"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {isAr ? "بدون نشاط اليوم" : "No Activity Today"} ({metrics.inactiveToday})
            </button>
            <button
              onClick={() => {
                setFilterType("yesterday");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === "yesterday"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {isAr ? "بدون نشاط أمس" : "No Activity Yesterday"} ({metrics.inactiveYesterday})
            </button>
            <button
              onClick={() => {
                setFilterType("working_5_days");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === "working_5_days"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {isAr ? "بدون نشاط (5 أيام عمل)" : "No Activity (5 Working Days)"} ({metrics.inactive5WorkingDays})
            </button>
            <button
              onClick={() => {
                setFilterType("active");
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterType === "active"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {isAr ? "الموظفون النشطون" : "Active Staff"} ({metrics.activeStaff})
            </button>
          </div>

          {/* Search and Secondary Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={isAr ? "بحث بالاسم أو الدور أو القسم..." : "Search staff, role, dept..."}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Department Select */}
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">{isAr ? "كافة الأقسام" : "All Departments"}</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            >
              <option value="activities_asc">{isAr ? "الأقل نشاطاً أولاً" : "Least Active First"}</option>
              <option value="last_activity">{isAr ? "أقدم نشاط أولاً" : "Oldest Activity First"}</option>
              <option value="name">{isAr ? "الاسم (أ - ي)" : "Name (A - Z)"}</option>
            </select>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 font-semibold text-foreground">{isAr ? "الموظف" : "Employee"}</th>
                  <th className="px-4 py-3.5 font-semibold text-foreground">{isAr ? "القسم" : "Department"}</th>
                  <th className="px-4 py-3.5 text-center font-semibold text-foreground">
                    {isAr ? "نشاط اليوم" : "Today"}
                  </th>
                  <th className="px-4 py-3.5 text-center font-semibold text-foreground">
                    {isAr ? "نشاط أمس" : "Yesterday"}
                  </th>
                  <th className="px-4 py-3.5 text-center font-semibold text-foreground">
                    {isAr ? "آخر 5 أيام عمل" : "Last 5 Working Days"}
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-foreground">
                    {isAr ? "آخر نشاط مسجل" : "Last Activity"}
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-foreground">
                    {isAr ? "حالة النشاط" : "Inactivity Status"}
                  </th>
                  <th className="px-4 py-3.5 text-right font-semibold text-foreground">
                    {isAr ? "الإجراءات" : "Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedStaff.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        <p className="mt-3 text-sm font-semibold text-foreground">
                          {isAr ? "لا توجد سجلات مطابقة" : "No matching staff found"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {isAr
                            ? "جميع الموظفين نشطون أو لا توجد نتائج تطابق معايير التصفية الحالية."
                            : "All employees have logged activities or no records match the selected filter."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStaff.map((emp) => {
                    const deptClass =
                      DEPT_COLORS[emp.department] ||
                      "bg-secondary text-secondary-foreground border-border";

                    return (
                      <tr
                        key={emp.id}
                        className="transition-colors hover:bg-muted/30"
                      >
                        {/* Employee info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {emp.photo ? (
                              <img
                                src={emp.photo}
                                alt={emp.name}
                                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-500 text-xs font-bold text-white shadow-sm">
                                {emp.avatar || emp.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                to="/admin/employees/$employeeId"
                                params={{ employeeId: emp.id }}
                                className="font-semibold text-foreground transition-colors hover:text-primary"
                              >
                                {emp.name}
                              </Link>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {emp.role || emp.email || "Staff Member"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${deptClass}`}
                          >
                            {emp.department || "—"}
                          </span>
                        </td>

                        {/* Today Activities Count */}
                        <td className="px-4 py-3 text-center">
                          {emp.noActivityToday ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                              0 {isAr ? "نشاط" : "acts"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {emp.todayCount}
                            </span>
                          )}
                        </td>

                        {/* Yesterday Activities Count */}
                        <td className="px-4 py-3 text-center">
                          {emp.noActivityYesterday ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                              0 {isAr ? "نشاط" : "acts"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              {emp.yesterdayCount}
                            </span>
                          )}
                        </td>

                        {/* Last 5 Working Days Activities Count */}
                        <td className="px-4 py-3 text-center">
                          {emp.noActivity5WorkingDays ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">
                              <ShieldAlert className="h-3 w-3" />
                              0 {isAr ? "نشاط" : "acts"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-400">
                              {emp.working5DaysCount} {isAr ? "أنشطة" : "acts"}
                            </span>
                          )}
                        </td>

                        {/* Last Activity */}
                        <td className="px-4 py-3 min-w-[220px]">
                          {emp.lastActivity ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-medium text-foreground">
                                <Calendar className="h-3 w-3 shrink-0 text-muted-foreground" />
                                <span>
                                  {emp.lastActivityDate
                                    ? formatDate(emp.lastActivityDate)
                                    : "—"}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                <span className="font-semibold text-primary">
                                  {emp.lastActivity.type}:
                                </span>{" "}
                                {wrapWords(emp.lastActivity.title, 5).map((line, idx) => (
                                  <div key={idx} className="leading-snug break-words">
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] italic text-muted-foreground">
                              {isAr ? "لا توجد أنشطة مسجلة" : "No activity recorded"}
                            </span>
                          )}
                        </td>

                        {/* Inactivity Status Badges */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1">
                            {emp.noActivity5WorkingDays ? (
                              <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                {isAr ? "خمول 5 أيام" : "5 Days Inactive"}
                              </span>
                            ) : null}
                            {emp.noActivityToday ? (
                              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                                {isAr ? "اليوم" : "Today"}
                              </span>
                            ) : null}
                            {emp.noActivityYesterday ? (
                              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                {isAr ? "أمس" : "Yesterday"}
                              </span>
                            ) : null}
                            {!emp.noActivityToday && !emp.noActivityYesterday && !emp.noActivity5WorkingDays ? (
                              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {isAr ? "نشط" : "Active"}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendReminder(emp.name)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              title={isAr ? "إرسال تذكير نشاط" : "Send Activity Reminder"}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                            <Link
                              to="/admin/employees/$employeeId"
                              params={{ employeeId: emp.id }}
                              className="inline-flex items-center gap-1 rounded-lg bg-secondary/80 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary"
                            >
                              <Eye className="h-3 w-3" />
                              <span>{isAr ? "الملف" : "Profile"}</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <div>
                {isAr
                  ? `عرض ${(page - 1) * pageSize + 1} إلى ${Math.min(
                      page * pageSize,
                      filteredStaff.length,
                    )} من إجمالي ${filteredStaff.length} موظف`
                  : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(
                      page * pageSize,
                      filteredStaff.length,
                    )} of ${filteredStaff.length} staff`}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-medium text-foreground">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
                  aria-label="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
