import React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState, type ActivityType, type ActivityStatus } from "@/lib/store";
import { employees as employeesData } from "@/lib/mock-data";
import { useMemo, useState } from "react";
import { Phone, Users2, MapPin, Mail, ClipboardCheck, RefreshCw, Plus, CheckCircle2, Circle, PlayCircle, X, Bell, Send, Timer, TrendingUp, Activity as ActivityIcon, Target, Flame, CalendarDays, ChevronDown, ChevronUp, LayoutList, Grid3X3 } from "lucide-react";
import { useRole } from "@/lib/role";
import { NewActivityDialog } from "@/components/NewActivityDialog";
import { RejectActivityDialog } from "@/components/RejectActivityDialog";
import { ActivityApprovalCard } from "@/components/ActivityApprovalCard";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";


export const Route = createFileRoute("/admin/activities")({
  component: ActivitiesPage,
  head: () => ({ meta: [{ title: "Activities · INT-CRM" }] }),
});

const ICONS: Record<string, any> = {
  Call: Phone, Meeting: Users2, "Site Visit": MapPin, "Follow-up": RefreshCw, Inspection: ClipboardCheck, Email: Mail,
};
const STATUS_ICON: Record<ActivityStatus, any> = { pending: Circle, in_progress: PlayCircle, done: CheckCircle2, cancelled: X, delayed: Circle };
const STATUS_TONE: Record<ActivityStatus, string> = {
  pending: "text-muted-foreground",
  in_progress: "text-amber-600",
  done: "text-emerald-600",
  cancelled: "text-rose-600",
  delayed: "text-sky-600",
};
const ACT_I18N: Record<string, any> = { Call: "actCall", Meeting: "actMeeting", "Site Visit": "actSiteVisit", "Follow-up": "actFollowUp", Inspection: "actInspection", Email: "actEmail" };

type Period = "today" | "yesterday" | "week" | "month" | "all";
const PERIODS: { key: Period }[] = [
  { key: "today" },
  { key: "yesterday" },
  { key: "week" },
  { key: "month" },
  { key: "all" },
];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function inPeriod(dateStr: string, period: Period): boolean {
  if (period === "all") return true;
  const d = startOfDay(new Date(dateStr + "T00:00:00"));
  const today = startOfDay(new Date());
  if (period === "today") return d.getTime() === today.getTime();
  if (period === "yesterday") { const y = new Date(today); y.setDate(today.getDate() - 1); return d.getTime() === y.getTime(); }
  if (period === "week") { const w = new Date(today); w.setDate(today.getDate() - 6); return d >= w && d <= today; }
  if (period === "month") { const m = new Date(today); m.setDate(today.getDate() - 29); return d >= m && d <= today; }
  return true;
}

function ActivitiesPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { isAdmin, isManager, role } = useRole();
  const canApprove = isAdmin || isManager;
  const { activities, leads, settings } = useStoreState();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reminderFor, setReminderFor] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<{ id: string; title: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const [filter, setFilter] = useState<"all" | ActivityType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ActivityStatus>("all");
  const [period, setPeriod] = useState<Period>("today");
  const [ownerFilter, setOwnerFilter] = useState<string | "all">("all");
  const [view, setView] = useState<"table" | "cards">("table");

  // Period-scoped list (used by employee strip & global KPIs)
  const periodList = useMemo(
    () => activities.filter((a) => inPeriod(a.dueDate, period)),
    [activities, period],
  );

  const list = useMemo(() => {
    return periodList
      .filter((a) =>
        (filter === "all" || a.type === filter) &&
        (statusFilter === "all" || a.status === statusFilter) &&
        (ownerFilter === "all" || (a.owner && a.owner !== "Unassigned" ? a.owner : (a as any).createdByName ?? "Unassigned") === ownerFilter),
      )
      .sort((a, b) => (b.dueDate + b.time).localeCompare(a.dueDate + a.time));
  }, [periodList, filter, statusFilter, ownerFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof list>();
    for (const a of list) {
      const arr = map.get(a.dueDate) ?? [];
      arr.push(a);
      map.set(a.dueDate, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [list]);

  // Per-employee summary for the active period
  const empSummary = useMemo(() => {
    const m = new Map<string, {
      name: string; photo?: string; initials: string;
      total: number; done: number; pending: number; inprog: number; cancelled: number;
      mins: number; minsDone: number;
      types: Record<string, number>;
    }>();
    for (const a of periodList) {
      const hasRealOwner = a.owner && a.owner !== "Unassigned";
      const ownerName = hasRealOwner ? a.owner : (a.createdByName ?? "Unassigned");
      const emp = employeesData.find((e) => e.name === ownerName);
      const photo = (hasRealOwner ? emp?.photo : (a.createdByPhoto ?? emp?.photo));
      const initials = ownerName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      const cur = m.get(ownerName) ?? {
        name: ownerName, photo, initials,
        total: 0, done: 0, pending: 0, inprog: 0, cancelled: 0,
        mins: 0, minsDone: 0, types: {},
      };
      cur.total += 1;
      cur.mins += a.estMinutes ?? 0;
      if (a.status === "done") { cur.done += 1; cur.minsDone += a.estMinutes ?? 0; }
      else if (a.status === "pending") cur.pending += 1;
      else if (a.status === "in_progress") cur.inprog += 1;
      else if (a.status === "cancelled") cur.cancelled += 1;
      cur.types[a.type] = (cur.types[a.type] ?? 0) + 1;
      m.set(ownerName, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [periodList]);

  // Global KPIs for the active period
  const kpis = useMemo(() => {
    const total = periodList.length;
    const done = periodList.filter((a) => a.status === "done").length;
    const pending = periodList.filter((a) => a.status === "pending").length;
    const inprog = periodList.filter((a) => a.status === "in_progress").length;
    const mins = periodList.reduce((s, a) => s + (a.estMinutes ?? 0), 0);
    const completion = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pending, inprog, mins, completion };
  }, [periodList]);

  const fmtH = (mins: number) => {
    const h = Math.floor(mins / 60); const m = mins % 60;
    return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
  };

  const dayLabel = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    const today = startOfDay(new Date());
    const diff = Math.round((today.getTime() - startOfDay(d).getTime()) / 86400000);
    const locale = isAr ? "ar-EG" : undefined;
    if (diff === 0) return t("periodToday");
    if (diff === 1) return t("periodYesterday");
    if (diff > 1 && diff < 7) return d.toLocaleDateString(locale, { weekday: "long" });
    return d.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
  };

  const activePeriod = PERIODS.find((p) => p.key === period)!;
  console.log("DEBUG lang:", lang, "t('activitiesCommandCenter'):", t("activitiesCommandCenter"));
  const periodLabelMap: Record<Period, string> = {
    today: t("periodToday"),
    yesterday: t("periodYesterday"),
    week: t("periodWeek"),
    month: t("periodMonth"),
    all: t("periodAll"),
  };
  const periodSubMap: Record<Period, string> = {
    today: t("periodTodaySub"),
    yesterday: t("periodYesterdaySub"),
    week: t("periodWeekSub"),
    month: t("periodMonthSub"),
    all: t("periodAllSub"),
  };
  const activePeriodLabel = periodLabelMap[period];
  const activePeriodSub = periodSubMap[period];

  return (
    <AppShell panel={role} user={{ name: "hafez Rahim", role: t(role as any), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" }} pageTitle={t("activities")}>
      {/* Hero header with period tabs + KPIs */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 pb-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              <ActivityIcon className="h-3.5 w-3.5" /> {t("activitiesCommandCenter")}
            </div>
            <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">
              {activePeriodLabel}{" "}
              <span className="text-base font-medium text-muted-foreground">· {activePeriodSub}</span>
            </h2>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {t("addActivity")}
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex flex-wrap gap-2 px-5">
          {PERIODS.map((p) => {
            const active = p.key === period;
            return (
              <button
                key={p.key}
                onClick={() => { setPeriod(p.key); setOwnerFilter("all"); }}
                className={`group relative inline-flex items-center gap-2 rounded-t-xl border border-b-0 px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-border bg-card text-foreground shadow-[var(--shadow-soft)]"
                    : "border-transparent bg-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground"
                }`}
              >
                <CalendarDays className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                {periodLabelMap[p.key]}
                {active && <span className="ms-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{activities.filter(a => inPeriod(a.dueDate, p.key)).length}</span>}
              </button>
            );
          })}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 border-t border-border bg-card p-5 md:grid-cols-5">
          <Kpi icon={ActivityIcon} label={t("kpiTotal")} value={String(kpis.total)} tone="text-foreground" />
          <Kpi icon={CheckCircle2} label={t("kpiDone")} value={String(kpis.done)} tone="text-emerald-600" />
          <Kpi icon={PlayCircle} label={t("kpiInProgress")} value={String(kpis.inprog)} tone="text-amber-600" />
          <Kpi icon={Circle} label={t("kpiPending")} value={String(kpis.pending)} tone="text-muted-foreground" />
          <Kpi icon={TrendingUp} label={t("kpiCompletion")} value={`${kpis.completion}%`} tone="text-primary" sub={fmtH(kpis.mins)} />
        </div>
      </div>

      {/* Employee performance strip */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{t("employeePulse")} · {activePeriodLabel}</h3>
          </div>
          {ownerFilter !== "all" && (
            <button onClick={() => setOwnerFilter("all")} className="text-xs font-semibold text-primary hover:underline">
              {t("clearFilter")} ({ownerFilter})
            </button>
          )}
        </div>
        {empSummary.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("noActivityPeriod")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {empSummary.map((e) => {
              const completion = e.total ? Math.round((e.done / e.total) * 100) : 0;
              const isActive = ownerFilter === e.name;
              const topType = Object.entries(e.types).sort((a, b) => b[1] - a[1])[0]?.[0];
              const TopIcon = topType ? (ICONS[topType] ?? ActivityIcon) : ActivityIcon;
              return (
                <button
                  key={e.name}
                  onClick={() => setOwnerFilter(isActive ? "all" : e.name)}
                  className={`group text-start rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg ${
                    isActive ? "border-primary ring-2 ring-primary/30" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {e.photo ? (
                      <img src={e.photo} alt={`${e.name} avatar`} className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20" />
                    ) : (
                      <div role="img" aria-label={`${e.name} avatar`} className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{e.initials}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-foreground">{e.name}</div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <TopIcon className="h-3 w-3" />
                        <span>{topType ?? "—"} · {e.total}</span>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className={`font-mono text-xl font-extrabold ${completion >= 75 ? "text-emerald-600" : completion >= 40 ? "text-amber-600" : "text-rose-600"}`}>{completion}%</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("kpiDone")}</div>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${completion >= 75 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : completion >= 40 ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-gradient-to-r from-rose-400 to-rose-600"}`}
                      style={{ width: `${completion}%` }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                    <Mini label={t("kpiDone")} value={e.done} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
                    <Mini label={t("inProgress")} value={e.inprog} tone="bg-amber-50 text-amber-700 ring-amber-200" />
                    <Mini label={t("kpiPending")} value={e.pending} tone="bg-secondary text-muted-foreground ring-border" />
                    <Mini label={t("time")} value={fmtH(e.mins)} tone="bg-primary/10 text-primary ring-primary/20" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setView("table")}
            aria-label="Table view"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("cards")}
            aria-label="Cards view"
            className={`flex h-8 w-8 items-center justify-center rounded-md transition ${view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...settings.activityTypes] as const).map((tp) => (
            <button
              key={tp}
              onClick={() => setFilter(tp as any)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === tp ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border hover:bg-accent"
                }`}
            >
              {tp === "all" ? t("all") : (ACT_I18N[tp] ? t(ACT_I18N[tp]) : tp)}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="all">{t("all")} — {t("status")}</option>
          <option value="pending">{t("pending")}</option>
          <option value="in_progress">{t("inProgress")}</option>
          <option value="done">{t("done")}</option>
          <option value="cancelled">{t("cancelled")}</option>
          <option value="delayed">{t("delayed")}</option>
        </select>
        <div className="ms-auto inline-flex items-center gap-1.5 rounded-lg bg-secondary/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
          <Target className="h-3.5 w-3.5" /> {list.length} {t("matches")}
        </div>
      </div>

      {view === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>{t("title")}</TableHead>
                  <TableHead>{t("owner")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("time")}</TableHead>
                  <TableHead>{t("leads")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("pending_approval")}</TableHead>
                  <TableHead className="text-right">{t("action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((a) => {
                  const Icon = ICONS[a.type] ?? Circle;
                  const SIcon = STATUS_ICON[a.status];
                  const lead = leads.find((l) => l.id === a.leadId);
                  const hasOwner = a.owner && a.owner !== "Unassigned";
                  const displayName = hasOwner ? a.owner : (a.createdByName ?? "Unassigned");
                  const emp = employeesData.find((e) => e.name === displayName);
                  const displayPhoto = hasOwner ? emp?.photo : (a.createdByPhoto ?? emp?.photo);
                  return (
                    <TableRow
                      key={a.id}
                      onClick={() => navigate({ to: "/admin/activities/$activityId", params: { activityId: a.id } })}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{a.title}</div>
                        <div className="text-xs text-muted-foreground">{ACT_I18N[a.type] ? t(ACT_I18N[a.type]) : a.type}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {displayPhoto ? (
                            <img src={displayPhoto} alt="" className="h-5 w-5 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[8px] font-bold text-foreground">
                              {displayName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                            </div>
                          )}
                          <span className="text-sm text-muted-foreground">{displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.dueDate}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.time}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead?.company ?? a.projectId ?? "—"}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_TONE[a.status]}`} onClick={(e) => e.stopPropagation()}>
                          <SIcon className="h-3.5 w-3.5" />
                          <select
                            value={a.status}
                            onChange={(e) => actions.setActivityStatus(a.id, e.target.value as ActivityStatus)}
                            className={`bg-transparent text-xs font-semibold capitalize focus:outline-none cursor-pointer ${STATUS_TONE[a.status]}`}
                          >
                            <option value="pending">{t("actPostponed")}</option>
                            <option value="in_progress">{t("inProgress")}</option>
                            <option value="done">{t("actAttended")}</option>
                            <option value="cancelled">{t("actNotAttended")}</option>
                            <option value="delayed">{t("actDelayed")}</option>
                          </select>
                        </div>
                      </TableCell>
                      <TableCell>
                        {a.approvalStatus === "pending" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">{t("approvalPending")}</span>
                        )}
                        {a.approvalStatus === "approved" && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">{t("approvalApproved")}</span>
                        )}
                        {a.approvalStatus === "rejected" && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700" title={a.rejectionReason}>{t("approvalRejected")}</span>
                        )}
                        {!a.approvalStatus && <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          {a.approvalStatus === "pending" && canApprove && (
                            <>
                              <button
                                onClick={() => { actions.approveActivity(a.id); toast.success(t("approvalApproved")); }}
                                className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              >{t("approveActivity")}</button>
                              <button
                                onClick={() => setRejectFor({ id: a.id, title: a.title })}
                                className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
                              >{t("rejectActivity")}</button>
                            </>
                          )}
                          {a.status !== "done" && (
                            <button
                              onClick={() => setReminderFor(a.id)}
                              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/20"
                            >
                              <Bell className="h-3 w-3" /> {t("remind")}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">{t("noActivitiesFilters")}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <div className="mb-2 flex items-center gap-3">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{dayLabel(date)}</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{date}</span>
                <span className="text-xs text-muted-foreground">{items.length} item(s) · {fmtH(items.reduce((s, a) => s + (a.estMinutes ?? 0), 0))} total</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map((a) => {
                  const Icon = ICONS[a.type] ?? Circle;
                  const SIcon = STATUS_ICON[a.status];
                  const lead = leads.find((l) => l.id === a.leadId);
                  const hasOwner = a.owner && a.owner !== "Unassigned";
                  const displayName = hasOwner ? a.owner : (a.createdByName ?? "Unassigned");
                  const emp = employeesData.find((e) => e.name === displayName);
                  const displayPhoto = hasOwner ? emp?.photo : (a.createdByPhoto ?? emp?.photo);
                  return (
                    <div
                      key={a.id}
                      onClick={() => navigate({ to: "/admin/activities/$activityId", params: { activityId: a.id } })}
                      className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary/40 cursor-pointer"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{a.title}</span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ACT_I18N[a.type] ? t(ACT_I18N[a.type]) : a.type}</span>
                          {a.estMinutes != null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/20"><Timer className="h-3 w-3" /> {fmtH(a.estMinutes)}</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {displayPhoto ? (
                            <img src={displayPhoto} alt={`${displayName} avatar`} className="h-5 w-5 rounded-full object-cover" />
                          ) : (
                            <div role="img" aria-label={`${displayName} avatar`} className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground">{displayName.split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
                          )}
                          <span>{displayName} · {a.time}{lead ? ` · ${lead.company}` : a.projectId ? ` · ${a.projectId}` : ""}</span>
                          {a.presalesTeam && a.presalesTeam.length > 0 && (
                            <div className="flex -space-x-1" title={t("presalesTeam")}>
                              {a.presalesTeam.map((p) => (
                                <div key={p} className="flex h-4 w-4 items-center justify-center rounded-full border border-card bg-secondary text-[8px] font-bold text-foreground">
                                  {p.split(" ").map(w => w[0]).join("").slice(0, 2)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {a.notes && <div className="mt-1 text-xs text-muted-foreground">📝 {a.notes}</div>}
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_TONE[a.status]}`}>
                        <SIcon className="h-4 w-4" />
                        <span className="capitalize">
                          {a.status === "done" ? t("actAttended") : a.status === "cancelled" ? t("actNotAttended") : t("actPostponed")}
                        </span>
                      </div>
                      {a.approvalStatus === "pending" && (
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">{t("approvalPending")}</span>
                          {canApprove && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); actions.approveActivity(a.id); toast.success(t("approvalApproved")); }}
                                className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              >{t("approveActivity")}</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setRejectFor({ id: a.id, title: a.title }); }}
                                className="rounded-md bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
                              >{t("rejectActivity")}</button>
                            </>
                          )}
                        </div>
                      )}
                      {a.approvalStatus === "rejected" && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700" title={a.rejectionReason}>{t("approvalRejected")}</span>
                      )}
                      {a.status !== "done" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setReminderFor(a.id); }}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary/20"
                          title="Send reminder"
                        >
                          <Bell className="h-3.5 w-3.5" /> {t("remind")}
                        </button>
                      )}
                      {a.status !== "done" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); actions.setActivityStatus(a.id, "done"); }}
                          className={`rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 ${isAdmin ? "" : "opacity-50 pointer-events-none"}`}
                        >
                          {t("markDone")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              {t("noActivitiesFilters")}
            </div>
          )}
        </div>
      )}


      {open && <NewActivityDialog onClose={() => setOpen(false)} />}
      {reminderFor && <ReminderDialog activityId={reminderFor} onClose={() => setReminderFor(null)} />}
      {rejectFor && <RejectActivityDialog activityId={rejectFor.id} activityTitle={rejectFor.title} onClose={() => setRejectFor(null)} />}
    </AppShell>
  );
}

function Kpi({ icon: I, label, value, tone, sub }: { icon: any; label: string; value: string; tone: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <I className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-1 font-mono text-2xl font-extrabold tracking-tight ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className={`rounded-md px-1.5 py-1 ring-1 ${tone}`}>
      <div className="font-mono text-xs font-bold leading-none">{value}</div>
      <div className="mt-0.5 text-[9px] uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}


function ReminderDialog({ activityId, onClose }: { activityId: string; onClose: () => void }) {
  const { t } = useI18n();
  const { activities, leads, settings } = useStoreState();
  const activity = activities.find((a) => a.id === activityId);
  const channelTemplates = settings.templates.filter((t) => t.channel === "Email" || t.channel === "WhatsApp" || t.channel === "SMS");
  const [templateId, setTemplateId] = useState(channelTemplates[0]?.id ?? "");
  const [sent, setSent] = useState(false);
  if (!activity) return null;
  const template = settings.templates.find((t) => t.id === templateId);
  const lead = activity.leadId ? leads.find((l) => l.id === activity.leadId) : undefined;
  const fill = (s: string) => s
    .replaceAll("{{contact}}", lead?.contact ?? "there")
    .replaceAll("{{company}}", lead?.company ?? activity.projectId ?? "—")
    .replaceAll("{{date}}", activity.dueDate)
    .replaceAll("{{time}}", activity.time);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-foreground inline-flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> {t("sendRemindBtn")}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-3 rounded-lg bg-secondary/50 p-3 text-xs">
          <div className="font-semibold text-foreground">{activity.title}</div>
          <div className="text-muted-foreground">{activity.dueDate} {activity.time} · {activity.owner && activity.owner !== "Unassigned" ? activity.owner : ((activity as any).createdByName ?? "Unassigned")}{lead ? ` · ${lead.company}` : ""}</div>
        </div>
        <label className="block">
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Template (Email / WhatsApp / SMS)</div>
          <select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setSent(false); }} className="h-10 w-full rounded-lg border border-border bg-background px-2 text-sm">
            {channelTemplates.map((t) => <option key={t.id} value={t.id}>[{t.channel}] {t.name}</option>)}
          </select>
        </label>
        {template && (
          <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary">{template.channel} preview</div>
            {template.subject && <div className="mt-1 font-semibold text-foreground">{fill(template.subject)}</div>}
            <div className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{fill(template.body)}</div>
          </div>
        )}
        {sent && <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">✓ {t("reminderDispatched")}</div>}
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent">{t("close")}</button>
          <button
            disabled={!template || sent}
            onClick={() => {
              if (template) {
                actions.sendReminder(activityId, template.id);
                setSent(true);
                toast.success(`Reminder sent via ${template.channel}`);
                setTimeout(onClose, 800);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> {sent ? t("sent") : `${t("sendVia")} ${template?.channel ?? ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}