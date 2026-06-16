import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name_en: z.string().trim().min(2).max(120),
  name_ar: z.string().trim().max(120).optional().or(z.literal("")),
  description_en: z.string().trim().max(2000).optional().or(z.literal("")),
  description_ar: z.string().trim().max(2000).optional().or(z.literal("")),
  category_en: z.string().trim().max(80).optional().or(z.literal("")),
  category_ar: z.string().trim().max(80).optional().or(z.literal("")),
  project_type_en: z.string().trim().max(80).optional().or(z.literal("")),
  project_type_ar: z.string().trim().max(80).optional().or(z.literal("")),
  city_en: z.string().trim().max(80).optional().or(z.literal("")),
  city_ar: z.string().trim().max(80).optional().or(z.literal("")),
  district_en: z.string().trim().max(80).optional().or(z.literal("")),
  district_ar: z.string().trim().max(80).optional().or(z.literal("")),
  street_en: z.string().trim().max(120).optional().or(z.literal("")),
  street_ar: z.string().trim().max(120).optional().or(z.literal("")),
  budget: z.coerce.number().min(0).max(1e12).optional(),
  offered_value: z.coerce.number().min(0).max(1e12).optional(),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  competitors: z.string().max(500).optional().or(z.literal("")),
  client_name_en: z.string().trim().min(2).max(120),
  client_name_ar: z.string().trim().max(120).optional().or(z.literal("")),
  contact_name_en: z.string().trim().min(2).max(120),
  contact_name_ar: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().regex(/^[0-9 +()\-]{6,25}$/, "Invalid phone"),
});

type LocRow = { city_en: string; city_ar: string | null; districts_en: string[] | null; districts_ar: string[] | null };
type Pair = { en: string; ar: string };

// Fallback pairs if DB has no rows yet
const FALLBACK_CATEGORIES: Pair[] = [
  { en: "Healthcare Build", ar: "إنشاءات صحية" },
  { en: "Interior Fit-out", ar: "تشطيبات داخلية" },
  { en: "Corporate Fit-out", ar: "تشطيبات شركات" },
  { en: "Renovation", ar: "تجديد" },
  { en: "Retail Construction", ar: "إنشاءات تجزئة" },
  { en: "New Construction", ar: "إنشاء جديد" },
  { en: "Civil Works", ar: "أعمال مدنية" },
  { en: "MEP Works", ar: "أعمال كهروميكانيكية" },
  { en: "Finishing Works", ar: "أعمال تشطيبات" },
  { en: "Landscaping", ar: "تنسيق الحدائق" },
  { en: "Infrastructure", ar: "بنية تحتية" },
  { en: "Demolition", ar: "أعمال هدم" },
  { en: "Maintenance", ar: "صيانة" },
  { en: "Design & Build", ar: "تصميم وتنفيذ" },
  { en: "Turnkey Project", ar: "مشروع تسليم مفتاح" },
];
const FALLBACK_TYPES: Pair[] = [
  { en: "Hospitality", ar: "فندقي" },
  { en: "Retail", ar: "تجزئة" },
  { en: "Commercial", ar: "تجاري" },
  { en: "Healthcare", ar: "صحي" },
  { en: "Residential", ar: "سكني" },
  { en: "Office", ar: "مكاتب" },
  { en: "Industrial", ar: "صناعي" },
  { en: "Educational", ar: "تعليمي" },
  { en: "Government", ar: "حكومي" },
  { en: "Mixed-Use", ar: "متعدد الاستخدامات" },
  { en: "Warehouse / Logistics", ar: "مستودعات / لوجستيات" },
  { en: "Restaurant & F&B", ar: "مطاعم وأغذية" },
  { en: "Showroom", ar: "صالة عرض" },
  { en: "Clinic", ar: "عيادة" },
  { en: "Hospital", ar: "مستشفى" },
  { en: "Hotel", ar: "فندق" },
  { en: "Mall", ar: "مول تجاري" },
  { en: "Villa", ar: "فيلا" },
  { en: "Apartment Building", ar: "مبنى سكني" },
  { en: "Sports Facility", ar: "منشأة رياضية" },
];

export function ProjectRequestDialog({ profileId, onClose, onSubmitted }: { profileId?: string | null; onClose: () => void; onSubmitted?: () => void }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState<LocRow[]>([]);
  const [categories, setCategories] = useState<Pair[]>(FALLBACK_CATEGORIES);
  const [types, setTypes] = useState<Pair[]>(FALLBACK_TYPES);

  useEffect(() => {
    (async () => {
      const [locRes, projRes] = await Promise.all([
        supabase.from("locations").select("city_en, city_ar, districts_en, districts_ar").order("city_en"),
        supabase.from("projects").select("category_en, category_ar, project_type_en, project_type_ar"),
      ]);
      if (locRes.data) setLocations(locRes.data as LocRow[]);
      if (projRes.data) {
        const catMap = new Map<string, string>();
        const typeMap = new Map<string, string>();
        for (const p of projRes.data as any[]) {
          if (p.category_en) catMap.set(p.category_en, p.category_ar ?? "");
          if (p.project_type_en) typeMap.set(p.project_type_en, p.project_type_ar ?? "");
        }
        const cats = [...catMap.entries()].map(([en, ar]) => ({ en, ar }));
        const tps = [...typeMap.entries()].map(([en, ar]) => ({ en, ar }));
        if (cats.length) setCategories(cats);
        if (tps.length) setTypes(tps);
      }
    })();
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(s => ({ ...s, [k]: e.target.value }));

  const selectedCity = useMemo(() => locations.find(l => l.city_en === v.city_en), [locations, v.city_en]);
  const districtPairs = useMemo<Pair[]>(() => {
    if (!selectedCity) return [];
    const en = selectedCity.districts_en ?? [];
    const ar = selectedCity.districts_ar ?? [];
    return en.map((e, i) => ({ en: e, ar: ar[i] ?? "" }));
  }, [selectedCity]);

  const onCity = (en: string) => {
    const row = locations.find(l => l.city_en === en);
    setV(s => ({ ...s, city_en: en, city_ar: row?.city_ar ?? "", district_en: "", district_ar: "" }));
  };
  const onDistrict = (en: string) => {
    const d = districtPairs.find(p => p.en === en);
    setV(s => ({ ...s, district_en: en, district_ar: d?.ar ?? "" }));
  };
  const onCategory = (en: string) => {
    const p = categories.find(c => c.en === en);
    setV(s => ({ ...s, category_en: en, category_ar: p?.ar ?? "" }));
  };
  const onType = (en: string) => {
    const p = types.find(c => c.en === en);
    setV(s => ({ ...s, project_type_en: en, project_type_ar: p?.ar ?? "" }));
  };

  const submit = async () => {
    const parsed = schema.safeParse(v);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Please fix errors"); return; }
    if (!profileId) { toast.error("Profile not loaded"); return; }
    const d = parsed.data;
    setBusy(true);
    const { error } = await supabase.from("project_requests").insert({
      requested_by: profileId,
      name_en: d.name_en, name_ar: d.name_ar || null,
      description_en: d.description_en || null, description_ar: d.description_ar || null,
      category_en: d.category_en || null, category_ar: d.category_ar || null,
      project_type_en: d.project_type_en || null, project_type_ar: d.project_type_ar || null,
      city_en: d.city_en || null, city_ar: d.city_ar || null,
      district_en: d.district_en || null, district_ar: d.district_ar || null,
      street_en: d.street_en || null, street_ar: d.street_ar || null,
      budget: d.budget ?? 0, offered_value: d.offered_value ?? 0,
      start_date: d.start_date || null, end_date: d.end_date || null,
      competitors: d.competitors ? d.competitors.split(",").map(s => s.trim()).filter(Boolean) : [],
      client_name_en: d.client_name_en, client_name_ar: d.client_name_ar || null,
      contact_name_en: d.contact_name_en, contact_name_ar: d.contact_name_ar || null,
      email: d.email, phone: d.phone,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent to your manager and admin");
    onSubmitted?.();
    onClose();
  };

  const F = ({ label, k, type = "text", textarea = false }: { label: string; k: string; type?: string; textarea?: boolean }) => (
    <label className="block">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      {textarea ? (
        <textarea value={v[k] ?? ""} onChange={set(k)} rows={2} className="w-full rounded-md border border-border bg-background p-2 text-xs" />
      ) : (
        <input type={type} value={v[k] ?? ""} onChange={set(k)} className="w-full rounded-md border border-border bg-background p-2 text-xs" />
      )}
    </label>
  );

  const selectClass = "w-full rounded-md border border-border bg-background p-2 text-xs";
  const labelClass = "mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground";
  const roClass = "w-full rounded-md border border-border bg-muted/50 p-2 text-xs text-muted-foreground";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Request New Project</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <section className="mb-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">Project</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <F label="Name (EN) *" k="name_en" />
            <F label="Name (AR)" k="name_ar" />

            <label className="block">
              <div className={labelClass}>Category</div>
              <select className={selectClass} value={v.category_en ?? ""} onChange={e => onCategory(e.target.value)}>
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.en} value={c.en}>{c.en}{c.ar ? ` — ${c.ar}` : ""}</option>)}
              </select>
            </label>
            <label className="block">
              <div className={labelClass}>Category (AR)</div>
              <input readOnly value={v.category_ar ?? ""} className={roClass} placeholder="—" />
            </label>

            <label className="block">
              <div className={labelClass}>Project Type</div>
              <select className={selectClass} value={v.project_type_en ?? ""} onChange={e => onType(e.target.value)}>
                <option value="">Select type…</option>
                {types.map(c => <option key={c.en} value={c.en}>{c.en}{c.ar ? ` — ${c.ar}` : ""}</option>)}
              </select>
            </label>
            <label className="block">
              <div className={labelClass}>Project Type (AR)</div>
              <input readOnly value={v.project_type_ar ?? ""} className={roClass} placeholder="—" />
            </label>

            <F label="Budget" k="budget" type="number" />
            <F label="Offered Value" k="offered_value" type="number" />
            <F label="Start Date" k="start_date" type="date" />
            <F label="End Date" k="end_date" type="date" />

            <label className="block">
              <div className={labelClass}>City</div>
              <select className={selectClass} value={v.city_en ?? ""} onChange={e => onCity(e.target.value)}>
                <option value="">Select city…</option>
                {locations.map(l => <option key={l.city_en} value={l.city_en}>{l.city_en}{l.city_ar ? ` — ${l.city_ar}` : ""}</option>)}
              </select>
            </label>
            <label className="block">
              <div className={labelClass}>City (AR)</div>
              <input readOnly value={v.city_ar ?? ""} className={roClass} placeholder="—" />
            </label>

            <label className="block">
              <div className={labelClass}>District</div>
              <select className={selectClass} value={v.district_en ?? ""} onChange={e => onDistrict(e.target.value)} disabled={!selectedCity}>
                <option value="">{selectedCity ? "Select district…" : "Select a city first"}</option>
                {districtPairs.map(d => <option key={d.en} value={d.en}>{d.en}{d.ar ? ` — ${d.ar}` : ""}</option>)}
              </select>
            </label>
            <label className="block">
              <div className={labelClass}>District (AR)</div>
              <input readOnly value={v.district_ar ?? ""} className={roClass} placeholder="—" />
            </label>

            <F label="Street (EN)" k="street_en" />
            <F label="Street (AR)" k="street_ar" />
            <div className="md:col-span-2"><F label="Competitors (comma-separated)" k="competitors" /></div>
            <div className="md:col-span-2"><F label="Description (EN)" k="description_en" textarea /></div>
            <div className="md:col-span-2"><F label="Description (AR)" k="description_ar" textarea /></div>
          </div>
        </section>

        <section className="mb-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">Client & Contact</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <F label="Client / Company (EN) *" k="client_name_en" />
            <F label="Client / Company (AR)" k="client_name_ar" />
            <F label="Contact Person (EN) *" k="contact_name_en" />
            <F label="Contact Person (AR)" k="contact_name_ar" />
            <F label="Email *" k="email" type="email" />
            <F label="Phone *" k="phone" type="tel" />
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-xs font-semibold ring-1 ring-border hover:bg-accent">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {busy ? "Submitting…" : "Send for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
