import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState } from "@/lib/store";
import { useMemo, useState } from "react";
import { Phone, Users2, MapPin, Mail, ClipboardCheck, RefreshCw, Circle, PlayCircle, CheckCircle2, X, Plus, ChevronDown, ChevronUp, LayoutList, Grid3X3 } from "lucide-react";
import type { ActivityStatus } from "@/lib/store";
import { NewActivityDialog } from "@/components/NewActivityDialog";
import { ActivityApprovalCard } from "@/components/ActivityApprovalCard";
import { useRole } from "@/lib/role";
import { cairoIsoDate } from "@/lib/cairoTime";
import { useMyTeam } from "@/lib/useMyTeam";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";


export const Route = createFileRoute("/manager/activities")({
  component: ManagerActivitiesPage,
  head: () => ({ meta: [{ title: "Team Activities · INT-CRM" }] }),
});

const ICONS: Record<string, any> = {
  Call: Phone, Meeting: Users2, "Site Visit": MapPin, "Follow-up": RefreshCw, Inspection: ClipboardCheck, Email: Mail,
};
const STATUS_ICON: Record<ActivityStatus, any> = { pending: Circle, in_progress: PlayCircle, done: CheckCircle2, cancelled: X, delayed: Circle };
const STATUS_TONE: Record<ActivityStatus, string> = {
  pending: "text-muted-foreground", in_progress: "text-amber-600", done: "text-emerald-600", cancelled: "text-rose-600", delayed: "text-sky-600",
};

function ManagerActivitiesPage() {
  const { t } = useI18n();
  const { activities, leads } = useStoreState();
  const [view, setView] = useState<"table" | "cards">("table");
  const [owner, setOwner] = useState("all");
  const [status, setStatus] = useState<"all" | ActivityStatus>("all");
  const [timeTab, setTimeTab] = useState<"today" | "upcoming" | "past">("today");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const { isAdmin, isManager } = useRole();
  const canApprove = isAdmin || isManager;
  const today = cairoIsoDate();
  const { teamEmployees, teamNames } = useMyTeam({ forceTeam: true });

  const teamProfileIds = useMemo(() => new Set(teamEmployees.map((e: any) => e.id)), [teamEmployees]);

  const teamActivities = useMemo(() => activities.filter((a) => {
    if (a.owner && teamNames.has(a.owner)) return true;
    if (a.ownerId && teamProfileIds.has(a.ownerId)) return true;
    if (Array.isArray(a.presalesTeam) && a.presalesTeam.some((name: string) => teamNames.has(name))) return true;
    if (Array.isArray(a.presalesIds) && a.presalesIds.some((id: string) => teamProfileIds.has(id))) return true;
    if (a.createdByName && teamNames.has(a.createdByName)) return true;
    return false;
  }), [activities, teamNames, teamProfileIds]);

  const owners = ["all", ...Array.from(new Set(teamActivities.map((a) => a.owner)))];

  const filtered = useMemo(() => {
    const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, done: 2, cancelled: 3 };
    return teamActivities
      .filter((a) => (owner === "all" || a.owner === owner) && (status === "all" || a.status === status))
      .filter((a) => {
        if (timeTab === "today") return a.dueDate === today;
        if (timeTab === "upcoming") return a.dueDate > today;
        return a.dueDate < today;
      })
      .sort((a, b) => {
        const ord = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        if (ord !== 0) return ord;
        return (a.dueDate + a.time).localeCompare(b.dueDate + b.time);
      });
  }, [teamActivities, owner, status, timeTab, today]);


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
    const h = Math.floor(mins / 60); const m = mins % 60;
    return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
  };

  return (
    <AppShell panel="manager" user={{ name: "hafez Rahim", role: t("manager"), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" }} pageTitle={t("activities")}>
      {/* Time tabs */}
      <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
        {([
          { id: "today", label: "Today" },
          { id: "upcoming", label: "Upcoming" },
          { id: "past", label: "Past" },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTimeTab(tab.id)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${timeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
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
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="h-9 rounded-lg border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="all">{t("all")} — {t("status")}</option>
          <option value="pending">{t("pending")}</option>
          <option value="in_progress">{t("inProgress")}</option>
          <option value="done">{t("done")}</option>
          <option value="cancelled">{t("cancelled")}</option>
          <option value="delayed">{t("delayed")}</option>
        </select>
        <button onClick={() => setOpen(true)} className="ms-auto inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90">
          <Plus className="h-4 w-4" /> {t("addActivity")}
        </button>
      </div>


      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["pending", "in_progress", "done", "cancelled", "delayed"] as ActivityStatus[]).map((s) => {
          const count = teamActivities.filter((a) => a.status === s && (owner === "all" || a.owner === owner)).length;
          return (
            <div key={s} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className={`text-2xl font-bold ${STATUS_TONE[s]}`}>{count}</div>
              <div className="mt-1 text-xs capitalize text-muted-foreground">{s.replace("_", " ")}</div>
            </div>
          );
        })}
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
                  <TableHead>Approval</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const Icon = ICONS[a.type] ?? Circle;
                  const SIcon = STATUS_ICON[a.status];
                  const lead = leads.find((l) => l.id === a.leadId);
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
                          <div className="flex items-center gap-2">
                            {a.createdByPhoto ? (
                              <img src={a.createdByPhoto} alt="" className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[8px] font-bold text-foreground">
                                {(a.createdByName ?? a.owner).split(" ").map(w => w[0]).join("").slice(0, 2)}
                              </div>
                            )}
                            <span className="text-sm text-muted-foreground">{a.createdByName ?? a.owner}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.dueDate}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.time}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{lead?.company ?? "—"}</TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_TONE[a.status]}`}>
                            <SIcon className="h-3.5 w-3.5" />
                            <select
                              value={a.status}
                              onChange={(e) => actions.setActivityStatus(a.id, e.target.value as ActivityStatus)}
                              className={`bg-transparent text-xs font-semibold capitalize focus:outline-none cursor-pointer ${STATUS_TONE[a.status]}`}
                              title="Change status"
                            >
                              <option value="pending">Postponed</option>
                              <option value="in_progress">In progress</option>
                              <option value="done">Attended</option>
                              <option value="cancelled">Not Attended</option>
                              <option value="delayed">Delayed</option>
                            </select>
                          </div>
                        </TableCell>
                        <TableCell>
                          {a.approvalStatus === "pending" && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
                          )}
                          {a.approvalStatus === "approved" && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Approved</span>
                          )}
                          {a.approvalStatus === "rejected" && (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700" title={a.rejectionReason}>Rejected</span>
                          )}
                          {!a.approvalStatus && <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => toggle(a.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border hover:bg-accent"
                          >
                            {isOpen ? <><ChevronUp className="h-3.5 w-3.5" /> Hide</> : <><ChevronDown className="h-3.5 w-3.5" /> Review</>}
                          </button>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={9} className="border-t border-border bg-secondary/30 p-4">
                            <ActivityApprovalCard activity={a} canApprove={canApprove} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">{t("nothingHere")}</TableCell>
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
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{date}</h3>
                <span className="text-xs text-muted-foreground">{items.length} item(s) · {fmtH(items.reduce((s, a) => s + (a.estMinutes ?? 0), 0))}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map((a) => {
                  const Icon = ICONS[a.type] ?? Circle;
                  const SIcon = STATUS_ICON[a.status];
                  const lead = leads.find((l) => l.id === a.leadId);
                  const isOpen = expanded.has(a.id);
                  return (
                    <div key={a.id} className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
                      <div className="flex flex-wrap items-center gap-4 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-foreground">{a.title}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {a.createdByPhoto ? (
                              <img src={a.createdByPhoto} alt="" className="h-4 w-4 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[8px] font-bold text-foreground">
                                {(a.createdByName ?? a.owner).split(" ").map(w => w[0]).join("").slice(0, 2)}
                              </div>
                            )}
                            <span>{a.createdByName ?? a.owner} · {a.time}{lead ? ` · ${lead.company}` : ""}</span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-semibold ${STATUS_TONE[a.status]}`}>
                          <SIcon className="h-4 w-4" />
                          <select
                            value={a.status}
                            onChange={(e) => actions.setActivityStatus(a.id, e.target.value as ActivityStatus)}
                            className={`bg-transparent text-xs font-semibold capitalize focus:outline-none cursor-pointer ${STATUS_TONE[a.status]}`}
                            title="Change status"
                          >
                            <option value="pending">Postponed</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Attended</option>
                            <option value="cancelled">Not Attended</option>
                            <option value="delayed">Delayed</option>
                          </select>
                        </div>

                        {a.approvalStatus === "pending" && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending</span>
                        )}
                        {a.approvalStatus === "approved" && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Approved</span>
                        )}
                        {a.approvalStatus === "rejected" && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700" title={a.rejectionReason}>Rejected</span>
                        )}
                        <button
                          onClick={() => toggle(a.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border hover:bg-accent"
                        >
                          {isOpen ? <><ChevronUp className="h-3.5 w-3.5" /> Hide</> : <><ChevronDown className="h-3.5 w-3.5" /> Review</>}
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
    </AppShell>
  );
}
