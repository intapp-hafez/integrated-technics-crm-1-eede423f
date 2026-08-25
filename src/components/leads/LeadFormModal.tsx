import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState, getProbabilityForStatus } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import type { LocationCity } from "@/lib/store";
import type { Lead, LeadStatus } from "@/lib/mock-data";
import { useRole } from "@/lib/role";
import { sbValidateLeadWon } from "@/lib/supabaseWrites";
import { toast } from "sonner";

interface Props {
  initial: Lead | null;
  locations: LocationCity[];
  onClose: () => void;
  allowOwnerChange?: boolean;
  defaultOwner?: string;
  filteredProjects?: import("@/lib/store").Project[];
}

export function LeadFormModal({
  initial,
  locations,
  onClose,
  allowOwnerChange = true,
  defaultOwner = "",
  filteredProjects,
}: Props) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const {
    leadDistricts,
    projects: allProjects,
    settings,
    activities,
    leadCatalogItems,
  } = useStoreState();
  const { isAdmin } = useRole();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const projects = filteredProjects ?? allProjects;
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
  const initialResolvedProjectId = (() => {
    if (!initial) return "";
    const rawPid = initial.projectId || (initial as any)?.project_id;
    if (rawPid && projects.some((p) => p.id === rawPid))
      return rawPid;

    // Match exact by company name or project client/name
    const co = (initial.company || "").trim().toLowerCase();
    const exact = projects.find(
      (p) =>
        (p.name || "").trim().toLowerCase() === co ||
        (p.client || "").trim().toLowerCase() === co,
    );
    if (exact) return exact.id;

    // Match by lead activities
    const latest = activities
      .filter((a) => a.leadId === initial.id && a.projectId)
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.dueDate).getTime() -
          new Date(a.createdAt || a.dueDate).getTime(),
      )[0];
    if (latest?.projectId && projects.some((p) => p.id === latest.projectId))
      return latest.projectId;

    // Match if company name contains project name or client name (e.g. "Central Park - Atrium - TMG")
    const partial = projects.find((p) => {
      const pName = (p.name || "").trim().toLowerCase();
      const pClient = (p.client || "").trim().toLowerCase();
      return (pName && co.includes(pName)) || (pClient && co.includes(pClient));
    });
    if (partial) return partial.id;

    const contactLower = (initial.contact || "").trim().toLowerCase();
    const byClient = projects.find(
      (p) =>
        (p.client || "").trim().toLowerCase() === contactLower ||
        (p.contactName || "").trim().toLowerCase() === contactLower,
    );
    return byClient?.id ?? "";
  })();

  const [projectId, setProjectId] = useState<string>(initialResolvedProjectId);
  const [code, setCode] = useState<string>((initial as any)?.code ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [contact, setContact] = useState(initial?.contact ?? "");
  const [phone, setPhone] = useState(() => {
    if (initial?.phone) return initial.phone;
    const p = projects.find((x) => x.id === initialResolvedProjectId);
    return p?.clientPhone ?? "";
  });
  const [email, setEmail] = useState(() => {
    if (initial?.email) return initial.email;
    const p = projects.find((x) => x.id === initialResolvedProjectId);
    return p?.clientEmail ?? "";
  });
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [source, setSource] = useState(initial?.source ?? "Website");
  const [status, setStatus] = useState<LeadStatus>(initial?.status ?? "new");
  const [value, setValue] = useState(initial?.value ?? 0);
  const [probability, setProbability] = useState(initial?.probability ?? 0);
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>(
    (initial as any)?.expectedCloseDate ?? "",
  );
  const [description, setDescription] = useState<string>((initial as any)?.description ?? "");
  const [tag, setTag] = useState<string>((initial as any)?.tag ?? "");
  const [country, setCountry] = useState<string>((initial as any)?.country ?? "Egypt");
  const [city, setCity] = useState(initial?.city ?? cities[0] ?? "Cairo");
  const [district, setDistrict] = useState(initial ? (leadDistricts[initial.id] ?? "") : "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [owner, setOwner] = useState<string>(
    initial?.owner ?? (defaultOwner || (teamEmployees[0]?.name ?? "")),
  );
  const districts = locations.find((c) => c.name === city)?.districts ?? [];

  const selectedProject = projects.find((p) => p.id === projectId);

  // Synchronize when initial lead or projects change
  useEffect(() => {
    if (!initial) return;
    if (initialResolvedProjectId && (!projectId || !projects.some((p) => p.id === projectId))) {
      setProjectId(initialResolvedProjectId);
    }
    const resolvedPid = projectId || initialResolvedProjectId;
    const matchedP = projects.find((x) => x.id === resolvedPid);
    if (!phone) {
      if (initial.phone) setPhone(initial.phone);
      else if (matchedP?.clientPhone) setPhone(matchedP.clientPhone);
    }
    if (!email) {
      if (initial.email) setEmail(initial.email);
      else if (matchedP?.clientEmail) setEmail(matchedP.clientEmail);
    }
  }, [initial, projects, initialResolvedProjectId, projectId, phone, email]);

  const onProjectChange = (pid: string) => {
    setProjectId(pid);
    const p = projects.find((x) => x.id === pid);
    if (p) {
      if (!initial) {
        setCompany(p.name);
        setContact(p.contactName || p.client);
        setIndustry(p.category || "");
        setValue(p.offeredValue ?? p.budget ?? 0);
      }
      if (p.clientEmail && (!email || email === "info@company.com" || email.includes("@ex.com"))) {
        setEmail(p.clientEmail);
      }
      if (p.clientPhone && !phone) {
        setPhone(p.clientPhone);
      }
    }
  };

  const CITY_COORDS: Record<string, [number, number]> = {
    Riyadh: [24.7136, 46.6753],
    Jeddah: [21.4858, 39.1925],
    Dammam: [26.4207, 50.0888],
    Khobar: [26.2172, 50.1971],
    Makkah: [21.3891, 39.8579],
    Madinah: [24.5247, 39.5692],
    Cairo: [30.0444, 31.2357],
    Alexandria: [31.2001, 29.9187],
    Giza: [30.0131, 31.2089],
    Hurghada: [27.2579, 33.8116],
    Luxor: [25.6872, 32.6396],
    "Port Said": [31.2653, 32.3019],
  };

  const submit = async () => {
    if (!company.trim()) return;
    setIsSubmitting(true);

    let finalStatus = status;
    let leadId: string = initial?.id || "";

    if (status === "won") {
      if (initial) {
        const hasCatalogItems = leadCatalogItems.some((l) => l.leadId === initial.id);
        const errs = await sbValidateLeadWon(initial.id, hasCatalogItems);
        if (errs.length > 0) {
          toast.error(`Cannot move to Won: ${errs.join(" ")}`);
          setIsSubmitting(false);
          return;
        }
      }
      if (!isAdmin) {
        finalStatus = "pending_approval";
        toast.success("Lead submitted for Admin approval");
      }
    }

    const coords = CITY_COORDS[city] || [30.0444, 31.2357];
    if (initial) {
      actions.updateLead(initial.id, {
        code: code || undefined,
        company,
        contact,
        phone: phone || undefined,
        email,
        industry,
        source,
        status: finalStatus,
        value,
        probability,
        city,
        street,
        owner,
        country,
        projectId: projectId || undefined,
        expectedCloseDate: expectedCloseDate || undefined,
        description: description || undefined,
        lat: coords[0],
        lng: coords[1],
        tag: tag || undefined,
      } as any);
      leadId = initial.id;
    } else {
      actions.addLead({
        code: code || undefined,
        company,
        contact,
        phone: phone || undefined,
        email,
        industry,
        source,
        status: finalStatus,
        value,
        probability,
        city,
        street,
        owner: owner || "",
        lat: coords[0],
        lng: coords[1],
        country,
        projectId: projectId || undefined,
        expectedCloseDate: expectedCloseDate || undefined,
        description: description || undefined,
        tag: tag || undefined,
      } as any);
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl"
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
        <div className="grid max-h-[75vh] grid-cols-3 gap-3 overflow-y-auto">
          {/* Full-width: Lead Name (code) */}
          <label className="col-span-3 block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Lead Name
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. Cairo Office Renovation"
              className="h-9 w-full rounded-lg border border-primary/40 bg-background px-3 text-sm font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {/* Row 1: Account | Client | Email | Phone */}
          <Field label={t("project")}>
            <select
              value={projectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">{t("selectProjectPlaceholder")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("client")}>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t("autoFilledFromProject")}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Phone">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+20 100 000 0000"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>

          {/* Row 1.5: Email (and maybe others later) */}
          <div className="col-span-3">
            <Field label={t("companyEmail")}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@company.com"
                className="h-9 w-1/3 rounded-lg border border-border bg-background px-3 text-sm"
              />
            </Field>
          </div>

          {/* Hidden fields */}
          <div className="hidden">
            <Field label={t("industry")}>
              <input
                value={industry}
                readOnly={!!selectedProject}
                onChange={(e) => setIndustry(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm read-only:bg-muted/40 read-only:text-muted-foreground"
              />
            </Field>
            <Field label={t("source")}>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {t(s.key as any)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Row 2: Status | Value | Probability */}
          <Field label={t("status")}>
            <select
              value={status}
              onChange={(e) => {
                const newStatus = e.target.value as LeadStatus;
                setStatus(newStatus);
                const prob = getProbabilityForStatus(newStatus);
                if (prob !== undefined) setProbability(prob);
              }}
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

          {/* Row 3: Expected Close Date | Industry | Tag */}
          <Field label="Expected Close Date">
            <input
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label={t("industry")}>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Construction"
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </Field>
          <Field label="Tag">
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option value="">Select Tag</option>
              <option value="Tender">Tender</option>
              <option value="OIH (Order in hand)">OIH (Order in hand)</option>
              <option value="Design Build">Design Build</option>
            </select>
          </Field>

          {/* Row 4: Assign to | Country | City */}
          {allowOwnerChange && (
            <Field label="Assign to">
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">—</option>
                {teamEmployees.map((e: any) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
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

          {/* Row 5: District */}
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
          {!allowOwnerChange && <div className="col-span-2" />}

          {/* Full-width: Street */}
          <label className="col-span-3 block">
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
          {/* Full-width: Description */}
          <label className="col-span-3 block">
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

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-5 py-2 text-sm font-bold text-muted-foreground transition hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {t("cancel")}
          </button>
          <button
            onClick={submit}
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {isSubmitting ? "Saving..." : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
