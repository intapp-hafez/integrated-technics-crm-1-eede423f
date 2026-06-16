import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import { shortId } from "@/lib/utils";
import { Search, Filter } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/manager/leads")({
  component: ManagerLeadsPage,
  head: () => ({ meta: [{ title: "Our Leads · INT-CRM" }] }),
});

function ManagerLeadsPage() {
  const isDetail = useRouterState({
    select: (s) => s.location.pathname.split("/manager/leads/")[1]?.length > 0,
  });
  if (isDetail) return <Outlet />;
  return <ManagerLeadsListPage />;
}

function ManagerLeadsListPage() {
  const { t, lang } = useI18n();
  const { leads, settings } = useStoreState();
  const { includesOwner, teamEmployees } = useMyTeam();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");

  const isAr = lang === "ar";
  const stageLabel = (k: string) =>
    settings.stages.find((s) => s.key === k)?.label ?? (t(k as any) ?? k);

  const teamLeads = useMemo(
    () => leads.filter((l) => includesOwner(l.owner)),
    [leads, includesOwner],
  );

  const filtered = useMemo(() => {
    return teamLeads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (owner !== "all" && l.owner !== owner) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !(
            l.company?.toLowerCase().includes(s) ||
            l.contact?.toLowerCase().includes(s) ||
            l.id.toLowerCase().includes(s) ||
            l.city?.toLowerCase().includes(s)
          )
        )
          return false;
      }
      return true;
    });
  }, [teamLeads, q, status, owner]);

  const totalValue = filtered.reduce((s, l) => s + (l.value || 0), 0);
  const wonCount = filtered.filter((l) => l.status === "won").length;

  const user = {
    name: "hafez Rahim",
    role: t("manager"),
    initials: "HR",
    photo:
      "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };

  return (
    <AppShell panel="manager" user={user} pageTitle={isAr ? "فرص فريقنا" : "Our Leads"}>
      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isAr ? "إجمالي الفرص" : "Total Leads"}
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold text-foreground">{filtered.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isAr ? "القيمة الإجمالية" : "Pipeline Value"}
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold text-primary">{fmtMoney(totalValue)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isAr ? "تم الفوز" : "Won"}
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-600">{wonCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? "ابحث بالشركة أو الجهة..." : "Search company, contact, city..."}
            className="w-full rounded-lg border border-border bg-card ps-9 pe-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="all">{isAr ? "كل الحالات" : "All statuses"}</option>
          {settings.stages.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <option value="all">{isAr ? "كل الفريق" : "All team"}</option>
          {teamEmployees.map((e) => (
            <option key={e.id} value={e.name}>
              {e.name}
            </option>
          ))}
        </select>
        <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          <Filter className="h-3 w-3" />
          {filtered.length} / {teamLeads.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("company")}</th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("contact")}</th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("owner")}</th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("status")}</th>
                <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("value")}</th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{isAr ? "المدينة" : "City"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((l) => (
                <tr key={l.id} className="transition hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <Link
                      to="/manager/leads/$leadId"
                      params={{ leadId: l.id }}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {l.company}
                    </Link>
                    <div className="font-mono text-[10px] text-muted-foreground">{shortId(l.id)}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.contact}</td>
                  <td className="px-4 py-3 text-foreground">{l.owner || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} label={stageLabel(l.status)} />
                  </td>
                  <td className="px-4 py-3 text-end font-mono font-semibold text-foreground">{fmtMoney(l.value || 0)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.city || "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {isAr ? "لا توجد فرص لعرضها" : "No leads to show for your team."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
