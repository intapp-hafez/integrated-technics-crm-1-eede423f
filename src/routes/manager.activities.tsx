import { formatDate } from "@/lib/utils";
import React from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState } from "@/lib/store";
import { useMemo, useState, useEffect } from "react";
import {
  Phone,
  Users2,
  MapPin,
  Mail,
  ClipboardCheck,
  RefreshCw,
  Circle,
  PlayCircle,
  CheckCircle2,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  LayoutList,
  Grid3X3,
} from "lucide-react";
import type { ActivityStatus } from "@/lib/store";
import { NewActivityDialog } from "@/components/activities/NewActivityDialog";
import { ActivityApprovalCard } from "@/components/activities/ActivityApprovalCard";
import { useRole } from "@/lib/role";
import { cairoIsoDate } from "@/lib/cairoTime";
import { useMyTeam } from "@/lib/useMyTeam";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ExcelImportModal } from "@/components/ExcelImportModal";
import { Download } from "lucide-react";

export const Route = createFileRoute("/manager/activities")({
  component: ManagerActivitiesPage,
  head: () => ({ meta: [{ title: "Team Activities Â· INT-CRM" }] }),
});

const ICONS: Record<string, any> = {
  Call: Phone,
  Meeting: Users2,
  "Site Visit": MapPin,
  "Follow-up": RefreshCw,
  Inspection: ClipboardCheck,
  Email: Mail,
};
const STATUS_ICON: Record<ActivityStatus, any> = {
  pending: Circle,
  in_progress: PlayCircle,
  done: CheckCircle2,
  cancelled: X,
  delayed: Circle,
};
const STATUS_TONE: Record<ActivityStatus, string> = {
  pending: "text-muted-foreground",
  in_progress: "text-amber-600",
  done: "text-emerald-600",
  cancelled: "text-rose-600",
  delayed: "text-sky-600",
};

function ManagerActivitiesPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { activities, leads, projects, employees, users } = useStoreState();

  const getOwnerPhoto = (name?: string, fallbackPhoto?: string) => {
    if (fallbackPhoto) return fallbackPhoto;
    if (!name || name === "Unassigned") return undefined;
    const norm = name.trim().toLowerCase();
    const u = users?.find((usr) => usr.name?.trim().toLowerCase() === norm);
    if (u?.avatarUrl) return u.avatarUrl;
    const e = employees?.find((emp) => emp.name?.trim().toLowerCase() === norm);
    if (e?.photo) return e.photo;
    return undefined;
  };
  const [view, setView] = useState<"table" | "cards">("table");
  const [owner, setOwner] = useState("all");
  const [status, setStatus] = useState<"all" | ActivityStatus>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [timeTab, setTimeTab] = useState<"today" | "working5" | "thisMonth" | "upcoming" | "past" | "all">("today");

  const searchParams = (useSearch({ strict: false }) || {}) as {
    type?: string;
    period?: string;
    owner?: string;
  };

  useEffect(() => {
    if (searchParams.owner) setOwner(searchParams.owner);
    if (searchParams.type) setTypeFilter(searchParams.type);
    if (
      searchParams.period === "week" ||
      searchParams.period === "upcoming" ||
      searchParams.period === "all"
    ) {
      setTimeTab(searchParams.period as any);
    }
  }, [searchParams.owner, searchParams.period, searchParams.type]);
  const [open, setOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const { isAdmin, isManager } = useRole();
  const canApprove = isAdmin || isManager;
  const today = cairoIsoDate();
  const { teamEmployees, teamNames } = useMyTeam({ forceTeam: true });

  const working5Days = useMemo(() => {
    const dates = new Set<string>();
    const cur = new Date(today + "T12:00:00");
    let guard = 0;
    while (dates.size < 5 && guard < 15) {
      const day = cur.getDay(); // 5 = Friday, 6 = Saturday (weekend)
      if (day !== 5 && day !== 6) {
        const iso = cur.toISOString().slice(0, 10);
        dates.add(iso);
      }
      cur.setDate(cur.getDate() - 1);
      guard++;
    }
    return dates;
  }, [today]);

  const currentMonth = today.slice(0, 7);

  const matchesActivityType = (actualType: string, selectedFilter: string): boolean => {
    if (selectedFilter === "all") return true;
    const a = (actualType || "").toLowerCase().trim();
    const f = selectedFilter.toLowerCase().trim();
    if (f === "call") return a.includes("call");
    if (f === "meeting") return a.includes("meet");
    if (f === "visit" || f === "site visit") return a.includes("visit");
    if (f === "follow-up" || f === "followup") return a.includes("follow");
    if (f === "inspection") return a.includes("inspect");
    if (f === "email") return a.includes("email");
    return a.includes(f);
  };

  const teamProfileIds = useMemo(
    () => new Set(teamEmployees.map((e: any) => e.id)),
    [teamEmployees],
  );

  const teamActivities = useMemo(
    () =>
      activities.filter((a) => {
        if (a.owner && teamNames.has(a.owner)) return true;
        if (a.ownerId && teamProfileIds.has(a.ownerId)) return true;
        if (
          Array.isArray(a.presalesTeam) &&
          a.presalesTeam.some((name: string) => teamNames.has(name))
        )
          return true;
        if (
          Array.isArray(a.presalesIds) &&
          a.presalesIds.some((id: string) => teamProfileIds.has(id))
        )
          return true;
        if (a.createdByName && teamNames.has(a.createdByName)) return true;
        return false;
      }),
    [activities, teamNames, teamProfileIds],
  );

  const owners = ["all", ...Array.from(new Set(teamActivities.map((a) => a.owner)))];

  const filtered = useMemo(() => {
    const statusOrder: Record<string, number> = {
      pending: 0,
      in_progress: 1,
      done: 2,
      cancelled: 3,
    };
    return teamActivities
      .filter((a) => {
        if (owner !== "all" && a.owner !== owner) return false;
        if (status !== "all" && a.status !== status) return false;
        if (typeFilter !== "all" && !matchesActivityType(a.type, typeFilter)) return false;
        if (timeTab === "today") return a.dueDate === today;
        if (timeTab === "working5") return working5Days.has(a.dueDate);
        if (timeTab === "thisMonth") return a.dueDate.startsWith(currentMonth);
        if (timeTab === "upcoming") return a.dueDate > today;
        if (timeTab === "past") return a.dueDate < today;
        return true;
      })
      .sort((a, b) => {
        const ord = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        if (ord !== 0) return ord;
        return (a.dueDate + a.time).localeCompare(b.dueDate + b.time);
      });
  }, [teamActivities, owner, status, typeFilter, timeTab, today, working5Days, currentMonth]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const a of filtered) {
      const arr = map.get(a.dueDate) ?? [];
      arr.push(a);
      map.set(a.dueDate, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const fmtH = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
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
      pageTitle={t("activities")}
    >
      {/* Time tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
        {[
          { id: "today", label: isAr ? "اليوم" : "Today" },
          { id: "working5", label: isAr ? "آخر 5 أيام عمل" : "Last 5 Working Days" },
          { id: "thisMonth", label: isAr ? "هذا الشهر" : "This Month" },
          { id: "upcoming", label: isAr ? "القادمة" : "Upcoming" },
          { id: "past", label: isAr ? "السابقة" : "Past" },
          { id: "all", label: isAr ? "كل الأوقات" : "All Time" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTimeTab(tab.id as any)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              timeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
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
          {owners.map((o) => (
            <button
              key={o}
              onClick={() => setOwner(o)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${owner === o ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border hover:bg-accent"}`}
            >
              {o === "all" ? t("all") : o.split(" ")[0]}
            </button>
          ))}
        </div>
        {/* Kind of Activity Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none"
        >
          <option value="all">{isAr ? "نوع النشاط: الكل" : "Activity Type: All"}</option>
          <option value="Call">{isAr ? "مكالمة (Call)" : "Call"}</option>
          <option value="Meeting">{isAr ? "اجتماع (Meeting)" : "Meeting"}</option>
          <option value="Site Visit">{isAr ? "زيارة موقع (Site Visit)" : "Site Visit"}</option>
          <option value="Follow-up">{isAr ? "متابعة (Follow-up)" : "Follow-up"}</option>
          <option value="Inspection">{isAr ? "معاينة (Inspection)" : "Inspection"}</option>
          <option value="Email">{isAr ? "بريد إلكتروني (Email)" : "Email"}</option>
        </select>
        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none"
        >
          <option value="all">
            {t("status")}: {t("all")}
          </option>
          <option value="pending">{t("pending")}</option>
          <option value="in_progress">{t("inProgress")}</option>
          <option value="done">{t("done")}</option>
          <option value="cancelled">{t("cancelled")}</option>
          <option value="delayed">{t("delayed")}</option>
        </select>
        <div className="ms-auto flex items-center gap-2">
          <button
            disabled
            title={
              isAr
                ? "نعتذر – هذا الخيار غير متاح حالياً. شكراً لتفهمكم."
                : "We apologise – this option is currently not working. Thanks for your understanding."
            }
            className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-medium opacity-40"
          >
            <Download className="h-3.5 w-3.5 rotate-180" /> {t("importExcel")}
          </button>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> {t("addActivity")}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["pending", "in_progress", "done", "cancelled", "delayed"] as ActivityStatus[]).map(
          (s) => {
            const count = teamActivities.filter((a) => {
              if (a.status !== s) return false;
              if (owner !== "all" && a.owner !== owner) return false;
              if (typeFilter !== "all" && !matchesActivityType(a.type, typeFilter)) return false;
              if (timeTab === "today") return a.dueDate === today;
              if (timeTab === "working5") return working5Days.has(a.dueDate);
              if (timeTab === "thisMonth") return a.dueDate.startsWith(currentMonth);
              if (timeTab === "upcoming") return a.dueDate > today;
              if (timeTab === "past") return a.dueDate < today;
              return true;
            }).length;
            return (
              <div
                key={s}
                className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
              >
                <div className={`text-2xl font-bold ${STATUS_TONE[s]}`}>{count}</div>
                <div className="mt-1 text-xs capitalize text-muted-foreground">
                  {s.replace("_", " ")}
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* Activity list */}
      {view === "table" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>{t("title")}</TableHead>
                  <TableHead>{t("owner")}</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  {/* <TableHead>Approval</TableHead> */}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const Icon = ICONS[a.type] ?? Circle;
                  const SIcon = STATUS_ICON[a.status];
                  const lead = leads.find((l) => l.id === a.leadId);
                  const project = projects.find((p) => p.id === a.projectId);
                  const leadDisplayName = lead?.company || lead?.code || project?.name || "-";
                  const isOpen = expanded.has(a.id);
                  return (
                    <React.Fragment key={a.id}>
                      <TableRow>
                        <TableCell>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground">{a.title}</div>
                          <div className="text-xs text-muted-foreground">{a.type}</div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const ownerName = a.createdByName ?? a.owner ?? "Unassigned";
                            const photo = getOwnerPhoto(ownerName, a.createdByPhoto);
                            return (
                              <div className="flex items-center gap-2">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt=""
                                    className="h-5 w-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[8px] font-bold text-foreground">
                                    {ownerName
                                      .split(" ")
                                      .map((w) => w[0])
                                      .join("")
                                      .slice(0, 2)}
                                  </div>
                                )}
                                <span className="text-sm text-muted-foreground">{ownerName}</span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(a.dueDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.time}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {leadDisplayName}
                        </TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_TONE[a.status]}`}
                          >
                            <SIcon className="h-3.5 w-3.5" />
                            <select
                              value={a.status}
                              onChange={(e) =>
                                actions.setActivityStatus(a.id, e.target.value as ActivityStatus)
                              }
                              className={`bg-transparent text-xs font-semibold capitalize focus:outline-none cursor-pointer ${STATUS_TONE[a.status]}`}
                              title="Change status"
                            >
                              <option value="pending">Postponed</option>
                              <option value="in_progress">In progress</option>
                              <option value="done">Done</option>
                              <option value="cancelled">Not Done</option>
                              <option value="delayed">Delayed</option>
                            </select>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => toggle(a.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border hover:bg-accent"
                          >
                            {isOpen ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" /> Hide
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5" /> Review
                              </>
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="border-t border-border bg-secondary/30 p-4"
                          >
                            <ActivityApprovalCard activity={a} canApprove={canApprove} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      {t("nothingHere")}
                    </TableCell>
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
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                  {date}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {items.length} item(s) · {fmtH(items.reduce((s, a) => s + (a.estMinutes ?? 0), 0))}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map((a) => {
                  const Icon = ICONS[a.type] ?? Circle;
                  const SIcon = STATUS_ICON[a.status];
                  const lead = leads.find((l) => l.id === a.leadId);
                  const isOpen = expanded.has(a.id);
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex flex-wrap items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground">{a.title}</div>
                          {(() => {
                            const ownerName = a.createdByName ?? a.owner ?? "Unassigned";
                            const photo = getOwnerPhoto(ownerName, a.createdByPhoto);
                            return (
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt=""
                                    className="h-4 w-4 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[8px] font-bold text-foreground">
                                    {ownerName
                                      .split(" ")
                                      .map((w) => w[0])
                                      .join("")
                                      .slice(0, 2)}
                                  </div>
                                )}
                                <span>
                                  {ownerName} · {a.time}
                                  {lead ? ` · ${lead.company}` : ""}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        <div
                          className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_TONE[a.status]}`}
                        >
                          <SIcon className="h-4 w-4" />
                          <select
                            value={a.status}
                            onChange={(e) =>
                              actions.setActivityStatus(a.id, e.target.value as ActivityStatus)
                            }
                            className={`bg-transparent text-xs font-semibold capitalize focus:outline-none cursor-pointer ${STATUS_TONE[a.status]}`}
                            title="Change status"
                          >
                            <option value="pending">Postponed</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Done</option>
                            <option value="cancelled">Not Done</option>
                            <option value="delayed">Delayed</option>
                          </select>
                        </div>

                        {/* {a.approvalStatus === "pending" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                            Pending
                          </span>
                        )}
                        {a.approvalStatus === "approved" && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Approved
                          </span>
                        )}
                        {a.approvalStatus === "rejected" && (
                          <span
                            className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700"
                            title={a.rejectionReason}
                          >
                            Rejected
                          </span>
                        )} */}
                        <button
                          onClick={() => toggle(a.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border hover:bg-accent"
                        >
                          {isOpen ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" /> Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" /> Review
                            </>
                          )}
                        </button>
                      </div>
                      {isOpen && (
                        <div className="border-t border-border px-4 pb-4">
                          <ActivityApprovalCard activity={a} canApprove={canApprove} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              {t("nothingHere")}
            </div>
          )}
        </div>
      )}
      {open && <NewActivityDialog onClose={() => setOpen(false)} />}
      {showImport && <ExcelImportModal type="activities" onClose={() => setShowImport(false)} />}
    </AppShell>
  );
}
