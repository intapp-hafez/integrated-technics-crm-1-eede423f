import { LeadFormModal } from "@/components/leads/LeadFormModal";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney, type Lead, type LeadStatus } from "@/lib/mock-data";
import { actions, useStoreState, type LocationCity } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import { shortId } from "@/lib/utils";
import { Search, Filter, Plus, X, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ExcelImportModal } from "@/components/ExcelImportModal";
import { Download } from "lucide-react";
import { filterMyProjects, isProjectMemberOf } from "@/lib/employeeProjects";
import type { Project } from "@/lib/store";

const leadSchema = z.object({
  company: z
    .string()
    .trim()
    .min(2, "Company is required (min 2 chars)")
    .max(120, "Company too long"),
  contact: z.string().trim().min(2, "Client name is required").max(120, "Client name too long"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email too long")
    .or(z.literal("")),
  industry: z.string().trim().max(80, "Industry too long").optional(),
  value: z.number().min(0, "Value must be ≥ 0").max(1_000_000_000, "Value too high"),
});

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
  const { leads, settings, projects, activities } = useStoreState();
  const { includesLead, teamEmployees } = useMyTeam();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const [editing, setEditing] = useState<Lead | "new" | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [closingThisMonthFilter, setClosingThisMonthFilter] = useState(false);
  const [next7DaysFilter, setNext7DaysFilter] = useState(false);
  const [next15DaysFilter, setNext15DaysFilter] = useState(false);
  const [noActivitiesFilter, setNoActivitiesFilter] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [
    q,
    status,
    owner,
    closingThisMonthFilter,
    next7DaysFilter,
    next15DaysFilter,
    noActivitiesFilter,
  ]);

  const isAr = lang === "ar";
  const stageLabel = (k: string) =>
    settings.stages.find((s) => s.key === k)?.label ?? t(k as any) ?? k;

  const teamLeads = useMemo(() => leads.filter((l) => includesLead(l)), [leads, includesLead]);

  // Projects where at least one team member is a member
  const teamProjects = useMemo(
    () =>
      projects.filter((p) =>
        teamEmployees.some((e) =>
          isProjectMemberOf(p, {
            profileId: (e as any).profileId,
            userId: (e as any).userId ?? (e as any).id,
            name: e.name,
          }),
        ),
      ),
    [projects, teamEmployees],
  );

  const filtered = useMemo(() => {
    return teamLeads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (owner !== "all" && l.owner !== owner) return false;

      let dateFilterPass = true;
      if (closingThisMonthFilter || next7DaysFilter || next15DaysFilter) {
        if (!l.expectedCloseDate) {
          dateFilterPass = false;
        } else {
          const d = new Date(l.expectedCloseDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tTime = today.getTime();
          const dTime = d.getTime();
          let pass = false;
          if (closingThisMonthFilter) {
            if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())
              pass = true;
          }
          if (next7DaysFilter && !pass) {
            const diffDays = (dTime - tTime) / (1000 * 60 * 60 * 24);
            if (diffDays >= 0 && diffDays <= 7) pass = true;
          }
          if (next15DaysFilter && !pass) {
            const diffDays = (dTime - tTime) / (1000 * 60 * 60 * 24);
            if (diffDays >= 0 && diffDays <= 15) pass = true;
          }
          dateFilterPass = pass;
        }
      }
      if (!dateFilterPass) return false;

      if (noActivitiesFilter) {
        const leadActivityCount = activities.filter((a) => a.leadId === l.id).length;
        if (leadActivityCount > 0) return false;
      }

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
  }, [
    teamLeads,
    q,
    status,
    owner,
    closingThisMonthFilter,
    next7DaysFilter,
    next15DaysFilter,
    noActivitiesFilter,
    activities,
  ]);

  const totalValue = filtered.reduce((s, l) => s + (l.value || 0), 0);
  const wonCount = filtered.filter((l) => l.status === "won").length;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const { profile } = useAuth();
  const meName = profile?.full_name_en || profile?.full_name_ar || "";

  const user = {
    name: meName,
    role: t("manager"),
    initials:
      meName
        .split(/\s+/)
        .filter(Boolean)
        .map((w: string) => w[0]?.toUpperCase())
        .join("")
        .slice(0, 2) || "HR",
    photo:
      profile?.avatar_url ||
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
          <div className="mt-1 font-mono text-2xl font-extrabold text-foreground">
            {filtered.length}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isAr ? "القيمة الإجمالية" : "Pipeline Value"}
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold text-primary">
            {fmtMoney(totalValue)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isAr ? "تم الفوز" : "Won"}
          </div>
          <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-600">{wonCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs"
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
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs"
          >
            <option value="all">{isAr ? "كل الفريق" : "All team"}</option>
            {teamEmployees.map((e) => (
              <option key={e.id} value={e.name}>
                {e.name}
              </option>
            ))}
          </select>
          <button
            disabled
            title={
              isAr
                ? "نعتذر – هذا الخيار غير متاح حالياً. شكراً لتفهمكم."
                : "We apologise – this option is currently not working. Thanks for your understanding."
            }
            className="shrink-0 inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-medium opacity-40"
          >
            <Download className="h-3.5 w-3.5 rotate-180" /> {t("importExcel")}
          </button>
          <button
            onClick={() => setEditing("new")}
            className="shrink-0 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-brand)] active:scale-[0.98] hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> {t("addLead")}
          </button>
          <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            <Filter className="h-3 w-3" />
            {filtered.length} / {teamLeads.length}
          </span>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={isAr ? "ابحث بالشركة أو الجهة..." : "Search company, contact, city..."}
            className="h-9 w-full rounded-lg border border-border bg-card ps-9 pe-3 text-xs outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 py-2 mt-2 border-t border-border">
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={closingThisMonthFilter}
              onChange={(e) => setClosingThisMonthFilter(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            {isAr ? "يغلق هذا الشهر" : "Closing This Month"}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={next7DaysFilter}
              onChange={(e) => setNext7DaysFilter(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            {isAr ? "خلال 7 أيام" : "Next 7 Days"}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={next15DaysFilter}
              onChange={(e) => setNext15DaysFilter(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            {isAr ? "خلال 15 يوم" : "Next 15 Days"}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={noActivitiesFilter}
              onChange={(e) => setNoActivitiesFilter(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            {isAr ? "بدون نشاطات" : "No Activities"}
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "العميل/الشركة" : "Lead Name"}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("contact")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("owner")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("status")}
                </th>
                <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("value")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "المدينة" : "City"}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "تاريخ الإغلاق المتوقع" : "Expected Close"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((l) => (
                <tr
                  key={l.id}
                  className={`transition ${
                    (l.value || 0) === 0 ? "bg-rose-50/50 hover:bg-rose-50" : "hover:bg-primary/5"
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <Link
                          to="/manager/leads/$leadId"
                          params={{ leadId: l.id }}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {l.code || l.company}
                        </Link>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {shortId(l.id)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const relProj = projects.find(
                            (p) =>
                              p.id === (l as any).projectId ||
                              p.id === (l as any).project_id ||
                              p.name === l.company ||
                              p.client === l.company,
                          );
                          setEditing({
                            ...l,
                            projectId: l.projectId || relProj?.id,
                            phone: l.phone || relProj?.clientPhone || "",
                          });
                        }}
                        className="text-muted-foreground hover:text-primary ms-auto"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-foreground font-medium">{l.contact}</div>
                    {(() => {
                      const relatedProject = projects.find(
                        (p) => p.id === (l as any).projectId || p.id === (l as any).project_id,
                      );
                      const displayPhone = l.phone || relatedProject?.clientPhone;
                      return displayPhone ? (
                        <div className="text-xs text-muted-foreground opacity-90">
                          {displayPhone}
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-foreground">{l.owner || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} label={stageLabel(l.status)} />
                  </td>
                  <td className="px-4 py-3 text-end font-mono font-semibold">
                    {(l.value || 0) === 0 ? (
                      <div className="flex flex-col items-end">
                        <span className="text-rose-600">{fmtMoney(0)}</span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-rose-500 font-sans">
                          <span aria-hidden>⚠</span> {t("noValue" as any) || "No Value"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-foreground">{fmtMoney(l.value)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.city || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {l.expectedCloseDate ? new Date(l.expectedCloseDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {isAr ? "لا توجد فرص لعرضها" : "No leads to show for your team."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="border-t border-border p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)}{" "}
                of {filtered.length} entries
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
                  {page} / {totalPages}
                </div>
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

      {editing && (
        <LeadFormModal
          initial={editing === "new" ? null : editing}
          locations={settings.locations}
          filteredProjects={teamProjects}
          onClose={() => setEditing(null)}
        />
      )}
      {showImport && <ExcelImportModal type="leads" onClose={() => setShowImport(false)} />}
    </AppShell>
  );
}
