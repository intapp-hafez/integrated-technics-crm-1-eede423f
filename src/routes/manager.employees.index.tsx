import { createFileRoute, Link } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import { LayoutGrid, List, TrendingUp, Clock4, Phone, Mail } from "lucide-react";
import logo from "@/assets/logo.png";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/manager/employees/")({
  component: ManagerEmployeesPage,
  head: () => ({ meta: [{ title: "My Team · INT-CRM" }] }),
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

function Avatar({
  initials,
  photo,
  name,
  size = "md",
}: {
  initials: string;
  photo?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const s =
    size === "lg" ? "h-16 w-16 text-xl" : size === "md" ? "h-12 w-12 text-sm" : "h-8 w-8 text-xs";
  if (photo) {
    return (
      <img
        src={photo}
        alt={name ?? initials}
        loading="lazy"
        className={`${s} shrink-0 rounded-full object-cover ring-2 ring-primary/30 shadow-[var(--shadow-brand)]`}
      />
    );
  }
  return (
    <div
      className={`${s} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 font-bold text-primary-foreground shadow-[var(--shadow-brand)]`}
    >
      {initials}
    </div>
  );
}

function ManagerEmployeesPage() {
  const { t, dir } = useI18n();
  const { activities, leads } = useStoreState();
  const { teamEmployees: employees } = useMyTeam();
  const [view, setView] = useState<"card" | "table">("card");
  const [dept, setDept] = useState("all");
  const today = new Date().toISOString().slice(0, 10);

  const depts = ["all", ...Array.from(new Set(employees.map((e) => e.department)))];

  const filtered = useMemo(
    () => (dept === "all" ? employees : employees.filter((e) => e.department === dept)),
    [dept, employees],
  );

  const empLeads = (name: string) => leads.filter((l) => l.owner === name);
  const hoursToday = (name: string) => {
    const mins = activities
      .filter((a) => a.owner === name && a.dueDate === today)
      .reduce((s, a) => s + (a.estMinutes ?? 0), 0);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return mins ? (h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`) : "—";
  };

  const user = {
    name: "",
    role: t("manager"),
    initials: "HR",
    photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };

  return (
    <AppShell panel="manager" user={user} pageTitle={t("myTeam")}>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Dept filter */}
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

        {/* View toggle */}
        <div className="ms-auto inline-flex rounded-lg border border-border bg-card p-1">
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
      </div>

      {/* ─── CARD VIEW ─── */}
      {view === "card" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => {
            const myLeads = empLeads(e.name);
            const won = myLeads.filter((l) => l.status === "won").length;
            const targetPerc = e.annualTarget
              ? Math.round(((e.achievedTarget ?? 0) / e.annualTarget) * 100)
              : e.perf;
            const perfColor =
              targetPerc >= 100
                ? "text-emerald-500"
                : targetPerc >= 75
                  ? "text-amber-500"
                  : "text-rose-500";
            const perfBg =
              targetPerc >= 100
                ? "from-emerald-400 to-emerald-600"
                : targetPerc >= 75
                  ? "from-amber-400 to-amber-600"
                  : "from-rose-400 to-rose-600";
            return (
              <div
                key={e.id}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-primary/30"
              >
                {/* ── TOP-LEFT orange triangle corner ── */}
                <div
                  className="absolute top-0 left-0 w-0 h-0 z-10"
                  style={{
                    borderTop: "72px solid hsl(var(--primary))",
                    borderRight: "72px solid transparent",
                  }}
                />
                {/* ── BOTTOM-RIGHT orange triangle corner ── */}
                <div
                  className="absolute bottom-0 right-0 w-0 h-0 z-10"
                  style={{
                    borderBottom: "72px solid hsl(var(--primary))",
                    borderLeft: "72px solid transparent",
                  }}
                />

                {/* ── COMPANY BRANDING top-right ── */}
                <div className="absolute top-3 right-4 z-20 flex flex-col items-end gap-0.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20 p-1">
                    <img
                      src={logo}
                      alt="INT-CRM Logo"
                      className="h-full w-full object-contain drop-shadow-sm"
                    />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary">
                    INT-CRM
                  </span>
                </div>

                {/* ── PHOTO BLOCK ── */}
                <div className="flex justify-center pt-6 pb-2">
                  {e.photo ? (
                    <img
                      src={e.photo}
                      alt={e.name}
                      loading="lazy"
                      className="h-28 w-28 rounded-xl object-cover shadow-lg ring-2 ring-primary/20"
                    />
                  ) : (
                    <div className="h-28 w-28 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-500 text-4xl font-extrabold text-white shadow-lg ring-2 ring-primary/20">
                      {e.avatar}
                    </div>
                  )}
                </div>

                {/* ── NAME + ROLE ── */}
                <div className="px-5 text-start">
                  <div className="font-display text-xl font-extrabold leading-tight text-foreground">
                    {e.name}
                  </div>
                  <div className="mt-2">
                    <span className="inline-block rounded-md bg-primary px-3 py-1 text-xs font-bold text-white tracking-wide shadow-sm">
                      {e.role}
                    </span>
                  </div>
                </div>

                {/* ── DIVIDER ── */}
                <div className="mx-5 my-3 border-t border-dashed border-border" />

                {/* ── INFO ROWS ── */}
                <div className="px-5 space-y-1.5 text-[11px] font-medium">
                  <div className="flex gap-2">
                    <span className="w-14 font-bold text-foreground">
                      {dir === "rtl" ? "القسم" : "Dept"}
                    </span>
                    <span className="text-muted-foreground">: {e.department}</span>
                  </div>
                  {e.email && (
                    <div className="flex gap-2 min-w-0">
                      <span className="w-14 shrink-0 font-bold text-foreground">
                        {dir === "rtl" ? "الإيميل" : "Email"}
                      </span>
                      <span className="truncate text-muted-foreground">: {e.email}</span>
                    </div>
                  )}
                  {e.phone && (
                    <div className="flex gap-2">
                      <span className="w-14 font-bold text-foreground">
                        {dir === "rtl" ? "الهاتف" : "Phone"}
                      </span>
                      <span className="font-mono text-muted-foreground">: {e.phone}</span>
                    </div>
                  )}
                </div>

                {/* ── STATS ROW ── */}
                <div className="mx-5 mt-3 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-secondary/50 text-center">
                  <div className="py-2">
                    <div className="font-mono text-sm font-extrabold text-foreground">
                      {myLeads.length}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {t("leads")}
                    </div>
                  </div>
                  <div className="py-2">
                    <div className="font-mono text-sm font-extrabold text-emerald-600">{won}</div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {t("won")}
                    </div>
                  </div>
                  <div className="py-2">
                    <div className="font-mono text-sm font-extrabold text-foreground">
                      {hoursToday(e.name)}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {t("today")}
                    </div>
                  </div>
                </div>

                {/* ── PERFORMANCE BAR ── */}
                <div className="mx-5 mt-3">
                  <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                    <span className="text-muted-foreground uppercase tracking-wider">
                      {t("performance")}
                    </span>
                    <span className={perfColor}>{targetPerc}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${perfBg} transition-all duration-700`}
                      style={{ width: `${Math.min(targetPerc, 100)}%` }}
                    />
                  </div>
                </div>

                {/* ── BARCODE FOOTER ── */}
                <div className="mt-4 flex items-center gap-2 border-t border-border bg-secondary/30 px-5 py-2.5">
                  <div
                    className="flex flex-1 items-end gap-[2px] overflow-hidden"
                    style={{ height: 28 }}
                  >
                    {Array.from({ length: 34 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-foreground/40 rounded-[1px]"
                        style={{
                          width: i % 3 === 0 ? 3 : 2,
                          height: i % 5 === 0 ? 28 : i % 2 === 0 ? 20 : 24,
                        }}
                      />
                    ))}
                  </div>
                  <Link
                    to="/manager/employees/$employeeId"
                    params={{ employeeId: e.id }}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-primary/90"
                  >
                    <TrendingUp className="h-3 w-3" />
                    {dir === "rtl" ? "عرض" : "View"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── TABLE VIEW ─── */}
      {view === "table" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr>
                  <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("name")}
                  </th>
                  <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("role")}
                  </th>
                  <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("department")}
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("leads")}
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("won")}
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("performance")}
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("today")}
                  </th>
                  <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((e) => {
                  const myLeads = empLeads(e.name);
                  const won = myLeads.filter((l) => l.status === "won").length;
                  return (
                    <tr key={e.id} className="transition hover:bg-primary/5">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initials={e.avatar} photo={e.photo} name={e.name} size="sm" />
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
                          to="/manager/employees/$employeeId"
                          params={{ employeeId: e.id }}
                          className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-primary/20 hover:bg-primary hover:text-primary-foreground"
                        >
                          {dir === "rtl" ? "عرض" : "View"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}
