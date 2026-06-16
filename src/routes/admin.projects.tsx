import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ProjectRequestsPanel } from "@/components/ProjectRequestsPanel";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { actions, useStoreState } from "@/lib/store";
import type { Project } from "@/lib/store";
import { useRole } from "@/lib/role";
import { Plus, Users2, Pencil, Trash2, X, LayoutGrid, Table as TableIcon, Filter, Download, Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { PhoneInput } from "@/components/PhoneInput";

export const Route = createFileRoute("/admin/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects · INT-CRM" }] }),
});

const STATUSES = ["On Track", "At Risk", "Delayed", "Completed"];

function ProjectsPage() {
  const { t } = useI18n();
  const { projects } = useStoreState();
  const { role, isAdmin, isManager } = useRole();
  const canManage = isAdmin || isManager;

  const user = { name: "hafez Rahim", role: t(role as any), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" };
  const isDetailRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith("/admin/projects/"),
  });
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [view, setView] = useState<"table" | "grid">("table");

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minBudget, setMinBudget] = useState<string>("");
  const [maxBudget, setMaxBudget] = useState<string>("");
  const [minProgress, setMinProgress] = useState<string>("");
  const [maxProgress, setMaxProgress] = useState<string>("");

  const clients = Array.from(new Set(projects.map((p) => p.client).filter(Boolean)));

  const minB = minBudget ? Number(minBudget) : null;
  const maxB = maxBudget ? Number(maxBudget) : null;
  const minP = minProgress ? Number(minProgress) : null;
  const maxP = maxProgress ? Number(maxProgress) : null;

  const filtered = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (clientFilter !== "all" && p.client !== clientFilter) return false;
    if (minB !== null && p.budget < minB) return false;
    if (maxB !== null && p.budget > maxB) return false;
    if (minP !== null && p.progress < minP) return false;
    if (maxP !== null && p.progress > maxP) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q) && !shortId(p.id).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (p: Project): string | number => {
      switch (sortKey) {
        case "id": return shortId(p.id);
        case "name": return p.name;
        case "client": return p.client;
        case "status": return p.status;
        case "progress": return p.progress;
        case "team": return p.team;
        case "budget": return p.budget;
        default: return "";
      }
    };
    arr.sort((a, b) => {
      const va = get(a), vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).toLowerCase().localeCompare(String(vb).toLowerCase()) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (clientFilter !== "all" ? 1 : 0) +
    (minBudget ? 1 : 0) + (maxBudget ? 1 : 0) +
    (minProgress ? 1 : 0) + (maxProgress ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all"); setClientFilter("all");
    setMinBudget(""); setMaxBudget("");
    setMinProgress(""); setMaxProgress("");
    setQuery("");
  };

  const handleExport = () => {
    if (filtered.length === 0) { toast.error("No projects match your filters"); return; }
    const rows = filtered.map((p) => ({
      ID: shortId(p.id),
      Name: p.name,
      Client: p.client,
      Category: p.category ?? "",
      Status: p.status,
      Progress: p.progress,
      Budget: p.budget,
      OfferedValue: p.offeredValue ?? 0,
      Team: p.team,
      LastUpdate: p.lastUpdate ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Accounts");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `accounts-${stamp}.xlsx`);
    toast.success(`${filtered.length} accounts exported`);
  };

  if (isDetailRoute) {
    return <Outlet />;
  }

  return (
    <AppShell panel={role} user={user} pageTitle={t("projects")}>
      <div className="mb-4"><ProjectRequestsPanel mode="approver" /></div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="h-10 w-full rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ paddingInlineStart: "2.25rem", paddingInlineEnd: "0.75rem" }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label={t("filterByStatus")}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">{t("filterByStatus")}: {t("all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            aria-label={t("client")}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">{t("client")}: {t("all")}</option>
            {clients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${showAdvanced || activeFilterCount > 0 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:bg-accent"}`}
          >
            <Filter className="h-4 w-4" /> {t("filters")}
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{activeFilterCount}</span>
            )}
          </button>
          <button onClick={handleExport} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent">
            <Download className="h-4 w-4" /> {t("export")}
          </button>
          {canManage && (
            <button onClick={() => setEditing("new")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90">
              <Plus className="h-4 w-4" /> {t("addProject")}
            </button>
          )}
        </div>
      </div>

      {showAdvanced && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Advanced filters</div>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                <X className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="text-xs font-semibold text-muted-foreground">
              Min budget
              <input type="number" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} placeholder="0" className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Max budget
              <input type="number" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} placeholder="∞" className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Min progress %
              <input type="number" min={0} max={100} value={minProgress} onChange={(e) => setMinProgress(e.target.value)} placeholder="0" className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Max progress %
              <input type="number" min={0} max={100} value={maxProgress} onChange={(e) => setMaxProgress(e.target.value)} placeholder="100" className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </label>
          </div>
        </div>
      )}

      {/* View toggle */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
          <button
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${view === "table" ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" : "text-muted-foreground hover:text-foreground"}`}
          >
            <TableIcon className="h-4 w-4" /> {t("tableView")}
          </button>
          <button
            onClick={() => setView("grid")}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${view === "grid" ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" /> {t("gridView")}
          </button>
        </div>
        <div className="text-sm text-muted-foreground">{filtered.length} {t("projects")}</div>
      </div>

      {view === "table" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {([
                    ["id", "ID", "text-start"],
                    ["name", t("name"), "text-start"],
                    ["client", t("client"), "text-start"],
                    ["status", t("status"), "text-start"],
                    ["progress", t("progress"), "text-start"],
                    ["team", t("team"), "text-start"],
                    ["budget", t("budget"), "text-end justify-end"],
                  ] as const).map(([k, label, align]) => (
                    <th key={k} className={`px-3 py-3 ${align}`}>
                      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 uppercase hover:text-foreground">
                        <span>{label}</span>
                        {sortKey === k ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-end">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((p) => (
                  <tr key={p.id} className="hover:bg-primary/5">
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      <Link to="/admin/projects/$projectId" params={{ projectId: p.id }} className="hover:text-primary">{shortId(p.id)}</Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to="/admin/projects/$projectId" params={{ projectId: p.id }} className="font-semibold text-foreground hover:text-primary">{p.name}</Link>
                      {p.category && <div className="text-[11px] text-muted-foreground">{p.category}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{p.client}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.progress}%`,
                              background: p.status === "Delayed" ? "oklch(0.62 0.22 27)" : p.status === "At Risk" ? "oklch(0.78 0.15 80)" : "oklch(0.706 0.181 49.5)",
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users2 className="h-3 w-3" />{p.team}</span>
                    </td>
                    <td className="px-3 py-2.5 text-end font-mono font-semibold text-primary">{fmtMoney(p.budget)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(p)} aria-label={t("edit")} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (confirm(`${t("confirmDelete")} (${p.name})`)) actions.removeProject(p.id); }} aria-label={t("delete")} className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">—</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((p) => (
          <div key={p.id} className="group relative rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg">
            <Link to="/admin/projects/$projectId" params={{ projectId: p.id }} className="block">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{shortId(p.id)} {p.category && `· ${p.category}`}</div>
                  <h3 className="mt-1 font-display text-base font-bold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.client}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>

              {p.competitors && p.competitors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.competitors.map(c => (
                    <span key={c} className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-600 ring-1 ring-inset ring-rose-200">
                      VS {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("progress")}</span>
                  <span className="font-mono font-bold text-foreground">{p.progress}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.progress}%`,
                      background:
                        p.status === "Delayed"
                          ? "oklch(0.62 0.22 27)"
                          : p.status === "At Risk"
                            ? "oklch(0.78 0.15 80)"
                            : "oklch(0.706 0.181 49.5)",
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users2 className="h-3.5 w-3.5" />
                  <span>{p.team} {t("members")}</span>
                </div>
                <div className="text-end">
                  <div className="font-mono font-bold text-primary">{fmtMoney(p.budget)}</div>
                  {p.offeredValue && <div className="text-[9px] text-muted-foreground uppercase">{t("offeredValue")}: {fmtMoney(p.offeredValue)}</div>}
                </div>
              </div>
            </Link>
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <button onClick={() => setEditing(p)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-semibold hover:bg-accent">
                <Pencil className="h-3 w-3" /> {t("edit")}
              </button>
              <button onClick={() => { if (confirm(`${t("confirmDelete")} (${p.name})`)) actions.removeProject(p.id); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100">
                <Trash2 className="h-3 w-3" /> {t("delete")}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No projects match your filters.</div>
        )}
        </div>
      )}


      {editing && (
        <ProjectFormModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </AppShell>
  );
}

const PROJECT_TYPES = [
  "Fit-out",
  "Renovation",
  "MEP",
  "Construction",
  "Interior Design",
  "Maintenance",
  "Consultancy",
  "Architecture",
  "Landscaping",
  "Civil Works",
  "Structural",
  "HVAC",
  "Electrical",
  "Plumbing",
  "Finishing",
  "Joinery & Carpentry",
  "Facade & Cladding",
  "Flooring",
  "Painting",
  "Smart Home / IoT",
  "Security Systems",
  "Solar / Renewables",
  "Demolition",
  "Project Management",
  "Feasibility Study",
  "Other",
];

function ProjectFormModal({ initial, onClose }: { initial: Project | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { settings, employees } = useStoreState();
  const isAr = lang === "ar";


  const [name, setName] = useState(initial?.name ?? "");
  const [projectType, setProjectType] = useState(initial?.projectType ?? "");
  const [budget, setBudget] = useState(initial?.budget ?? 0);
  const [startDate, setStartDate] = useState<string>((initial as any)?.startDate ?? "");
  const [endDate, setEndDate] = useState<string>((initial as any)?.endDate ?? "");

  const [clientName, setClientName] = useState(initial?.client ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [accountType, setAccountType] = useState(initial?.accountType ?? "");
  const [otherAccountType, setOtherAccountType] = useState(initial?.otherAccountType ?? "");
  const [extraContacts, setExtraContacts] = useState<Array<{ name: string; title: string; phone: string }>>(
    initial?.extraContacts ?? []
  );
  const addExtraContact = () => setExtraContacts(prev => [...prev, { name: "", title: "", phone: "" }]);
  const removeExtraContact = (i: number) => setExtraContacts(prev => prev.filter((_, idx) => idx !== i));
  const updateExtraContact = (i: number, field: "name" | "title" | "phone", val: string) =>
    setExtraContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const [teamMembers, setTeamMembers] = useState<string[]>(initial?.teamMembers ?? []);
  const [memberOpen, setMemberOpen] = useState(false);

  const cityObj = settings.locations.find((c) => c.name === city);
  const districts = cityObj?.districts ?? [];
  const districtsAr = cityObj?.districtsAr ?? {};
  const cityLabel = (c: { name: string; nameAr?: string }) => (isAr ? (c.nameAr || c.name) : c.name);
  const districtLabel = (d: string) => (isAr ? (districtsAr[d] || d) : d);

  const toggleMember = (idVal: string) => {
    setTeamMembers((prev) => (prev.includes(idVal) ? prev.filter((m) => m !== idVal) : [...prev, idVal]));
  };

  const submit = () => {
    if (!name.trim() || !clientName.trim()) return;
    if (startDate && endDate && endDate < startDate) return;
    const payload = {
      name,
      client: clientName,
      clientEmail,
      clientPhone,
      city,
      district,
      street,
      projectType,
      budget,
      team: teamMembers.length || 1,
      teamMembers,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      accountType,
      otherAccountType: accountType === "Other" ? otherAccountType : undefined,
      extraContacts: extraContacts.filter(c => c.name.trim()),
    };
    if (initial) {
      actions.updateProject(initial.id, payload);
    } else {
      actions.addProject({
        ...payload,
        progress: 0,
        status: "On Track",
        offeredValue: 0,
        competitors: [],
        category: projectType,
        lastUpdate: new Date().toISOString().slice(0, 10),
      });
    }
    onClose();
  };

  const memberLabel = teamMembers.length === 0
    ? t("selectTeamMembers")
    : employees.filter((e) => teamMembers.includes(e.id)).map((e) => e.name).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{initial ? `${t("edit")} ${t("projects")}` : t("addProject")}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">{t("projects")}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("name")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Account Type</span>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">—</option>
              <option value="End User">End User</option>
              <option value="Contractor">Contractor</option>
              <option value="System Integrator">System Integrator</option>
              <option value="Other">Other</option>
            </select>
          </label>
          {accountType === "Other" && (
            <label className="block sm:col-span-2 mt-[-4px]">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Specify Account Type</span>
              <input value={otherAccountType} onChange={(e) => setOtherAccountType(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Please specify..." />
            </label>
          )}
          <div className="hidden sm:col-span-2">
            <input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>


        <div className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">{t("clientInfo")}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("fullName")}</span>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("email")}</span>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <div className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("phone")}</span>
            <PhoneInput value={clientPhone || "+20"} onChange={(val) => setClientPhone(val)} />
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("city")}</span>
            <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict(""); }} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">{t("selectCity")}</option>
              {settings.locations.map((c) => <option key={c.name} value={c.name}>{cityLabel(c)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("district")}</span>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!city} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-50">
              <option value="">{t("selectDistrict")}</option>
              {districts.map((d) => <option key={d} value={d}>{districtLabel(d)}</option>)}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("street")}</span>
            <input value={street} onChange={(e) => setStreet(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
        </div>

        <div className="mt-5 mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Extra Contacts</span>
          <button type="button" onClick={addExtraContact} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20">
            <Plus className="h-3 w-3" /> Add Contact
          </button>
        </div>
        {extraContacts.length === 0 && (
          <p className="text-xs text-muted-foreground mb-3">No extra contacts yet. Click "Add Contact" to add one.</p>
        )}
        <div className="space-y-3 mb-4">
          {extraContacts.map((c, i) => (
            <div key={i} className="rounded-lg border border-border p-3 relative">
              <button type="button" onClick={() => removeExtraContact(i)} className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pr-8">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</span>
                  <input value={c.name} onChange={e => updateExtraContact(i, "name", e.target.value)} placeholder="Full name" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</span>
                  <input value={c.title} onChange={e => updateExtraContact(i, "title", e.target.value)} placeholder="Job title" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </label>
                <div className="block sm:col-span-2">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</span>
                  <PhoneInput value={c.phone || "+20"} onChange={val => updateExtraContact(i, "phone", val)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">{t("teamMembers")}</div>
        <div className="relative">
          <button onClick={() => setMemberOpen((v) => !v)} className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm">
            <span className="truncate">{memberLabel}</span>
            <span className="text-muted-foreground">{memberOpen ? "▲" : "▼"}</span>
          </button>
          {memberOpen && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
              {employees.map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
                  <input type="checkbox" checked={teamMembers.includes(e.id)} onChange={() => toggleMember(e.id)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                  <span>{e.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent">{t("cancel")}</button>
          <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90">{initial ? t("save") : t("add")}</button>
        </div>
      </div>
    </div>
  );
}
