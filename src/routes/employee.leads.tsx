import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { fmtMoney, type Lead, type LeadStatus } from "@/lib/mock-data";
import { actions, useStoreState } from "@/lib/store";
import type { LocationCity } from "@/lib/store";
import { useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Phone, Mail, MapPin, Calendar, ChevronRight, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { z } from "zod";

const leadSchema = z.object({
  company: z.string().trim().min(2, "Company is required (min 2 chars)").max(120, "Company too long"),
  contact: z.string().trim().min(2, "Client name is required").max(120, "Client name too long"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long").or(z.literal("")),
  industry: z.string().trim().max(80, "Industry too long").optional(),
  value: z.number().min(0, "Value must be ≥ 0").max(1_000_000_000, "Value too high"),
});

export const Route = createFileRoute("/employee/leads")({
  component: LeadsPage,
});

// Statuses are read dynamically from settings.stages


function LeadsPage() {
  const { t } = useI18n();
  const { leads, settings } = useStoreState();
  const isDetailRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith("/employee/leads/") && state.location.pathname !== "/employee/leads/",
  });
  const [editing, setEditing] = useState<Lead | "new" | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  if (isDetailRoute) return <Outlet />;

  const { profile } = useAuth();
  const ME = profile?.full_name_en || profile?.full_name_ar || "hafez Rahim";
  const safeCurrentName = ME.toLowerCase();
  
  const myLeads = leads.filter((l) => (l.owner || "").toLowerCase() === safeCurrentName);
  const filtered = statusFilter === "all" ? myLeads : myLeads.filter((l) => l.status === statusFilter);

  return (
    <AppShell panel="employee" user={{ name: ME, role: t("employee"), initials: ME.split(" ").map(w => w[0]).join("").substring(0,2).toUpperCase(), photo: profile?.avatar_url || "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" }} pageTitle={t("myLeads")}>
      <div className="sticky top-16 z-10 -mx-4 mb-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-xl md:border md:bg-card md:px-4 md:py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {filtered.length} {t("leads") || "leads"}
          </span>
          <button onClick={() => setEditing("new")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] active:scale-[0.98] hover:bg-primary/90">
            <Plus className="h-4 w-4" /> {t("addLead")}
          </button>
        </div>
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["all", ...settings.statuses] as const).map((s) => {
            const active = statusFilter === s;
            const stage = settings.stages.find((st) => st.key === s);
            const label = s === "all" ? "All" : (stage?.label ?? (t(s as any) ?? s));
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  active ? "bg-foreground text-background shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((l) => (
          <SwipeableLeadCard key={l.id} lead={l} onEdit={() => setEditing(l)} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">{t("noLeadsYet") || "No leads to show"}</div>
        )}
      </div>

      {editing && (
        <LeadFormModal initial={editing === "new" ? null : editing} locations={settings.locations} onClose={() => setEditing(null)} />
      )}
    </AppShell>
  );
}

function SwipeableLeadCard({ lead: l, onEdit }: { lead: Lead; onEdit: () => void }) {
  const { t } = useI18n();
  const { settings } = useStoreState();
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const startOffset = useRef(0);
  const dragging = useRef(false);
  const REVEAL = 160;

  const orderKeys = settings.statuses.filter((k) => k !== "won" && k !== "lost" && k !== "archived");
  const idx = orderKeys.indexOf(l.status);
  const next = idx >= 0 && idx < orderKeys.length - 1 ? orderKeys[idx + 1] : undefined;

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startOffset.current = offset;
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || startX.current == null) return;
    const dx = e.clientX - startX.current;
    setOffset(Math.max(-REVEAL, Math.min(0, startOffset.current + dx)));
  };
  const onPointerUp = () => {
    dragging.current = false;
    setOffset((cur) => (cur < -REVEAL / 2 ? -REVEAL : 0));
  };

  const advance = () => { if (next) actions.moveLead(l.id, next); setOffset(0); };
  const remove = () => {
    if (confirm(`${t("confirmDelete") || "Delete?"} (${l.company})`)) actions.removeLead(l.id);
    setOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="absolute inset-y-0 end-0 flex w-[160px] items-stretch">
        {next && (
          <button onClick={advance} className="flex flex-1 flex-col items-center justify-center gap-1 bg-emerald-500 text-[11px] font-bold text-white" aria-label={`Advance to ${next}`}>
            <ArrowRight className="h-4 w-4" />
            <span className="px-1 text-center leading-tight capitalize">{t(next as any) || next}</span>
          </button>
        )}
        <button onClick={remove} className="flex w-16 flex-col items-center justify-center gap-1 bg-rose-500 text-[11px] font-bold text-white" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
          <span>{t("delete")}</span>
        </button>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        className="relative bg-card p-4 transition-transform duration-200 ease-out"
      >
        <div className="flex items-start justify-between gap-2">
          <Link to="/employee/leads/$leadId" params={{ leadId: l.id }} className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold text-foreground">{l.company}</div>
            <div className="truncate text-xs text-muted-foreground">{l.contact} · {l.industry || "—"}</div>
          </Link>
          <StatusBadge status={l.status} label={t(l.status as any)} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <a
            href={l.email ? `mailto:${l.email}` : undefined}
            onClick={(e) => !l.email && e.preventDefault()}
            className={`flex items-center justify-center gap-1.5 rounded-lg bg-secondary/60 px-2 py-2 text-[11px] font-semibold transition active:scale-[0.97] ${l.email ? "text-foreground hover:bg-secondary" : "cursor-not-allowed text-muted-foreground/60"}`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate">Email</span>
          </a>
          <a
            href={(l as any).phone ? `tel:${(l as any).phone}` : undefined}
            onClick={(e) => !(l as any).phone && e.preventDefault()}
            className={`flex items-center justify-center gap-1.5 rounded-lg bg-secondary/60 px-2 py-2 text-[11px] font-semibold transition active:scale-[0.97] ${(l as any).phone ? "text-foreground hover:bg-secondary" : "cursor-not-allowed text-muted-foreground/60"}`}
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Call</span>
          </a>
          <button onClick={onEdit} className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary/60 px-2 py-2 text-[11px] font-semibold text-foreground transition active:scale-[0.97] hover:bg-secondary">
            <Pencil className="h-3.5 w-3.5" />
            <span>{t("edit")}</span>
          </button>
        </div>

        <Link
          to="/employee/leads/$leadId"
          params={{ leadId: l.id }}
          className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs transition hover:border-primary/40 hover:bg-secondary/40"
        >
          <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
            {l.expectedCloseDate ? (
              <>
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">Follow-up · <span className="font-semibold text-foreground">{l.expectedCloseDate}</span></span>
              </>
            ) : (
              <>
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span className="truncate">{l.city || l.source || "Details"}</span>
              </>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-bold text-foreground">{fmtMoney(l.value)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </Link>

        {l.probability !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full ${l.probability >= 70 ? "bg-emerald-500" : l.probability >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${l.probability}%` }} />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">{l.probability}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function LeadFormModal({ initial, locations, onClose }: { initial: Lead | null; locations: LocationCity[]; onClose: () => void }) {
  const { profile } = useAuth();
  const ME = profile?.full_name_en || profile?.full_name_ar || "hafez Rahim";
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { leadDistricts, settings, projects } = useStoreState();
  const [projectId, setProjectId] = useState("");
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
  const [company, setCompany] = useState(initial?.company ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [source, setSource] = useState(initial?.source ?? "Website");
  const [status, setStatus] = useState<LeadStatus>(initial?.status ?? "new");
  const [value, setValue] = useState(initial?.value ?? 0);
  const [country, setCountry] = useState<string>((initial as any)?.country ?? "Egypt");
  const [city, setCity] = useState(initial?.city ?? cities[0] ?? "Cairo");
  const [district, setDistrict] = useState(initial ? (leadDistricts[initial.id] ?? "") : "");
  const [street, setStreet] = useState(initial?.street ?? "");

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
    // Role-based safeguard: employees cannot link a lead to a project.
    const safePayload = {
      company: clean.company,
      contact: clean.contact,
      email: clean.email,
      industry: clean.industry ?? "",
      source,
      status,
      value: clean.value,
      city,
      country,
      street,
    } as any;
    let leadId: string;
    if (initial) {
      actions.updateLead(initial.id, safePayload);
      leadId = initial.id;
    } else {
      actions.addLead({ ...safePayload, owner: ME, lat: 30.0444, lng: 31.2357 });
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
          <Field label={t("project") ?? "Account"}>
            <select value={projectId} onChange={(e) => onProjectChange(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">{t("selectProjectPlaceholder") ?? "Select account..."}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label={t("company")} error={errors.company}><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" maxLength={120} aria-invalid={!!errors.company} className={`h-9 w-full rounded-lg border bg-background px-3 text-sm ${errors.company ? "border-rose-500" : "border-border"}`} /></Field>
          <Field label={t("client")} error={errors.contact}><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Client name" maxLength={120} aria-invalid={!!errors.contact} className={`h-9 w-full rounded-lg border bg-background px-3 text-sm ${errors.contact ? "border-rose-500" : "border-border"}`} /></Field>
          <Field label={t("companyEmail")} error={errors.email}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@company.com" maxLength={255} aria-invalid={!!errors.email} className={`h-9 w-full rounded-lg border bg-background px-3 text-sm ${errors.email ? "border-rose-500" : "border-border"}`} /></Field>
          <div className="hidden">
            <Field label={t("industry")} error={errors.industry}><input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Construction" maxLength={80} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" /></Field>
          </div>
          <div className="hidden">
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
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent">{t("cancel")}</button>
          <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{initial ? t("save") : t("create")}</button>
        </div>
      </div>
    </div>
  );
}


function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[11px] font-semibold text-rose-600">{error}</span>}
    </label>
  );
}