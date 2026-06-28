import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import {
  Clock4,
  Download,
  X,
  LayoutGrid,
  List,
  TrendingUp,
  Filter,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/employees")({
  component: EmployeesPage,
  head: () => ({ meta: [{ title: "Employees · INT-CRM" }] }),
});

const DEPT_COLORS: Record<string, string> = {
  Sales: "bg-sky-100 text-sky-700",
  Technical: "bg-violet-100 text-violet-700",
  Operations: "bg-amber-100 text-amber-700",
  HR: "bg-rose-100 text-rose-700",
  Projects: "bg-emerald-100 text-emerald-700",
};

function PerfBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-orange-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function Avatar({ initials, photo, name }: { initials: string; photo?: string; name?: string }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name ?? initials}
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-primary/30 shadow-[var(--shadow-brand)]"
      />
    );
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-base font-bold text-primary-foreground shadow-[var(--shadow-brand)]">
      {initials}
    </div>
  );
}

function AvatarSm({ initials, photo, name }: { initials: string; photo?: string; name?: string }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name ?? initials}
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-primary/30 shadow-sm"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-xs font-bold text-primary-foreground shadow-sm">
      {initials}
    </div>
  );
}

function EmployeesPage() {
  const { t, dir } = useI18n();
  const { activities, leads, employees } = useStoreState();
  const isDetailRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith("/admin/employees/"),
  });
  const today = new Date().toISOString().slice(0, 10);
  const [exportOpen, setExportOpen] = useState(false);
  const [view, setView] = useState<"card" | "table">("card");
  const [dept, setDept] = useState("all");

  // Filters
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minPerf, setMinPerf] = useState<string>("");
  const [maxPerf, setMaxPerf] = useState<string>("");

  const depts = ["all", ...Array.from(new Set(employees.map((e) => e.department)))];
  const roles = Array.from(new Set(employees.map((e) => e.role).filter(Boolean)));

  const hoursToday = (name: string) => {
    const mins = activities
      .filter((a) => a.owner === name && a.dueDate === today)
      .reduce((s, a) => s + (a.estMinutes ?? 0), 0);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return mins ? (h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`) : "—";
  };

  const minP = minPerf ? Number(minPerf) : null;
  const maxP = maxPerf ? Number(maxPerf) : null;

  const filtered = useMemo(
    () =>
      employees.filter((e) => {
        if (dept !== "all" && e.department !== dept) return false;
        if (roleFilter !== "all" && e.role !== roleFilter) return false;
        if (minP !== null && e.perf < minP) return false;
        if (maxP !== null && e.perf > maxP) return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          if (
            !e.name.toLowerCase().includes(q) &&
            !e.role.toLowerCase().includes(q) &&
            !shortId(e.id).toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [dept, roleFilter, minP, maxP, query, employees],
  );

  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };
  const parseMins = (s: string): number => {
    if (!s || s === "—") return 0;
    const m = s.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
    return m ? Number(m[1] || 0) * 60 + Number(m[2] || 0) : 0;
  };
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (e: (typeof filtered)[number]): string | number => {
      const myLeads = leads.filter((l) => l.owner === e.name);
      switch (sortKey) {
        case "name":
          return e.name;
        case "role":
          return e.role;
        case "department":
          return e.department;
        case "leads":
          return myLeads.length;
        case "won":
          return myLeads.filter((l) => l.status === "won").length;
        case "perf":
          return e.perf;
        case "today":
          return parseMins(hoursToday(e.name));
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
  }, [filtered, sortKey, sortDir, leads, activities]);

  const activeFilterCount =
    (dept !== "all" ? 1 : 0) +
    (roleFilter !== "all" ? 1 : 0) +
    (minPerf ? 1 : 0) +
    (maxPerf ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setDept("all");
    setRoleFilter("all");
    setMinPerf("");
    setMaxPerf("");
    setQuery("");
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [dept, roleFilter, minPerf, maxPerf, query]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No employees match your filters");
      return;
    }
    const rows = filtered.map((e) => {
      const myLeads = leads.filter((l) => l.owner === e.name);
      const won = myLeads.filter((l) => l.status === "won").length;
      return {
        ID: shortId(e.id),
        Name: e.name,
        Role: e.role,
        Department: e.department,
        Performance: e.perf,
        Leads: myLeads.length,
        Won: won,
        Email: e.email ?? "",
        Phone: e.phone ?? "",
        AnnualTarget: e.annualTarget ?? 0,
        AchievedTarget: e.achievedTarget ?? 0,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `employees-${stamp}.xlsx`);
    toast.success(`${filtered.length} employees exported`);
  };

  const user = {
    name: "hafez Rahim",
    role: t("admin"),
    initials: "HR",
    photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };

  if (isDetailRoute) return <Outlet />;

  return (
    <AppShell panel="admin" user={user} pageTitle={t("employees")}>
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            style={{ insetInlineStart: "0.75rem" }}
          />
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
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label={t("role")}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">
              {t("role")}: {t("all")}
            </option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${showAdvanced || activeFilterCount > 0 ? "border-primary bg-primary/5 text-primary" : "border-border bg-card hover:bg-accent"}`}
          >
            <Filter className="h-4 w-4" /> {t("filters")}
            {activeFilterCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" /> {t("export")}
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Advanced filters
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <X className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="text-xs font-semibold text-muted-foreground">
              Department
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {depts.map((d) => (
                  <option key={d} value={d}>
                    {d === "all" ? t("all") : d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Role
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">{t("all")}</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Min performance %
              <input
                type="number"
                min={0}
                max={100}
                value={minPerf}
                onChange={(e) => setMinPerf(e.target.value)}
                placeholder="0"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              Max performance %
              <input
                type="number"
                min={0}
                max={100}
                value={maxPerf}
                onChange={(e) => setMaxPerf(e.target.value)}
                placeholder="100"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
        </div>
      )}

      {/* Dept chips + view toggle row */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {depts.map((d) => (
            <button
              key={d}
              onClick={() => setDept(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${dept === d ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border hover:bg-accent"}`}
            >
              {d === "all" ? t("all") : d}
            </button>
          ))}
        </div>

        <div className="ms-auto flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setView("card")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> {t("cardView")}
            </button>
            <button
              onClick={() => setView("table")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" /> {t("tableView")}
            </button>
          </div>

          <button
            onClick={() => setExportOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-accent"
          >
            <Clock4 className="h-4 w-4" /> {t("exportHours")}
          </button>
        </div>
      </div>

      {/* ─── CARD VIEW ─── */}
      {view === "card" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((e) => {
            const myLeads = leads.filter((l) => l.owner === e.name);
            const won = myLeads.filter((l) => l.status === "won").length;
            return (
              <Link
                key={e.id}
                to="/admin/employees/$employeeId"
                params={{ employeeId: e.id }}
                className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
              >
                {/* Card header */}
                <div
                  className="flex items-center gap-4 p-5 pb-4"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(var(--primary)/0.08), hsl(var(--primary)/0.02))",
                  }}
                >
                  <Avatar initials={e.avatar} photo={e.photo} name={e.name} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-base font-bold text-foreground">{e.name}</div>
                    <div className="text-xs text-muted-foreground">{e.role}</div>
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DEPT_COLORS[e.department] ?? "bg-secondary text-foreground"}`}
                    >
                      {e.department}
                    </span>
                  </div>
                  <div className="text-end">
                    <div className="font-mono text-2xl font-extrabold text-primary">{e.perf}%</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("performance")}
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-2">
                  <PerfBar value={e.perf} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 divide-x divide-border border-t border-border text-center">
                  <div className="py-3">
                    <div className="font-mono text-lg font-bold text-foreground">
                      {myLeads.length}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("leads")}
                    </div>
                  </div>
                  <div className="py-3">
                    <div className="font-mono text-lg font-bold text-emerald-600">{won}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("won")}
                    </div>
                  </div>
                  <div className="py-3">
                    <div className="inline-flex items-center gap-1 font-mono text-sm font-bold text-foreground">
                      <Clock4 className="h-3.5 w-3.5 text-primary" /> {hoursToday(e.name)}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("today")}
                    </div>
                  </div>
                </div>

                <div className="border-t border-border px-5 py-3">
                  <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary ring-1 ring-primary/20 transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {dir === "rtl" ? "عرض الملف" : "View Profile"}
                  </div>
                </div>
              </Link>
            );
          })}
          {sorted.length === 0 && (
            <div className="col-span-full rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No employees match your filters.
            </div>
          )}
        </div>
      )}

      {/* ─── TABLE VIEW ─── */}
      {view === "table" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  {(
                    [
                      ["name", t("name"), "text-start"],
                      ["role", t("role"), "text-start"],
                      ["department", t("department"), "text-start"],
                      ["leads", t("leads"), "text-center justify-center"],
                      ["won", t("won"), "text-center justify-center"],
                      ["perf", t("performance"), "text-center justify-center"],
                      ["today", t("today"), "text-center justify-center"],
                    ] as const
                  ).map(([k, label, align]) => (
                    <th
                      key={k}
                      className={`px-4 py-3 ${align} text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`}
                    >
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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.slice((page - 1) * pageSize, page * pageSize).map((e) => {
                  const myLeads = leads.filter((l) => l.owner === e.name);
                  const won = myLeads.filter((l) => l.status === "won").length;
                  return (
                    <tr key={e.id} className="transition hover:bg-primary/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AvatarSm initials={e.avatar} photo={e.photo} name={e.name} />
                          <div>
                            <div className="font-semibold text-foreground">{e.name}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {e.phone || shortId(e.id)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.role}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${DEPT_COLORS[e.department] ?? "bg-secondary text-foreground"}`}
                        >
                          {e.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-foreground">
                        {myLeads.length}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-emerald-600">
                        {won}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <PerfBar value={e.perf} />
                          </div>
                          <span className="font-mono text-xs font-bold text-primary">
                            {e.perf}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-foreground">
                        {hoursToday(e.name)}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <Link
                          to="/admin/employees/$employeeId"
                          params={{ employeeId: e.id }}
                          className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary hover:text-primary-foreground"
                        >
                          {dir === "rtl" ? "عرض" : "View"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No employees match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {Math.ceil(sorted.length / pageSize) > 1 && (
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, sorted.length)}{" "}
                  of {sorted.length} entries
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="px-2 text-xs font-semibold">
                    {page} / {Math.ceil(sorted.length / pageSize)}
                  </div>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(Math.ceil(sorted.length / pageSize), p + 1))
                    }
                    disabled={page === Math.ceil(sorted.length / pageSize)}
                    className="rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {exportOpen && <ExportHoursDialog onClose={() => setExportOpen(false)} />}
    </AppShell>
  );
}

function ExportHoursDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { activities, employees } = useStoreState();
  const today = new Date().toISOString().slice(0, 10);
  const sevenAgo = new Date();
  sevenAgo.setDate(sevenAgo.getDate() - 6);
  const [from, setFrom] = useState(sevenAgo.toISOString().slice(0, 10));
  const [to, setTo] = useState(today);

  const rows = useMemo(() => {
    const owners = Array.from(new Set(employees.map((e) => e.name)));
    const dates: string[] = [];
    const d = new Date(from);
    const end = new Date(to);
    while (d <= end) {
      dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    type Row = { emp: string; date: string; hours: string; totalMinutes: number };
    const out: Row[] = [];
    for (const owner of owners) {
      for (const date of dates) {
        const items = activities.filter((a) => a.owner === owner && a.dueDate === date);
        if (items.length === 0) continue;
        const total = items.reduce((s, a) => s + (a.estMinutes ?? 0), 0);
        out.push({ emp: owner, date, hours: (total / 60).toFixed(2) + "h", totalMinutes: total });
      }
    }
    return out;
  }, [activities, from, to, employees]);

  const download = () => {
    const header = ["Employee", "Date", "Hours"];
    const lines = [header.join(",")];
    for (const r of rows) lines.push([`"${r.emp}"`, r.date, r.hours].join(","));
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `working-hours_${from}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{t("exportHours")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{t("dailyWorkingHoursPerEmployee")}</p>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">{t("from")}</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-semibold text-muted-foreground">{t("to")}</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
        </div>
        <div className="mt-4 rounded-lg bg-secondary/50 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-muted-foreground">{t("preview")}</span>
            <span className="font-semibold text-foreground">{rows.length} rows</span>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-secondary/60 text-start">
                <tr>
                  <th className="px-2 py-1 text-start">{t("employee")}</th>
                  <th className="px-2 py-1 text-start">{t("date")}</th>
                  <th className="px-2 py-1 text-end">{t("hours")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground">
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1">{r.emp}</td>
                    <td className="px-2 py-1">{r.date}</td>
                    <td className="px-2 py-1 text-end">{r.hours}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-2 py-3 text-center text-muted-foreground">
                      {t("noActivityInRange")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
          >
            {t("cancel")}
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" /> Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
