import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { actions, useStoreState, type LocationCity } from "@/lib/store";
import { useRole } from "@/lib/role";
import { Plus, Filter, Download, Search, List, Map as MapIcon, Pencil, Trash2, X, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, type ComponentType } from "react";
import type { Lead, LeadStatus } from "@/lib/mock-data";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { ExcelImportModal } from "@/components/ExcelImportModal";



export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
  head: () => ({ meta: [{ title: "Leads · INT-CRM" }] }),
});

function LeadsPage() {
  const { t, lang } = useI18n();
  const { leads, settings, leadDistricts, activities, projects } = useStoreState();
  const STATUSES = settings.statuses;
  const stageLabel = (k: string) => settings.stages.find((s) => s.key === k)?.label ?? (t(k as any) ?? k);
  const stageColor = (k: string) => settings.stages.find((s) => s.key === k)?.color ?? "#64748b";
  const projectById = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);
  const leadActivityProjectIds = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const a of activities) {
      if (a.leadId && a.projectId) {
        (map[a.leadId] ??= new Set()).add(a.projectId);
      }
    }
    return map;
  }, [activities]);
  const getLinkedProjectId = useCallback((l: Lead) => {
    if (l.projectId) return l.projectId;
    // Auto-link by company name
    const match = projects.find((p) => p.name === l.company || p.client === l.company);
    if (match) return match.id;
    // Auto-link by activity
    const ids = leadActivityProjectIds[l.id];
    return ids ? Array.from(ids)[0] : undefined;
  }, [projects, leadActivityProjectIds]);

  const leadProjectName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of leads) {
      const pid = getLinkedProjectId(l);
      if (pid) {
        const p = projectById.get(pid);
        if (p) map[l.id] = p.name;
      }
    }
    return map;
  }, [leads, projectById, getLinkedProjectId]);

  // Validation: warn when lead has no project link, or when the assigned project
  // does not match any activity-linked project for the lead.
  const leadValidation = useMemo(() => {
    const issues: Record<string, { kind: "missing" | "mismatch"; message: string }> = {};
    for (const l of leads) {
      const activityIds = leadActivityProjectIds[l.id];
      const pid = getLinkedProjectId(l);
      
      if (!pid && (!activityIds || activityIds.size === 0)) {
        issues[l.id] = { kind: "missing", message: "No project linked" };
      } else if (pid && activityIds && activityIds.size > 0 && !activityIds.has(pid)) {
        const names = Array.from(activityIds).map((id) => projectById.get(id)?.name ?? id).join(", ");
        issues[l.id] = { kind: "mismatch", message: `Lead project differs from activity project (${names})` };
      } else if (!pid && activityIds && activityIds.size > 0) {
        issues[l.id] = { kind: "missing", message: "Lead has no project but activity links exist" };
      }
    }
    return issues;
  }, [leads, leadActivityProjectIds, projectById, getLinkedProjectId]);
  const isAr = lang === "ar";
  const cityLabel = (name: string) => isAr ? (settings.locations.find((c) => c.name === name)?.nameAr || name) : name;
  const districtLabel = (cityName: string, d: string) => isAr ? (settings.locations.find((c) => c.name === cityName)?.districtsAr?.[d] || d) : d;

  const isDetailRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith("/admin/leads/")
  });
  const [tab, setTab] = useState<"list" | "map">("list");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");
  const [minProb, setMinProb] = useState<string>("");
  const [closeFrom, setCloseFrom] = useState<string>("");
  const [closeTo, setCloseTo] = useState<string>("");
  const [editing, setEditing] = useState<Lead | "new" | null>(null);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };
  const [LeadsMap, setLeadsMap] = useState<ComponentType<{ leads: Lead[] }> | null>(null);
  useEffect(() => {
    if (tab === "map" && !LeadsMap) {
      import("@/components/LeadsMap").then((m) => setLeadsMap(() => m.LeadsMap));
    }
  }, [tab, LeadsMap]);
  const { role, isAdmin } = useRole();
  const user = { name: "hafez Rahim", role: t(role as any), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" };

  if (isDetailRoute) {
    return <Outlet />;
  }

  const owners = Array.from(new Set(leads.map((l) => l.owner).filter(Boolean)));
  const citiesInLeads = Array.from(new Set(leads.map((l) => l.city).filter(Boolean)));
  const projectsInLeads = useMemo(() => {
    const names = new Set<string>();
    for (const l of leads) {
      const name = leadProjectName[l.id];
      if (name) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [leads, leadProjectName]);

  const minV = minValue ? Number(minValue) : null;
  const maxV = maxValue ? Number(maxValue) : null;
  const minP = minProb ? Number(minProb) : null;
  const closeFromTs = closeFrom ? new Date(closeFrom).getTime() : null;
  const closeToTs = closeTo ? new Date(closeTo).getTime() : null;

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (cityFilter !== "all" && l.city !== cityFilter) return false;
    if (ownerFilter !== "all" && l.owner !== ownerFilter) return false;
    if (projectFilter !== "all") {
      const name = leadProjectName[l.id] ?? "";
      if (name !== projectFilter) return false;
    }
    if (minV !== null && (l.value || 0) < minV) return false;
    if (maxV !== null && (l.value || 0) > maxV) return false;
    if (minP !== null && (l.probability ?? 0) < minP) return false;
    if (closeFromTs !== null) {
      const d = l.expectedCloseDate ? new Date(l.expectedCloseDate).getTime() : null;
      if (d === null || d < closeFromTs) return false;
    }
    if (closeToTs !== null) {
      const d = l.expectedCloseDate ? new Date(l.expectedCloseDate).getTime() : null;
      if (d === null || d > closeToTs) return false;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      const proj = (leadProjectName[l.id] ?? "").toLowerCase();
      if (!l.company.toLowerCase().includes(q) && !l.contact.toLowerCase().includes(q) && !l.id.toLowerCase().includes(q) && !proj.includes(q)) return false;
    }
    return true;
  });

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (cityFilter !== "all" ? 1 : 0) +
    (ownerFilter !== "all" ? 1 : 0) +
    (projectFilter !== "all" ? 1 : 0) +
    (minValue ? 1 : 0) + (maxValue ? 1 : 0) + (minProb ? 1 : 0) +
    (closeFrom ? 1 : 0) + (closeTo ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all"); setCityFilter("all"); setOwnerFilter("all"); setProjectFilter("all");
    setMinValue(""); setMaxValue(""); setMinProb("");
    setCloseFrom(""); setCloseTo(""); setQuery("");
    setPage(1);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, cityFilter, ownerFilter, projectFilter, minValue, maxValue, minProb, closeFrom, closeTo, query]);

  const handleExport = () => {
    if (filtered.length === 0) { toast.error(t("noLeadsMatch") as string); return; }
    const rows = filtered.map((l) => ({
      ID: shortId(l.id),
      Company: l.company,
      Project: leadProjectName[l.id] ?? "",
      ProjectWarning: leadValidation[l.id]?.message ?? "",
      Contact: l.contact,
      Email: l.email ?? "",
      Industry: l.industry ?? "",
      City: l.city,
      District: leadDistricts[l.id] ?? "",
      Street: l.street ?? "",
      Source: l.source ?? "",
      Status: l.status,
      Probability: l.probability ?? 0,
      Value: l.value ?? 0,
      Owner: l.owner,
      ExpectedCloseDate: l.expectedCloseDate ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `leads-${stamp}.xlsx`);
    // Also emit a CSV next to the xlsx so users can download leads with project names as CSV.
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads-${stamp}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} leads exported`);
  };

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (l: Lead): string | number => {
      switch (sortKey) {
        case "id": return shortId(l.id);
        case "company": return l.company;
        case "project": return leadProjectName[l.id] ?? "";
        case "contact": return l.contact;
        case "city": return l.city;
        case "district": return leadDistricts[l.id] ?? "";
        case "source": return l.source ?? "";
        case "status": return l.status;
        case "owner": return l.owner;
        case "value": return l.value || 0;
        default: return "";
      }
    };
    arr.sort((a, b) => {
      const va = get(a), vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).toLowerCase().localeCompare(String(vb).toLowerCase()) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir, leadDistricts, leadProjectName]);

  const totalValue = filtered.reduce((s, l) => s + (l.value || 0), 0);
  
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  const weightedValue = filtered.reduce((s, l) => s + ((l.value || 0) * ((l.probability ?? 0) / 100)), 0);
  const wonValue = filtered.filter((l) => l.status === "won").reduce((s, l) => s + (l.value || 0), 0);
  const byStatus = STATUSES.map((s) => {
    const items = filtered.filter((l) => l.status === s);
    return { status: s, count: items.length, value: items.reduce((acc, l) => acc + (l.value || 0), 0) };
  });

  return (
    <AppShell panel={role} user={user} pageTitle={t("leads")}>
      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("leads")}</div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">{filtered.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("value")}</div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">{fmtMoney(totalValue)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Weighted</div>
          <div className="mt-1 font-display text-2xl font-bold text-primary">{fmtMoney(Math.round(weightedValue))}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("won")}</div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-600">{fmtMoney(wonValue)}</div>
        </div>
      </div>

      {/* By status breakdown */}
      <div className="mb-5 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("status")}</div>
        <div className="flex w-full items-stretch gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {byStatus.map((s) => (
            <button
              key={s.status}
              onClick={() => setStatusFilter(statusFilter === s.status ? "all" : s.status)}
              className={`flex-1 min-w-[90px] rounded-lg border p-2.5 text-start transition ${statusFilter === s.status ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: stageColor(s.status) }} />
                <span className="text-xs font-semibold text-foreground">{stageLabel(s.status)}</span>
              </div>
              <div className="mt-1 text-lg font-bold text-foreground">{s.count}</div>
              <div className="text-[11px] font-mono text-muted-foreground">{fmtMoney(s.value)}</div>
            </button>
          ))}
        </div>
      </div>

      {(() => {
        const ids = Object.keys(leadValidation);
        if (ids.length === 0) return null;
        const missing = ids.filter((id) => leadValidation[id].kind === "missing").length;
        const mismatch = ids.filter((id) => leadValidation[id].kind === "mismatch").length;
        return (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 shadow-[var(--shadow-soft)]">
            <span aria-hidden className="text-base leading-none">⚠</span>
            <div className="flex-1">
              <div className="font-semibold">Account link validation</div>
              <div className="text-xs">
                {missing > 0 && <span>{missing} lead{missing === 1 ? "" : "s"} missing an account link. </span>}
                {mismatch > 0 && <span>{mismatch} lead{mismatch === 1 ? "" : "s"} where the assigned account doesn’t match the linked activity’s account.</span>}
              </div>
            </div>
          </div>
        );
      })()}


      <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
        <button
          onClick={() => setTab("list")}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${tab === "list" ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <List className="h-4 w-4" /> {t("listView")}
        </button>
        <button
          onClick={() => setTab("map")}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${tab === "map" ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <MapIcon className="h-4 w-4" /> {t("map")}
        </button>
      </div>

      {tab === "map" ? (
        LeadsMap ? (
          <LeadsMap leads={filtered} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{t("loadingMap")}</div>
        )
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
                aria-label={t("status")}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">{t("status")}: {t("all")}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{stageLabel(s)}</option>
                ))}
              </select>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                aria-label={t("city")}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">{t("city")}: {t("all")}</option>
                {citiesInLeads.map((c) => (
                  <option key={c} value={c}>{cityLabel(c)}</option>
                ))}
              </select>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                aria-label={t("owner")}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">{t("owner")}: {t("all")}</option>
                {owners.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label={t("project") ?? "Account"}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">{t("project") ?? "Account"}: {t("all")}</option>
                {projectsInLeads.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition ${showAdvanced || activeFilterCount > 0 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:bg-accent"}`}
              >
                <Filter className="h-3.5 w-3.5" /> {t("filters")}
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{activeFilterCount}</span>
                )}
              </button>
              <button onClick={handleExport} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-medium hover:bg-accent">
                <Download className="h-3.5 w-3.5" /> {t("export")}
              </button>
              <button
                disabled
                title={isAr ? "نعتذر — هذا الخيار غير متاح حالياً. شكراً لتفهمكم." : "We apologise — this option is currently not working. Thanks for your understanding."}
                className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-medium opacity-40"
              >
                <Download className="h-3.5 w-3.5 rotate-180" /> {t("importExcel")}
              </button>
              <button onClick={() => setEditing("new")} className="shrink-0 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90">
                <Plus className="h-3.5 w-3.5" /> {t("addLead")}
              </button>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                className="h-9 w-full rounded-lg border border-border bg-card text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ paddingInlineStart: "2.25rem", paddingInlineEnd: "0.75rem" }}
              />
            </div>
          </div>

          {showAdvanced && (
            <div className="mt-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Advanced filters</div>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                    <X className="h-3.5 w-3.5" /> Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Min value
                  <input type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} placeholder="0" className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Max value
                  <input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} placeholder="∞" className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Min probability %
                  <input type="number" min={0} max={100} value={minProb} onChange={(e) => setMinProb(e.target.value)} placeholder="0" className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Close from
                  <input type="date" value={closeFrom} onChange={(e) => setCloseFrom(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Close to
                  <input type="date" value={closeTo} onChange={(e) => setCloseTo(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </label>
              </div>
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <div className="min-w-[1200px] text-sm">
                <div
                  className="grid items-center gap-2 bg-secondary/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  style={{ gridTemplateColumns: "80px 1.4fr 1fr 1fr 1fr 0.8fr 0.9fr 1fr 110px 90px" }}
                >
                  {([
                    ["id", "ID", ""],
                    ["company", t("company"), ""],
                    ["project", t("project") ?? "Account", ""],
                    ["contact", t("contact"), ""],
                    ["city", t("city"), ""],
                    ["source", t("source"), ""],
                    ["status", `${t("status")} / %`, ""],
                    ["owner", t("owner"), ""],
                    ["value", t("value"), "justify-end"],
                  ] as const).map(([k, label, align]) => (
                    <button key={k} onClick={() => toggleSort(k)} className={`inline-flex items-center gap-1 text-start uppercase ${align} hover:text-foreground`}>
                      <span>{label}</span>
                      {sortKey === k ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  ))}
                  <div className="text-end">{t("action")}</div>
                </div>
                <div className="divide-y divide-border">
                  {paginated.map((l) => (
                    <div
                      key={l.id}
                      className="grid items-center gap-2 px-4 py-3 transition-colors hover:bg-primary/5"
                      style={{ gridTemplateColumns: "80px 1.4fr 1fr 1fr 1fr 0.8fr 0.9fr 1fr 110px 90px" }}
                    >
                      <Link to="/admin/leads/$leadId" params={{ leadId: l.id }} className="font-mono text-xs text-muted-foreground hover:text-primary">{shortId(l.id)}</Link>
                      <Link to="/admin/leads/$leadId" params={{ leadId: l.id }} className="min-w-0">
                        <span className="font-semibold text-foreground">{l.company}</span>
                        <div className="text-xs text-muted-foreground">{l.industry}</div>
                      </Link>
                      <div className="min-w-0">
                        <select
                          value={getLinkedProjectId(l) ?? ""}
                          onChange={(e) => {
                            const next = e.target.value || undefined;
                            if (next === getLinkedProjectId(l)) return;
                            actions.updateLead(l.id, { projectId: next });
                            toast.success(next ? `Linked to ${projectById.get(next)?.name ?? "account"}` : "Account unlinked");
                          }}
                          aria-label="Lead project"
                          className={`h-8 w-full rounded-md border bg-card px-2 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${leadValidation[l.id] ? "border-amber-400 text-amber-700" : "border-border text-foreground"}`}
                          title={leadValidation[l.id]?.message}
                        >
                          <option value="">— {t("project") ?? "Account"} —</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        {leadValidation[l.id] && (
                          <div className="mt-1 text-[10px] font-semibold text-amber-700">⚠ {leadValidation[l.id].message}</div>
                        )}
                      </div>
                      <div className="text-foreground">{l.contact}</div>
                      <div className="text-muted-foreground">{cityLabel(l.city)}</div>
                      <div className="text-muted-foreground">{l.source}</div>
                      <div>
                        <StatusBadge status={l.status} label={t(l.status as any)} />
                        {l.probability !== undefined && <div className="mt-1 text-[10px] font-semibold text-muted-foreground">{l.probability}% {t("probability")}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {(l as any).ownerPhoto ? (
                          <img src={(l as any).ownerPhoto} alt={`${l.owner} avatar`} className="h-6 w-6 rounded-full object-cover" />
                        ) : (
                          <div role="img" aria-label={`${l.owner} avatar`} className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {l.owner.split(" ").map((w: string) => w[0]).join("")}
                          </div>
                        )}
                        <span className="text-foreground">{l.owner}</span>
                      </div>
                      <div className="text-end font-mono font-semibold text-foreground">{fmtMoney(l.value)}</div>
                      <div className="flex items-center justify-end gap-1">
                        {l.status === "won" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200" title={t("won") as string}>
                            🔒 {t("won")}
                          </span>
                        ) : (
                          <>
                            <button onClick={() => setEditing(l)} aria-label={t("edit")} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => { if (confirm(`${t("confirmDelete")} (${l.company})`)) actions.removeLead(l.id); }} aria-label={t("delete")} className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {paginated.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-muted-foreground">{t("noLeadsMatch")}</div>
                  )}
                </div>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="border-t border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sorted.length)} of {sorted.length} entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <div className="px-2 text-xs font-semibold">{page} / {totalPages}</div>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {editing && (
        <LeadFormModal
          initial={editing === "new" ? null : editing}
          locations={settings.locations}
          onClose={() => setEditing(null)}
        />
      )}
      {showImport && (
        <ExcelImportModal type="leads" onClose={() => setShowImport(false)} />
      )}
    </AppShell>
  );
}

function LeadFormModal({ initial, locations, onClose }: { initial: Lead | null; locations: LocationCity[]; onClose: () => void }) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { leadDistricts, projects, employees, settings } = useStoreState();
  const STATUSES = settings.statuses;
  const stageLabel = (k: string) => settings.stages.find((s) => s.key === k)?.label ?? k;
  const cities = locations.map((c) => c.name);
  const cityLabel = (name: string) => {
    if (!isAr) return name;
    return locations.find((c) => c.name === name)?.nameAr || name;
  };
  const districtLabel = (cityName: string, d: string) => {
    if (!isAr) return d;
    return locations.find((c) => c.name === cityName)?.districtsAr?.[d] || d;
  };
  const SOURCES: { value: string; key: string }[] = [
    { value: "Website", key: "sourceWebsite" },
    { value: "Referral", key: "sourceReferral" },
    { value: "LinkedIn", key: "sourceLinkedIn" },
    { value: "Cold Call", key: "sourceColdCall" },
    { value: "Email Campaign", key: "sourceEmailCampaign" },
    { value: "Trade Show", key: "sourceTradeShow" },
    { value: "Social Media", key: "sourceSocialMedia" },
    { value: "Partner", key: "sourcePartner" },
  ];
  const [projectId, setProjectId] = useState(() => {
    if (!initial) return "";
    // Use stored projectId first, then fall back to matching by company name
    return initial.projectId ?? projects.find((p) => p.name === initial.company)?.id ?? "";
  });
  const [company, setCompany] = useState(initial?.company ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [source, setSource] = useState(initial?.source ?? "Website");
  const [status, setStatus] = useState<LeadStatus>(initial?.status ?? "new");
  const [value, setValue] = useState(initial?.value ?? 0);
  const [probability, setProbability] = useState(initial?.probability ?? 0);
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>((initial as any)?.expectedCloseDate ?? "");
  const [description, setDescription] = useState<string>((initial as any)?.description ?? "");
  const [country, setCountry] = useState<string>((initial as any)?.country ?? "Egypt");
  const [city, setCity] = useState(initial?.city ?? cities[0] ?? "Cairo");
  const [district, setDistrict] = useState(initial ? (leadDistricts[initial.id] ?? "") : "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [owner, setOwner] = useState<string>(initial?.owner ?? (employees[0]?.name ?? ""));
  const districts = locations.find((c) => c.name === city)?.districts ?? [];

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
    } else {
      setCompany("");
    }
  };

  const CITY_COORDS: Record<string, [number, number]> = {
    "Riyadh": [24.7136, 46.6753],
    "Jeddah": [21.4858, 39.1925],
    "Dammam": [26.4207, 50.0888],
    "Khobar": [26.2172, 50.1971],
    "Makkah": [21.3891, 39.8579],
    "Madinah": [24.5247, 39.5692],
    "Cairo": [30.0444, 31.2357],
    "Alexandria": [31.2001, 29.9187],
    "Giza": [30.0131, 31.2089],
    "Hurghada": [27.2579, 33.8116],
    "Luxor": [25.6872, 32.6396],
    "Port Said": [31.2653, 32.3019]
  };

  const submit = () => {
    if (!company.trim()) return;
    let leadId: string;
    const coords = CITY_COORDS[city] || [30.0444, 31.2357];
    if (initial) {
      actions.updateLead(initial.id, { company, contact, email, industry, source, status, value, probability, city, street, owner, country, projectId: projectId || undefined, expectedCloseDate: expectedCloseDate || undefined, description: description || undefined, lat: coords[0], lng: coords[1] } as any);
      leadId = initial.id;
    } else {
      actions.addLead({ company, contact, email, industry, source, status, value, probability, city, street, owner: owner || "hafez Rahim", lat: coords[0], lng: coords[1], country, projectId: projectId || undefined, expectedCloseDate: expectedCloseDate || undefined, description: description || undefined } as any);
      const latest = (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("int-crm:leads") || "[]") : []) as Lead[];
      leadId = latest[0]?.id ?? "";
    }
    if (leadId) actions.setLeadLocation(leadId, city, district);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{initial ? `${t("edit")} ${t("leads")}` : t("addLead")}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
          <Field label={t("project")}>
            <select value={projectId} onChange={(e) => onProjectChange(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">{t("selectProjectPlaceholder")}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t("client")}>
            <input value={contact} readOnly={!!selectedProject} onChange={(e) => setContact(e.target.value)} placeholder={selectedProject ? "" : t("autoFilledFromProject")} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm read-only:bg-muted/40 read-only:text-muted-foreground" />
          </Field>
          <Field label={t("companyEmail")}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@company.com" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></Field>
          <div className="hidden">
            <Field label={t("industry")}><input value={industry} readOnly={!!selectedProject} onChange={(e) => setIndustry(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm read-only:bg-muted/40 read-only:text-muted-foreground" /></Field>
            <Field label={t("source")}>
              <select value={source} onChange={(e) => setSource(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{t(s.key as any)}</option>)}
              </select>
            </Field>
          </div>
          <Field label={t("status")}>
            <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
            </select>
          </Field>
          <Field label={`${t("value")} ($)`}><input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></Field>
          <Field label="Probability %">
            <input type="number" min={0} max={100} value={probability} onChange={(e) => setProbability(Number(e.target.value))} placeholder="0" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </Field>
          <Field label="Expected Close Date">
            <input type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </Field>
          <Field label={t("industry")}>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Construction" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </Field>
          <Field label="Assign to">
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">—</option>
              {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Country">
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Egypt" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </Field>
          <Field label={t("city")}>
            <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict(""); }} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              {cities.map((c) => <option key={c} value={c}>{cityLabel(c)}</option>)}
            </select>
          </Field>
          <Field label={t("district")}>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">—</option>
              {districts.map((d) => <option key={d} value={d}>{districtLabel(city, d)}</option>)}
            </select>
          </Field>
          <label className="sm:col-span-2 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("street")}</span>
            <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="e.g. 10 Abbas El-Akkad St." className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="sm:col-span-2 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief notes about this lead..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent">{t("cancel")}</button>
          <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{initial ? t("save") : t("create")}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}