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
  const { leads, settings } = useStoreState();
  const { includesOwner, teamEmployees } = useMyTeam();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const [editing, setEditing] = useState<Lead | "new" | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setPage(1);
  }, [q, status, owner]);

  const isAr = lang === "ar";
  const stageLabel = (k: string) =>
    settings.stages.find((s) => s.key === k)?.label ?? t(k as any) ?? k;

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
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const { profile } = useAuth();
  const meName = profile?.full_name_en || profile?.full_name_ar || "hafez Rahim";

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
                ? "نعتذر — هذا الخيار غير متاح حالياً. شكراً لتفهمكم."
                : "We apologise — this option is currently not working. Thanks for your understanding."
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
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("company")}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((l) => (
                <tr key={l.id} className="transition hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <Link
                          to="/manager/leads/$leadId"
                          params={{ leadId: l.id }}
                          className="font-semibold text-foreground hover:text-primary"
                        >
                          {l.company}
                        </Link>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {shortId(l.id)}
                        </div>
                      </div>
                      <button
                        onClick={() => setEditing(l)}
                        className="text-muted-foreground hover:text-primary ms-auto"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.contact}</td>
                  <td className="px-4 py-3 text-foreground">{l.owner || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} label={stageLabel(l.status)} />
                  </td>
                  <td className="px-4 py-3 text-end font-mono font-semibold text-foreground">
                    {fmtMoney(l.value || 0)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.city || "—"}</td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
          teamEmployees={teamEmployees}
          user={user}
          onClose={() => setEditing(null)}
        />
      )}
      {showImport && <ExcelImportModal type="leads" onClose={() => setShowImport(false)} />}
    </AppShell>
  );
}

function LeadFormModal({
  initial,
  locations,
  teamEmployees,
  user,
  onClose,
}: {
  initial: Lead | null;
  locations: LocationCity[];
  teamEmployees: any[];
  user: any;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const {
    leadDistricts,
    settings,
    projects,
    profile: myProfile,
    projectRequests,
    activities,
  } = useStoreState();
  const [projectId, setProjectId] = useState(() => {
    if (!initial) return "";
    if (initial.projectId) return initial.projectId;
    const latest = activities
      .filter((a) => a.leadId === initial.id && a.projectId)
      .sort((a, b) => new Date(b.createdAt || b.dueDate).getTime() - new Date(a.createdAt || a.dueDate).getTime())[0];
    if (latest?.projectId) return latest.projectId;
    return projects.find((p) => p.name === initial.company)?.id ?? "";
  });

  const approvedRequests = (projectRequests || []).filter(
    (req: any) => req.status === "approved" && req.requested_by === myProfile.profileId,
  );
  const requestedProjectIds = approvedRequests
    .map((req: any) => req.created_project_id)
    .filter(Boolean);
  const requestedProjectNames = new Set(
    approvedRequests.map((req: any) => req.name_en?.trim().toLowerCase()).filter(Boolean),
  );

  const myProjects = filterMyProjects(projects as Project[], {
    profileId: myProfile.profileId,
    userId: myProfile.userId ?? user?.id,
    name: myProfile.name,
  }).concat(
    (projects as Project[]).filter(
      (p) =>
        (requestedProjectIds.includes(p.id) ||
          requestedProjectNames.has(p.name?.trim().toLowerCase())) &&
        !isProjectMemberOf(p, {
          profileId: myProfile.profileId,
          userId: myProfile.userId ?? user?.id,
          name: myProfile.name,
        }),
    ),
  );
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
  const [company, setCompany] = useState(initial?.company ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [source, setSource] = useState(initial?.source ?? "Website");
  const [status, setStatus] = useState<LeadStatus>(initial?.status ?? "new");
  const [value, setValue] = useState(initial?.value ?? 0);
  const [probability, setProbability] = useState(initial?.probability ?? 0);
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>(
    (initial as any)?.expectedCloseDate ?? "",
  );
  const [description, setDescription] = useState<string>((initial as any)?.description ?? "");
  const [country, setCountry] = useState<string>((initial as any)?.country ?? "Egypt");
  const [city, setCity] = useState(initial?.city ?? cities[0] ?? "Cairo");
  const [district, setDistrict] = useState(initial ? (leadDistricts[initial.id] ?? "") : "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [owner, setOwner] = useState<string>(initial?.owner ?? user.name);

  const districts = locations.find((c) => c.name === city)?.districts ?? [];
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const submit = () => {
    const parsed = leadSchema.safeParse({ company, contact, email, industry, value });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as string;
        if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    const clean = parsed.data;

    const safePayload = {
      company: clean.company,
      contact: clean.contact,
      email: clean.email,
      industry: clean.industry ?? "",
      source,
      status,
      value: clean.value,
      probability,
      city,
      country,
      street,
      owner,
      projectId: projectId || undefined,
      expectedCloseDate: expectedCloseDate || undefined,
      description: description || undefined,
    } as any;
    let leadId: string;
    if (initial) {
      actions.updateLead(initial.id, safePayload);
      leadId = initial.id;
    } else {
      actions.addLead({ ...safePayload, lat: 30.0444, lng: 31.2357 });
      const latest = (
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("int-crm:leads") || "[]")
          : []
      ) as Lead[];
      leadId = latest[0]?.id ?? "";
    }
    if (leadId) actions.setLeadLocation(leadId, city, district);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            {initial ? `${t("edit")} ${t("leads")}` : t("addLead")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
          <Field label={t("account" as any) ?? "Account"}>
            <select
              value={projectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">
                {t("selectAccountPlaceholder" as any) ?? "Select account..."}
              </option>
              {myProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("company")} error={errors.company}>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              maxLength={120}
              aria-invalid={!!errors.company}
              className={`h-9 w-full rounded-lg border bg-background px-3 text-sm ${errors.company ? "border-rose-500" : "border-border"}`}
            />
          </Field>
          <Field label={t("client")} error={errors.contact}>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Client name"
              maxLength={120}
              aria-invalid={!!errors.contact}
              className={`h-9 w-full rounded-lg border bg-background px-3 text-sm ${errors.contact ? "border-rose-500" : "border-border"}`}
            />
          </Field>
          <Field label={t("companyEmail")} error={errors.email}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@company.com"
              maxLength={255}
              aria-invalid={!!errors.email}
              className={`h-9 w-full rounded-lg border bg-background px-3 text-sm ${errors.email ? "border-rose-500" : "border-border"}`}
            />
          </Field>
          <Field label="Assign to">
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value={user.name}>{user.name} (Me)</option>
              {teamEmployees
                .filter((emp) => emp.name !== user.name)
                .map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={t("status")}>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`${t("value")} ($)`}>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Probability %">
            <input
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              placeholder="0"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Expected Close Date">
            <input
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label={t("industry")} error={errors.industry}>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Construction"
              maxLength={80}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Country">
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Egypt"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label={t("city")}>
            <select
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setDistrict("");
              }}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {cityLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("district")}>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">—</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {districtLabel(city, d)}
                </option>
              ))}
            </select>
          </Field>
          <label className="sm:col-span-2 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("street")}
            </span>
            <input
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="e.g. 10 Abbas El-Akkad St."
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="sm:col-span-2 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief notes about this lead..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] font-semibold text-rose-600">{error}</span>}
    </label>
  );
}
