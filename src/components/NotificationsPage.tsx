import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState, type AppNotification } from "@/lib/store";
import { isAllowed, useNotifPrefs } from "@/lib/notificationPrefs";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDatesInText } from "@/lib/utils";
import {
  Bell,
  Users,
  User,
  MessageSquare,
  CalendarCheck,
  Clock4,
  FileBadge,
  Briefcase,
  Check,
  Trash2,
  MailOpen,
  Mail,
  Settings as SettingsIcon,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Panel = "admin" | "manager" | "employee" | "finance";
const ITEMS_PER_PAGE = 20;

const ICONS: Record<AppNotification["type"], typeof Bell> = {
  lead: Users,
  chat: MessageSquare,
  activity: CalendarCheck,
  attendance: Clock4,
  quotation: FileBadge,
  project: Briefcase,
};

const TONE: Record<AppNotification["type"], string> = {
  lead: "bg-blue-100 text-blue-600",
  chat: "bg-violet-100 text-violet-600",
  activity: "bg-emerald-100 text-emerald-600",
  attendance: "bg-amber-100 text-amber-600",
  quotation: "bg-rose-100 text-rose-600",
  project: "bg-indigo-100 text-indigo-600",
};

const CATEGORIES: { key: AppNotification["type"] | "all"; labelEn: string; labelAr: string }[] = [
  { key: "all", labelEn: "All", labelAr: "الكل" },
  { key: "lead", labelEn: "Leads", labelAr: "العملاء المحتملون" },
  { key: "project", labelEn: "Accounts", labelAr: "الحسابات" },
  { key: "chat", labelEn: "Chat", labelAr: "المحادثات" },
  { key: "activity", labelEn: "Activities", labelAr: "الأنشطة" },
  { key: "attendance", labelEn: "Attendance", labelAr: "الحضور" },
  { key: "quotation", labelEn: "Quotations", labelAr: "العروض" },
];

function timeAgo(ts: string, dir: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return dir === "rtl" ? "الآن" : "now";
  if (m < 60) return `${m}${dir === "rtl" ? " د" : "m"}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${dir === "rtl" ? " س" : "h"}`;
  return `${Math.floor(h / 24)}${dir === "rtl" ? " ي" : "d"}`;
}

function formatCreatedAt(ts: string): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `${dateStr} ${timeStr}`;
  } catch {
    return ts;
  }
}

function rewriteHref(href: string | undefined, panel: Panel): string | undefined {
  if (!href) return href;
  if (href === "/chat" || href.startsWith("/chat")) {
    if (panel === "finance") return "/finance?tab=chat";
    return `/${panel}/chat`;
  }
  if (panel === "admin") return href;
  if (panel === "finance") {
    if (href.startsWith("/admin/offers/"))
      return href.replace("/admin/offers/", "/finance/quotations/");
    if (href.startsWith("/admin/offers")) return "/finance?tab=quotations";
    if (href.startsWith("/admin/chat")) return "/finance?tab=chat";
    return "/finance";
  }
  return href.replace("/admin/", `/${panel}/`);
}

export function NotificationsPage({
  panel,
  user,
}: {
  panel: Panel;
  user: { name: string; role: string; initials: string; photo?: string };
}) {
  const { dir } = useI18n();
  const { notifications, profile, employees, activities, leads, projects } = useStoreState();
  const { role } = useAuth();
  const [prefs] = useNotifPrefs(role ?? panel);
  const [filter, setFilter] = useState<AppNotification["type"] | "all">("all");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [groupByEmployee, setGroupByEmployee] = useState(false);
  const [page, setPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filter, employeeFilter, groupByEmployee]);

  const me = profile?.name || user.name;

  const all = useMemo<AppNotification[]>(() => {
    return notifications
      .filter((n) => isAllowed(n, prefs))
      .sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  }, [notifications, prefs]);

  const getEmployeeName = (n: AppNotification): string => {
    if (n.audience && n.audience.length > 0) {
      const matched = employees?.find((e: any) => n.audience?.includes(e.name));
      if (matched) return matched.name;
      const firstAud = n.audience[0];
      if (firstAud && firstAud !== "all") return firstAud;
    }
    if (n.href) {
      const actIdMatch = n.href.match(/activities\/([^\/]+)/);
      if (actIdMatch) {
        const act = activities?.find((a) => a.id === actIdMatch[1]);
        if (act) {
          const owner = act.owner && act.owner !== "Unassigned" ? act.owner : act.createdByName;
          if (owner) return owner;
        }
      }
      const leadIdMatch = n.href.match(/leads\/([^\/]+)/);
      if (leadIdMatch) {
        const lead = leads?.find((l) => l.id === leadIdMatch[1]);
        if (lead?.owner) return lead.owner;
      }
      const projIdMatch = n.href.match(/projects\/([^\/]+)/);
      if (projIdMatch) {
        const proj = projects?.find((p) => p.id === projIdMatch[1]);
        if (proj) {
          const owner = (proj.teamMembers && proj.teamMembers[0]) || proj.createdByName;
          if (owner) return owner;
        }
      }
    }
    const combinedText = `${n.titleEn || ""} ${n.bodyEn || ""} ${n.titleAr || ""} ${n.bodyAr || ""}`;
    for (const emp of employees || []) {
      if (emp.name && combinedText.includes(emp.name)) {
        return emp.name;
      }
    }
    if (employees && employees.length > 0) {
      const charCode = n.id.charCodeAt(n.id.length - 1) || 0;
      return employees[charCode % employees.length]?.name || (dir === "rtl" ? "عام" : "General");
    }
    return dir === "rtl" ? "عام" : "General";
  };

  const employeeOptions = useMemo(() => {
    const set = new Set<string>();
    all.forEach((n) => {
      const emp = getEmployeeName(n);
      if (emp) set.add(emp);
    });
    (employees || []).forEach((e: any) => {
      if (e?.name) set.add(e.name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [all, employees, dir]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const n of all) c[n.type] = (c[n.type] ?? 0) + 1;
    return c;
  }, [all]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? all : all.filter((n) => n.type === filter);
    if (employeeFilter !== "all") {
      list = list.filter((n) => getEmployeeName(n) === employeeFilter);
    }
    return list;
  }, [all, filter, employeeFilter]);

  const paginatedFiltered = useMemo(() => {
    return filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  }, [filtered, page]);

  const groupedByEmp = useMemo(() => {
    if (!groupByEmployee) return null;
    const map = new Map<string, AppNotification[]>();
    for (const n of paginatedFiltered) {
      const emp = getEmployeeName(n);
      const list = map.get(emp) || [];
      list.push(n);
      map.set(emp, list);
    }
    return Array.from(map.entries()).map(([empName, notifs]) => ({
      empName,
      notifs,
      unreadCount: notifs.filter((n) => n.unread).length,
    }));
  }, [paginatedFiltered, groupByEmployee, dir]);

  const unreadCount = all.filter((n) => n.unread).length;

  const renderNotifItem = (n: AppNotification) => {
    const I = ICONS[n.type];
    const href = rewriteHref(n.href, panel);
    const empName = getEmployeeName(n);

    const inner = (
      <div
        className={`group flex items-start gap-4 px-5 py-4 transition hover:bg-secondary/60 ${n.unread ? "bg-primary/5" : ""}`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE[n.type]}`}
        >
          <I className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-bold text-foreground">
              {formatDatesInText(dir === "rtl" ? n.titleAr : n.titleEn)}
            </div>
            {empName && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                <User className="h-3 w-3" />
                {empName}
              </span>
            )}
            {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
            <div className="ms-auto shrink-0 text-end whitespace-nowrap">
              <div className="text-[11px] font-semibold text-foreground">{timeAgo(n.ts, dir)}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{formatDate(n.ts)}</div>
            </div>
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {formatDatesInText(dir === "rtl" ? n.bodyAr : n.bodyEn)}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (n.unread) actions.markNotificationRead(n.id);
              else actions.markNotificationUnread(n.id);
            }}
            title={
              n.unread
                ? dir === "rtl"
                  ? "تحديد كمقروء"
                  : "Mark read"
                : dir === "rtl"
                  ? "تحديد كغير مقروء"
                  : "Mark unread"
            }
            aria-label="toggle-read"
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {n.unread ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              actions.dismissNotification(n.id);
            }}
            title={dir === "rtl" ? "أرشفة" : "Archive"}
            aria-label="dismiss"
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );

    return (
      <li key={n.id}>
        {href ? (
          <Link to={href as any} onClick={() => actions.markNotificationRead(n.id)}>
            {inner}
          </Link>
        ) : (
          <div onClick={() => actions.markNotificationRead(n.id)}>{inner}</div>
        )}
      </li>
    );
  };

  return (
    <AppShell panel={panel} user={user} pageTitle={dir === "rtl" ? "الإشعارات" : "Notifications"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {dir === "rtl" ? "مركز الإشعارات" : "Notification Center"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {unreadCount} {dir === "rtl" ? "غير مقروء من أصل" : "unread of"} {all.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/${panel}/notifications/settings` as any}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <SettingsIcon className="h-4 w-4" /> {dir === "rtl" ? "الإعدادات" : "Settings"}
          </Link>
          <button
            onClick={() => actions.markAllNotificationsRead(me)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <Check className="h-4 w-4" /> {dir === "rtl" ? "تحديد الكل كمقروء" : "Mark all read"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = filter === c.key;
            const I = c.key === "all" ? Bell : ICONS[c.key];
            return (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground ring-1 ring-border hover:bg-accent"
                }`}
              >
                <I className="h-3.5 w-3.5" />
                {dir === "rtl" ? c.labelAr : c.labelEn}
                <span
                  className={`ms-1 rounded-full px-1.5 text-[10px] font-bold ${
                    active ? "bg-primary-foreground/20" : "bg-secondary"
                  }`}
                >
                  {counts[c.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Employee Grouping & Filter Controls */}
        <div className="flex items-center gap-2">
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            aria-label={dir === "rtl" ? "الموظف" : "Employee"}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">{dir === "rtl" ? "الموظف: الكل" : "Employee: All"}</option>
            {employeeOptions.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setGroupByEmployee((v) => !v)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
              groupByEmployee
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            {dir === "rtl" ? "تجميع حسب الموظف" : "Group by Employee"}
          </button>
        </div>
      </div>

      {groupedByEmp ? (
        <div className="space-y-4">
          {groupedByEmp.length === 0 && (
            <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
              {dir === "rtl" ? "لا توجد إشعارات" : "No notifications"}
            </div>
          )}
          {groupedByEmp.map((grp) => (
            <div
              key={grp.empName}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-5 py-3">
                <div className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>{grp.empName}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    {grp.notifs.length}
                  </span>
                </div>
                {grp.unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                    {grp.unreadCount} {dir === "rtl" ? "غير مقروء" : "unread"}
                  </span>
                )}
              </div>
              <ul className="divide-y divide-border">
                {grp.notifs.map((n) => renderNotifItem(n))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          {paginatedFiltered.length === 0 && (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
              {dir === "rtl" ? "لا توجد إشعارات في هذه الفئة" : "No notifications in this category"}
            </div>
          )}
          <ul className="divide-y divide-border">
            {paginatedFiltered.map((n) => renderNotifItem(n))}
          </ul>
        </div>
      )}

      {/* Pagination Controls */}
      {filtered.length > ITEMS_PER_PAGE && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-soft)]">
          <span className="text-xs text-muted-foreground">
            {dir === "rtl" ? "عرض" : "Showing"} {(page - 1) * ITEMS_PER_PAGE + 1}{" "}
            {dir === "rtl" ? "إلى" : "to"} {Math.min(page * ITEMS_PER_PAGE, filtered.length)}{" "}
            {dir === "rtl" ? "من" : "of"} {filtered.length} {dir === "rtl" ? "إشعار" : "entries"}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg p-1 hover:bg-secondary disabled:opacity-40"
            >
              <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            </button>
            <span className="px-2 text-xs font-semibold">
              {page} / {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
            </span>
            <button
              onClick={() =>
                setPage((p) => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))
              }
              disabled={page >= Math.ceil(filtered.length / ITEMS_PER_PAGE)}
              className="rounded-lg p-1 hover:bg-secondary disabled:opacity-40"
            >
              <ChevronRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
