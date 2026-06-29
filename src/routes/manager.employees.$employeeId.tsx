import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { CopyIdButton } from "@/components/CopyIdButton";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { actions, useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import {
  ArrowLeft,
  Mail,
  Phone,
  Users2,
  Activity as ActivityIcon,
  Plus,
  X,
  Timer,
  Clock4,
  UserCog,
  History as HistoryIcon,
  Search,
  Filter as FilterIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/manager/employees/$employeeId")({
  component: ManagerEmployeeDetailsPage,
  head: ({ params }) => ({ meta: [{ title: `${params.employeeId} · INT-CRM` }] }),
});

const DEPT_COLORS: Record<string, string> = {
  Sales: "bg-sky-100 text-sky-700",
  Technical: "bg-violet-100 text-violet-700",
  Operations: "bg-amber-100 text-amber-700",
  HR: "bg-rose-100 text-rose-700",
  Projects: "bg-emerald-100 text-emerald-700",
};

function ManagerEmployeeDetailsPage() {
  const { employeeId } = Route.useParams();
  const { t } = useI18n();
  const router = useRouter();
  const { leads, activities, settings, history } = useStoreState();
  const { teamEmployees: employees } = useMyTeam();
  const emp = employees.find((e) => e.id === employeeId);
  const user = {
    name: "",
    role: t("manager"),
    initials: "HR",
    photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };
  const [showAddLead, setShowAddLead] = useState(false);
  const [reassignFor, setReassignFor] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const empLeads = emp ? leads.filter((l: any) => l.owner === emp.name) : [];
  const empActivities = emp ? activities.filter((a) => a.owner === emp.name) : [];
  const won = empLeads.filter((l: any) => l.status === "won").length;

  const sources = Array.from(
    new Set(empLeads.map((l: any) => l.source).filter(Boolean)),
  ) as string[];
  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return empLeads.filter((l: any) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (q) {
        const blob = `${l.company} ${l.contact} ${l.industry} ${l.city} ${l.id}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      const refDate = (l as any).expectedCloseDate as string | undefined;
      if (fromDate && refDate && refDate < fromDate) return false;
      if (toDate && refDate && refDate > toDate) return false;
      return true;
    });
  }, [empLeads, search, statusFilter, sourceFilter, fromDate, toDate]);

  // Timeline: lead reassignments / status changes + activities for this member
  const empName = emp?.name ?? "";
  const empLeadCompanies = new Set(empLeads.map((l: any) => l.company));
  const timeline = useMemo(() => {
    return history
      .filter(
        (h) =>
          (h.module === "lead" || h.module === "pipeline") &&
          (h.actor === empName ||
            empLeadCompanies.has(h.target) ||
            (h.action === "Reassigned lead" && (h.details ?? "").includes(empName))),
      )
      .slice(0, 40);
  }, [history, empName, empLeadCompanies]);

  // Structured audit rows: reassignments + status moves, with prev/new owners/values
  type AuditRow = {
    id: string;
    ts: string;
    kind: "reassign" | "status";
    target: string;
    leadId?: string;
    from: string;
    to: string;
    actor: string;
  };
  const auditRows = useMemo<AuditRow[]>(() => {
    const companyToLead = new Map(leads.map((l: any) => [l.company, l.id]));
    return history
      .filter((h) => h.action === "Reassigned lead" || h.action.startsWith("Moved to"))
      .filter(
        (h) =>
          empLeadCompanies.has(h.target) ||
          (h.action === "Reassigned lead" && (h.details ?? "").includes(empName)),
      )
      .map((h) => {
        const kind: "reassign" | "status" = h.action === "Reassigned lead" ? "reassign" : "status";
        let from = "",
          to = "";
        const m = (h.details ?? "").match(/^(.+?)\s*(?:→|->)\s*(.+)$/);
        if (m) {
          from = m[1].trim();
          to = m[2].trim();
        } else if (kind === "status") {
          to = h.action.replace(/^Moved to\s+/i, "");
        }
        return {
          id: h.id,
          ts: h.ts,
          kind,
          target: h.target,
          leadId: companyToLead.get(h.target) as string | undefined,
          from,
          to,
          actor: h.actor ?? "System",
        };
      })
      .slice(0, 50);
  }, [history, leads, empName, empLeadCompanies]);

  if (!emp) {
    return (
      <AppShell panel="manager" user={user} pageTitle="Employee">
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Employee <span className="font-mono">{employeeId}</span> not found.
          </p>
          <Link
            to="/manager/employees"
            className="mt-3 inline-block text-sm font-semibold text-primary"
          >
            {t("backToEmployees")}
          </Link>
        </div>
      </AppShell>
    );
  }

  const teamMembers = employees.filter((e) => e.id !== emp.id).map((e) => e.name);

  const fmtH = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return mins ? (h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`) : "0";
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <AppShell panel="manager" user={user} pageTitle={emp.name}>
      <button
        onClick={() => router.history.back()}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> {t("backToEmployees")}
      </button>

      {/* Member Info */}
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
            <span
              className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                DEPT_COLORS[emp.department] ?? "bg-secondary text-foreground"
              }`}
            >
              {emp.department}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <Stat label={t("leads")} value={empLeads.length} />
            <Stat label={t("won")} value={won} />
            <Stat label={t("performance")} value={`${emp.perf}%`} />
          </div>
        </div>
      </div>

      {/* Related Leads */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              {t("relatedLeads")} ({filteredLeads.length}/{empLeads.length})
            </h3>
          </div>
          <button
            onClick={() => setShowAddLead(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> {t("addLead")}
          </button>
        </div>

        {/* Filters bar */}
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, contact, city..."
              className="h-9 w-full rounded-lg border border-border bg-background ps-8 pe-3 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="all">All statuses</option>
            {settings.statuses.map((s: string) => {
              const stage = settings.stages.find((st) => st.key === s);
              return (
                <option key={s} value={s}>
                  {stage?.label ?? s}
                </option>
              );
            })}
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
          />
        </div>
        {(search || statusFilter !== "all" || sourceFilter !== "all" || fromDate || toDate) && (
          <button
            onClick={resetFilters}
            className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <FilterIcon className="h-3 w-3" /> Reset filters
          </button>
        )}

        {filteredLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {empLeads.length === 0 ? t("noLeadsAssigned") : "No leads match the filters."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filteredLeads.map((l: any) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 py-3 hover:bg-primary/5">
                <Link
                  to="/manager/leads/$leadId"
                  params={{ leadId: l.id }}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="w-20 font-mono text-xs text-muted-foreground">
                    {shortId(l.id)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-foreground">{l.company}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.contact} · {l.industry} · {l.city}
                    </div>
                  </div>
                  <StatusBadge status={l.status} label={t(l.status as any)} />
                  <span className="ms-3 font-mono text-sm font-bold text-foreground">
                    {fmtMoney(l.value)}
                  </span>
                </Link>
                <button
                  onClick={() => setReassignFor(l.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <UserCog className="h-3 w-3" /> Reassign
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment & Status Changes Timeline */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center gap-2">
          <HistoryIcon className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            Lead assignment & status timeline ({timeline.length})
          </h3>
        </div>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No assignment or status changes recorded yet.
          </p>
        ) : (
          <ol className="relative space-y-3 border-s-2 border-border ps-4">
            {timeline.map((h) => {
              const relLead = leads.find((l: any) => l.company === h.target);
              return (
                <li key={h.id} className="relative">
                  <span className="absolute -start-[22px] top-2 h-3 w-3 rounded-full bg-primary ring-2 ring-card" />
                  <div className="rounded-lg border border-border bg-background px-3 py-2 transition hover:border-primary/50 hover:bg-primary/5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">{h.action}</span>
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">
                        {h.ts.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {relLead ? (
                        <Link
                          to="/manager/leads/$leadId"
                          params={{ leadId: relLead.id }}
                          className="font-semibold text-primary hover:underline"
                        >
                          {h.target}
                          <span className="ms-1 font-mono text-[10px] text-muted-foreground">
                            ({shortId(relLead.id)})
                          </span>
                        </Link>
                      ) : (
                        <span className="font-semibold text-foreground">{h.target}</span>
                      )}
                      {h.details ? <> · {h.details}</> : null}
                      <> · by {h.actor}</>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Audit Trail — Reassignments & Status Changes (actor, ts, prev/new) */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            Audit trail ({auditRows.length})
          </h3>
        </div>
        {auditRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reassignments or status changes recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-3 py-2 text-start text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    When
                  </th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Type
                  </th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Lead
                  </th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    From
                  </th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    To
                  </th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Actor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditRows.map((r) => (
                  <tr key={r.id} className="hover:bg-primary/5">
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {r.ts.slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          r.kind === "reassign"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {r.kind === "reassign" ? "Reassignment" : "Status"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.leadId ? (
                        <Link
                          to="/manager/leads/$leadId"
                          params={{ leadId: r.leadId }}
                          className="font-semibold text-primary hover:underline"
                        >
                          {r.target}
                        </Link>
                      ) : (
                        <span className="font-semibold text-foreground">{r.target}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.from || "—"}</td>
                    <td className="px-3 py-2 font-semibold text-foreground">{r.to || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.actor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Related Activities */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            {t("assignedActivities")} ({empActivities.length})
          </h3>
        </div>
        {empActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noActivitiesOwned")}</p>
        ) : (
          <div className="space-y-2">
            {empActivities.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {a.type}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    <Clock4 className="me-1 inline h-3 w-3" />
                    {a.dueDate} {a.time}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddLead && (
        <QuickLeadModal
          owner={emp.name}
          cities={settings.locations.map((c) => c.name)}
          onClose={() => setShowAddLead(false)}
        />
      )}
      {reassignFor && (
        <ReassignLeadModal
          leadId={reassignFor}
          currentOwner={emp.name}
          members={teamMembers}
          onClose={() => setReassignFor(null)}
        />
      )}
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: any;
  tone?: string;
}) {
  return (
    <div>
      <div className={`font-mono text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function ReassignLeadModal({
  leadId,
  currentOwner,
  members,
  onClose,
}: {
  leadId: string;
  currentOwner: string;
  members: string[];
  onClose: () => void;
}) {
  const [newOwner, setNewOwner] = useState(members[0] ?? "");
  const submit = () => {
    if (!newOwner || newOwner === currentOwner) return;
    actions.reassignLead(leadId, newOwner);
    toast.success(`Lead ${leadId} reassigned to ${newOwner}`, {
      description: `${newOwner} has been notified across all panels.`,
    });
    onClose();
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">Reassign lead</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Lead <span className="font-mono font-semibold text-foreground">{leadId}</span> currently
          owned by <span className="font-semibold text-foreground">{currentOwner}</span>.
        </p>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          New owner
        </label>
        <select
          value={newOwner}
          onChange={(e) => setNewOwner(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
        >
          {members.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!newOwner || newOwner === currentOwner}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:opacity-90 disabled:opacity-50"
          >
            Reassign & notify
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickLeadModal({
  owner,
  cities,
  onClose,
}: {
  owner: string;
  cities: string[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { projects } = useStoreState();
  const [projectId, setProjectId] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [value, setValue] = useState(0);
  const [city, setCity] = useState(cities[0] ?? "");
  const [street, setStreet] = useState("");
  const [errors, setErrors] = useState<{ company?: string; email?: string; city?: string }>({});

  const selectedProject = projects.find((p) => p.id === projectId);

  const onProjectChange = (pid: string) => {
    setProjectId(pid);
    const p = projects.find((x) => x.id === pid);
    if (p) {
      setCompany(p.name);
      setContact(p.client);
      setIndustry(p.category);
      setValue(p.offeredValue ?? p.budget ?? 0);
      if (p.clientEmail) setEmail(p.clientEmail);
      setErrors((prev) => ({ ...prev, company: undefined }));
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!company.trim()) e.company = "Project is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Invalid email format";
    if (!city.trim()) e.city = "City is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    actions.addLead({
      company: company.trim(),
      contact: contact.trim(),
      email: email.trim(),
      industry: industry.trim(),
      source: "Website",
      status: "new",
      value,
      city,
      street,
      owner,
      lat: 30.0444,
      lng: 31.2357,
    } as any);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{t("addLead")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("owner") ?? "Owner"}:{" "}
              <span className="font-semibold text-foreground">{owner}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Account" error={errors.company} required>
            <select
              value={projectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className={`h-9 w-full rounded-lg border bg-background px-2 text-sm ${errors.company ? "border-destructive" : "border-border"}`}
            >
              <option value="">Select account…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Client">
            <input
              value={contact}
              readOnly={!!selectedProject}
              onChange={(e) => setContact(e.target.value)}
              placeholder={selectedProject ? "" : "Auto-filled from account"}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm read-only:bg-muted/40 read-only:text-muted-foreground"
            />
          </Field>
          <Field label={t("companyEmail") ?? "Email"} error={errors.email}>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
              className={`h-9 w-full rounded-lg border bg-background px-3 text-sm ${errors.email ? "border-destructive" : "border-border"}`}
            />
          </Field>
          <div className="hidden">
            <Field label={t("industry")}>
              <input
                value={industry}
                readOnly={!!selectedProject}
                onChange={(e) => setIndustry(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm read-only:bg-muted/40 read-only:text-muted-foreground"
              />
            </Field>
          </div>
          <Field label={`${t("value")} ($)`}>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label={t("city") ?? "City"} error={errors.city} required>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (errors.city) setErrors((p) => ({ ...p, city: undefined }));
              }}
              className={`h-9 w-full rounded-lg border bg-background px-2 text-sm ${errors.city ? "border-destructive" : "border-border"}`}
            >
              <option value="">— Select city —</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("streetName") ?? "Street"}>
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            {t("cancel") ?? "Cancel"}
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:opacity-90"
          >
            {t("save") ?? "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ms-1 text-destructive">*</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-[11px] font-medium text-destructive">{error}</span>
      )}
    </label>
  );
}
