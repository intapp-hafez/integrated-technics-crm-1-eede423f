import { useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import type { LocationCity } from "@/lib/store";
import type { Lead, LeadStatus } from "@/lib/mock-data";

interface Props {
  initial: Lead | null;
  locations: LocationCity[];
  onClose: () => void;
  allowOwnerChange?: boolean;
  defaultOwner?: string;
}

export function LeadFormModal({ initial, locations, onClose, allowOwnerChange = true, defaultOwner = "" }: Props) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { leadDistricts, projects, employees, settings, activities } = useStoreState();
  const { teamEmployees } = useMyTeam();
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
    if (initial.projectId) return initial.projectId;
    const latest = activities
      .filter((a) => a.leadId === initial.id && a.projectId)
      .sort((a, b) => new Date(b.createdAt || b.dueDate).getTime() - new Date(a.createdAt || a.dueDate).getTime())[0];
    if (latest?.projectId) return latest.projectId;
    return projects.find((p) => p.name === initial.company)?.id ?? "";
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
  const [owner, setOwner] = useState<string>(initial?.owner ?? (defaultOwner || (teamEmployees[0]?.name ?? "")));
  const districts = locations.find((c) => c.name === city)?.districts ?? [];

  const selectedProject = projects.find((p) => p.id === projectId);

  const onProjectChange = (pid: string) => {
    setProjectId(pid);
    const p = projects.find((x) => x.id === pid);
    if (p) {
      setCompany(p.name);
      setContact(p.client);
      setIndustry(p.category || "");
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
      actions.addLead({ company, contact, email, industry, source, status, value, probability, city, street, owner: owner || "", lat: coords[0], lng: coords[1], country, projectId: projectId || undefined, expectedCloseDate: expectedCloseDate || undefined, description: description || undefined } as any);
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
          {allowOwnerChange && (
            <Field label="Assign to">
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
                <option value="">—</option>
                {teamEmployees.map((e: any) => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </Field>
          )}
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
