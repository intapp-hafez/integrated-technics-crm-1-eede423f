import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ProjectRequestsPanel } from "@/components/ProjectRequestsPanel";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { actions, useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import type { Project } from "@/lib/store";
import { useRole } from "@/lib/role";
import { useAuth } from "@/lib/auth";
import {
  Plus,
  Users2,
  Pencil,
  Trash2,
  X,
  LayoutGrid,
  Table as TableIcon,
  Filter,
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { PhoneInput } from "@/components/PhoneInput";
import { supabase } from "@/integrations/supabase/client";
import { ExcelImportModal } from "@/components/ExcelImportModal";
import { ProjectRequestDialog } from "@/components/ProjectRequestDialog";

export const Route = createFileRoute("/manager/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects · INT-CRM" }] }),
});

function ProjectsPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { projects, employees, users, projectRequests } = useStoreState();
  const { teamEmployees, myProfileId } = useMyTeam({ forceTeam: true });

  const getOwner = (p: Project) => {
    if (p.teamMembers && p.teamMembers.length > 0) return p.teamMembers[0];
    if (p.createdByName) return p.createdByName;
    return employees.slice(0, p.team || 1)[0]?.name || "—";
  };
  const { role, isAdmin, isManager } = useRole();
  const canManage = isAdmin || isManager;
  const { user: authUser } = useAuth();
  const myUser = users.find((u) => u.id === authUser?.id);
  const myRequestProfileId = myUser?.profileId ?? myProfileId ?? null;

  const [showRequestDialog, setShowRequestDialog] = useState(false);

  const user = {
    name: "",
    role: t(role as any),
    initials: "HR",
    photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };
  const isDetailRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith("/manager/projects/"),
  });
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [view, setView] = useState<"table" | "grid">("table");
  const [mainTab, setMainTab] = useState<"projects" | "pending">("projects");
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    supabase
      .from("project_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => {
        if (count !== null) setPendingCount(count);
      });
  }, []);

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minBudget, setMinBudget] = useState<string>("");
  const [maxBudget, setMaxBudget] = useState<string>("");
  const [minProgress, setMinProgress] = useState<string>("");
  const [maxProgress, setMaxProgress] = useState<string>("");

  const STATUSES = ["On Track", "Delayed", "At Risk", "Completed", "Cancelled"];

  const minB = minBudget ? Number(minBudget) : null;
  const maxB = maxBudget ? Number(maxBudget) : null;
  const minP = minProgress ? Number(minProgress) : null;
  const maxP = maxProgress ? Number(maxProgress) : null;

  // Restrict to: projects where this manager is assigned as manager,
  // OR where any team member is in the project's member list,
  // OR where the manager was the requester (approved request)
  const teamProfileIds = new Set(
    teamEmployees.map((e: any) => e.profileId ?? e.id).filter(Boolean),
  );

  const approvedRequests = (projectRequests ?? []).filter(
    (r: any) =>
      r.status === "approved" &&
      (r.requested_by === myProfileId || r.requested_by === myRequestProfileId),
  );

  const requestedProjectIds = new Set(
    approvedRequests.map((r: any) => r.created_project_id).filter(Boolean),
  );

  const requestedProjectNames = new Set(
    approvedRequests.map((r: any) => r.name_en?.trim().toLowerCase()).filter(Boolean),
  );

  const myProjects = useMemo(() => {
    if (!myProfileId) return projects; // fallback: show all if profile not resolved
    return projects.filter(
      (p) =>
        p.managerId === myProfileId ||
        (p.memberProfileIds ?? []).some((pid) => pid === myProfileId || teamProfileIds.has(pid)) ||
        requestedProjectIds.has(p.id) ||
        requestedProjectNames.has(p.name?.trim().toLowerCase()),
    );
  }, [projects, myProfileId, teamProfileIds, requestedProjectIds, requestedProjectNames]);

  const clients = Array.from(new Set(myProjects.map((p) => p.client).filter(Boolean)));
  const owners = Array.from(
    new Set(myProjects.map(getOwner).filter((o) => o !== "—" && Boolean(o))),
  );

  const filtered = myProjects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (clientFilter !== "all" && p.client !== clientFilter) return false;
    if (ownerFilter !== "all" && getOwner(p) !== ownerFilter) return false;
    if (minB !== null && p.budget < minB) return false;
    if (maxB !== null && p.budget > maxB) return false;
    if (minP !== null && p.progress < minP) return false;
    if (maxP !== null && p.progress > maxP) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !p.client.toLowerCase().includes(q) &&
        !shortId(p.id).toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (p: Project): string | number => {
      switch (sortKey) {
        case "id":
          return shortId(p.id);
        case "name":
          return p.name;
        case "client":
          return p.client;
        case "owner":
          return getOwner(p);
        case "status":
          return p.status;
        case "progress":
          return p.progress;
        case "team":
          return p.team;
        case "budget":
          return p.budget;
        default:
          return "";
      }
    };
    arr.sort((a, b) => {
      const va = get(a),
        vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).toLowerCase().localeCompare(String(vb).toLowerCase()) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (clientFilter !== "all" ? 1 : 0) +
    (ownerFilter !== "all" ? 1 : 0) +
    (minBudget ? 1 : 0) +
    (maxBudget ? 1 : 0) +
    (minProgress ? 1 : 0) +
    (maxProgress ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setClientFilter("all");
    setOwnerFilter("all");
    setMinBudget("");
    setMaxBudget("");
    setMinProgress("");
    setMaxProgress("");
    setQuery("");
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No projects match your filters");
      return;
    }
    const rows = filtered.map((p) => ({
      ID: shortId(p.id),
      Name: p.name,
      Client: p.client,
      Owner: getOwner(p),
      Category: p.category ?? "",
      Status: p.status,
      Progress: p.progress,
      Budget: p.budget,
      OfferedValue: p.offeredValue ?? 0,
      Team: p.team,
      Project_Type: p.projectType ?? "",
      City: p.city ?? "",
      District: p.district ?? "",
      Street: p.street ?? "",
      Start_Date: p.startDate ?? "",
      End_Date: p.endDate ?? "",
      Extra_Contacts: p.extraContacts
        ? (p.extraContacts as any[])
            .map((c) => `${c.name} (${c.title || "N/A"}) - ${c.phone} - ${c.email || ""}`)
            .join("; ")
        : "",
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
      <div className="mb-6 flex gap-6 border-b border-border">
        <button
          onClick={() => setMainTab("projects")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${mainTab === "projects" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {t("projects")}
        </button>
        <button
          onClick={() => setMainTab("pending")}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${mainTab === "pending" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Accounts · Pending Approval
          {pendingCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {mainTab === "pending" ? (
        <ProjectRequestsPanel mode="approver" />
      ) : (
        <>
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label={t("status")}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">
                  {t("status")}: {t("all")}
                </option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                aria-label={t("client")}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">
                  {t("client")}: {t("all")}
                </option>
                {clients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                aria-label={t("owner")}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">
                  {t("owner") ?? "Owner"}: {t("all")}
                </option>
                {owners.map((o) => (
                  <option key={o as string} value={o as string}>
                    {o as string}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition ${showAdvanced || activeFilterCount > 0 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:bg-accent"}`}
              >
                <Filter className="h-3.5 w-3.5" /> {t("filters")}
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleExport}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-medium hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5" /> {t("export")}
              </button>
              {canManage && (
                <>
                  <button
                    disabled
                    title={
                      isAr
                        ? "نعتذر — هذا الخيار غير متاح حالياً. شكراً لتفهمكم."
                        : "We apologise — this option is currently not working. Thanks for your understanding."
                    }
                    className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-medium opacity-40"
                  >
                    <Download className="h-3.5 w-3.5 rotate-180" /> {t("importExcel")}
                  </button>
                  <button
                    onClick={() => setShowRequestDialog(true)}
                    className="shrink-0 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("addProject")}
                  </button>
                </>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("budget")} (Min)
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    className="h-8 w-24 rounded-md border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("budget")} (Max)
                  </span>
                  <input
                    type="number"
                    placeholder="∞"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="h-8 w-24 rounded-md border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("progress")} (Min %)
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    max="100"
                    value={minProgress}
                    onChange={(e) => setMinProgress(e.target.value)}
                    className="h-8 w-20 rounded-md border border-border bg-background px-2 text-xs"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("progress")} (Max %)
                  </span>
                  <input
                    type="number"
                    placeholder="100"
                    min="0"
                    max="100"
                    value={maxProgress}
                    onChange={(e) => setMaxProgress(e.target.value)}
                    className="h-8 w-20 rounded-md border border-border bg-background px-2 text-xs"
                  />
                </label>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
                  >
                    <X className="h-3.5 w-3.5" /> Clear Filters
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-4 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
                  <button
                    onClick={() => setView("table")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "table" ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <TableIcon className="h-3.5 w-3.5" /> {t("tableView")}
                  </button>
                  <button
                    onClick={() => setView("grid")}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "grid" ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> {t("gridView")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {view === "table" ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-secondary/60">
                    <tr className="text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {(
                        [
                          ["id", "ID", "text-start"],
                          ["name", t("name"), "text-start"],
                          ["client", t("client"), "text-start"],
                          ["owner", t("owner") || "Owner", "text-start"],
                          ["status", t("status"), "text-start"],
                          ["progress", t("progress"), "text-start"],
                          ["team", t("team"), "text-start"],
                          ["budget", t("budget"), "text-end justify-end"],
                        ] as const
                      ).map(([k, label, align]) => (
                        <th key={k} className={`px-3 py-3 ${align}`}>
                          <button
                            onClick={() => toggleSort(k)}
                            className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                          >
                            <span>{label}</span>
                            {sortKey === k ? (
                              sortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-40" />
                            )}
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
                          <Link
                            to="/manager/projects/$projectId"
                            params={{ projectId: p.id }}
                            className="hover:text-primary"
                          >
                            {shortId(p.id)}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            to="/manager/projects/$projectId"
                            params={{ projectId: p.id }}
                            className="font-semibold text-foreground hover:text-primary"
                          >
                            {p.name}
                          </Link>
                          {(p.accountType || p.category) && (
                            <div className="text-[11px] text-muted-foreground">
                              {p.accountType
                                ? p.accountType === "Other" && p.otherAccountType
                                  ? p.otherAccountType
                                  : p.accountType
                                : p.category}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">{p.client}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{getOwner(p)}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
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
                            <span className="font-mono text-xs font-bold text-foreground">
                              {p.progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Users2 className="h-3 w-3" />
                            {p.team}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-end font-mono font-semibold text-primary">
                          {fmtMoney(p.budget)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditing(p)}
                              aria-label={t("edit")}
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`${t("confirmDelete")} (${p.name})`))
                                  actions.removeProject(p.id);
                              }}
                              aria-label={t("delete")}
                              className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sorted.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3 py-10 text-center text-sm text-muted-foreground"
                        >
                          —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sorted.map((p) => (
                <div
                  key={p.id}
                  className="group relative rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
                >
                  <Link
                    to="/manager/projects/$projectId"
                    params={{ projectId: p.id }}
                    className="block"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {shortId(p.id)}
                          {(p.accountType || p.category) &&
                            ` · ${p.accountType ? (p.accountType === "Other" && p.otherAccountType ? p.otherAccountType : p.accountType) : p.category}`}
                        </div>
                        <h3 className="mt-1 font-display text-base font-bold text-foreground">
                          {p.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{p.client}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>

                    {p.competitors && p.competitors.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.competitors.map((c) => (
                          <span
                            key={c}
                            className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-600 ring-1 ring-inset ring-rose-200"
                          >
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
                        <span>
                          {p.team} {t("members")}
                        </span>
                      </div>
                      <div className="text-end">
                        <div className="font-mono font-bold text-primary">{fmtMoney(p.budget)}</div>
                        {p.offeredValue && (
                          <div className="text-[9px] text-muted-foreground uppercase">
                            {t("offeredValue")}: {fmtMoney(p.offeredValue)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <button
                      onClick={() => setEditing(p)}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      <Pencil className="h-3 w-3" /> {t("edit")}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`${t("confirmDelete")} (${p.name})`))
                          actions.removeProject(p.id);
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3 w-3" /> {t("delete")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editing && editing !== "new" && (
        <ProjectFormModal initial={editing} onClose={() => setEditing(null)} />
      )}
      {showRequestDialog && (
        <ProjectRequestDialog
          profileId={myRequestProfileId}
          onClose={() => setShowRequestDialog(false)}
          onSubmitted={() => {
            setShowRequestDialog(false);
            toast.success("Request submitted — awaiting admin approval");
          }}
        />
      )}
      {showImport && <ExcelImportModal type="projects" onClose={() => setShowImport(false)} />}
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
  const { t } = useI18n();
  const { settings } = useStoreState();
  const { teamEmployees: employees } = useMyTeam();

  const [activeTab, setActiveTab] = useState<"details" | "team">("details");

  const [name, setName] = useState(initial?.name ?? "");
  const [projectType, setProjectType] = useState(initial?.projectType ?? "");
  const [budget, setBudget] = useState(initial?.budget ?? 0);

  const [clientName, setClientName] = useState(initial?.client ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [accountType, setAccountType] = useState(initial?.accountType ?? "");
  const [otherAccountType, setOtherAccountType] = useState(initial?.otherAccountType ?? "");
  const [extraContacts, setExtraContacts] = useState<
    Array<{ name: string; title: string; phone: string; email: string }>
  >(initial?.extraContacts ?? []);
  const addExtraContact = () =>
    setExtraContacts((prev) => [...prev, { name: "", title: "", phone: "", email: "" }]);
  const removeExtraContact = (i: number) =>
    setExtraContacts((prev) => prev.filter((_, idx) => idx !== i));
  const updateExtraContact = (
    i: number,
    field: "name" | "title" | "phone" | "email",
    val: string,
  ) => setExtraContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)));

  const [teamMembers, setTeamMembers] = useState<string[]>(initial?.teamMembers ?? []);
  const [memberOpen, setMemberOpen] = useState(false);

  const districts = settings.locations.find((c) => c.name === city)?.districts ?? [];

  const toggleMember = (idVal: string) => {
    setTeamMembers((prev) =>
      prev.includes(idVal) ? prev.filter((m) => m !== idVal) : [...prev, idVal],
    );
  };

  const submit = () => {
    if (!name.trim() || !clientName.trim()) return;
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
      accountType,
      otherAccountType: accountType === "Other" ? otherAccountType : undefined,
      extraContacts: extraContacts.filter((c) => c.name.trim()),
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

  const memberLabel =
    teamMembers.length === 0
      ? t("selectTeamMembers")
      : employees
          .filter((e) => teamMembers.includes(e.id))
          .map((e) => e.name)
          .join(", ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            {initial ? `${t("edit")} ${t("projects")}` : t("addProject")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab("details")}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "details" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t("projects") ?? "Details"}
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "team" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t("teamMembers") ?? "Team Members"}
            {teamMembers.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                {teamMembers.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "details" && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                {t("projects")}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("name")}
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Account Type
                  </span>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="End User">End User</option>
                    <option value="Contractor">Contractor</option>
                    <option value="System Integrator">System Integrator</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                {accountType === "Other" && (
                  <label className="block sm:col-span-2 mt-[-4px]">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Specify Account Type
                    </span>
                    <input
                      value={otherAccountType}
                      onChange={(e) => setOtherAccountType(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                      placeholder="Please specify..."
                    />
                  </label>
                )}
                <div className="hidden">
                  <input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                {t("clientInfo")}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("fullName")}
                  </span>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("email")}
                  </span>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </label>
                <div className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("phone")}
                  </span>
                  <PhoneInput
                    value={clientPhone || "+20"}
                    onChange={(val) => setClientPhone(val)}
                  />
                </div>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("city")}
                  </span>
                  <select
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setDistrict("");
                    }}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    <option value="">{t("selectCity")}</option>
                    {settings.locations.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("district")}
                  </span>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={!city}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-50"
                  >
                    <option value="">{t("selectDistrict")}</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("street")}
                  </span>
                  <input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Extra Contacts
                </span>
                <button
                  type="button"
                  onClick={addExtraContact}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20"
                >
                  <Plus className="h-3 w-3" /> Add Contact
                </button>
              </div>
              {extraContacts.length === 0 && (
                <p className="text-xs text-muted-foreground mb-3">
                  No extra contacts yet. Click "Add Contact" to add one.
                </p>
              )}
              <div className="space-y-3 mb-4">
                {extraContacts.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 relative">
                    <button
                      type="button"
                      onClick={() => removeExtraContact(i)}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pr-8">
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Name
                        </span>
                        <input
                          value={c.name}
                          onChange={(e) => updateExtraContact(i, "name", e.target.value)}
                          placeholder="Full name"
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Title
                        </span>
                        <input
                          value={c.title}
                          onChange={(e) => updateExtraContact(i, "title", e.target.value)}
                          placeholder="Job title"
                          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
                        />
                      </label>
                      <div className="block sm:col-span-2">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Phone
                        </span>
                        <PhoneInput
                          value={c.phone || "+20"}
                          onChange={(val) => updateExtraContact(i, "phone", val)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "team" && (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
            {employees.map((e) => {
              const checked = teamMembers.includes(e.id);
              return (
                <div
                  key={e.id}
                  onClick={() => toggleMember(e.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${checked ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/50 hover:bg-accent"}`}
                >
                  <div
                    className={`relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-background"}`}
                  >
                    {checked && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-500 text-xs font-bold text-white shadow-sm ring-1 ring-white/20">
                    {(e as any).avatar ||
                      e.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`truncate font-semibold ${checked ? "text-primary" : "text-foreground"}`}
                    >
                      {e.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{e.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
          >
            {t("cancel")}
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {initial ? t("save") : t("create")}
          </button>
        </div>
      </div>
    </div>
  );
}
