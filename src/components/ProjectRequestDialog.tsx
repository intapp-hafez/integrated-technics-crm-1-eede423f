import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PhoneInput } from "@/components/PhoneInput";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name_en: z.string().trim().min(2).max(120),
  name_ar: z.string().trim().max(120).optional().or(z.literal("")),
  description_en: z.string().trim().max(2000).optional().or(z.literal("")),
  category_en: z.string().trim().max(80).optional().or(z.literal("")),
  category_ar: z.string().trim().max(80).optional().or(z.literal("")),
  project_type_en: z.string().trim().max(80).optional().or(z.literal("")),
  project_type_ar: z.string().trim().max(80).optional().or(z.literal("")),
  city_en: z.string().trim().max(80).optional().or(z.literal("")),
  city_ar: z.string().trim().max(80).optional().or(z.literal("")),
  district_en: z.string().trim().max(80).optional().or(z.literal("")),
  district_ar: z.string().trim().max(80).optional().or(z.literal("")),
  street_en: z.string().trim().max(120).optional().or(z.literal("")),
  budget: z.coerce.number().min(0).max(1e12).optional(),
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
  competitors: z.string().max(500).optional().or(z.literal("")),
  client_name_en: z.string().trim().min(2).max(120),
  contact_name_en: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().regex(/^[0-9 +()\-]{6,25}$/, "Invalid phone"),
  account_type: z.string().max(80).optional().or(z.literal("")),
  other_account_type: z.string().max(120).optional().or(z.literal("")),
});

type LocRow = { city_en: string; city_ar: string | null; districts_en: string[] | null; districts_ar: string[] | null };
type Pair = { en: string; ar: string };

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

const inputCls = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const selectCls = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
const sectionCls = "mb-1 text-[11px] font-bold uppercase tracking-wider text-primary";

export function ProjectRequestDialog({ profileId, onClose, onSubmitted }: { profileId?: string | null; onClose: () => void; onSubmitted?: () => void }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState("+20");
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState<LocRow[]>([]);
  const [categories, setCategories] = useState<Pair[]>(FALLBACK_CATEGORIES);
  const [types, setTypes] = useState<Pair[]>(FALLBACK_TYPES);
  const [extraContacts, setExtraContacts] = useState<Array<{ name: string; title: string; phone: string }>>([]);

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

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV(s => ({ ...s, [k]: e.target.value }));

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

  const addContact = () => setExtraContacts(prev => [...prev, { name: "", title: "", phone: "" }]);
  const removeContact = (i: number) => setExtraContacts(prev => prev.filter((_, idx) => idx !== i));
  const updateContact = (i: number, field: "name" | "title" | "phone", val: string) =>
    setExtraContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const submit = async () => {
    const parsed = schema.safeParse({ ...v, phone });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Please fix errors"); return; }
    if (!profileId) { toast.error("Profile not loaded"); return; }
    const d = parsed.data;
    setBusy(true);
    const { error } = await supabase.from("project_requests").insert({
      requested_by: profileId,
      name_en: d.name_en, name_ar: d.name_ar || null,
      description_en: d.description_en || null,
      category_en: d.category_en || null, category_ar: d.category_ar || null,
      project_type_en: d.project_type_en || null, project_type_ar: d.project_type_ar || null,
      city_en: d.city_en || null, city_ar: d.city_ar || null,
      district_en: d.district_en || null, district_ar: d.district_ar || null,
      street_en: d.street_en || null,
      budget: d.budget ?? 0,
      start_date: d.start_date || null, end_date: d.end_date || null,
      competitors: d.competitors ? d.competitors.split(",").map(s => s.trim()).filter(Boolean) : [],
      client_name_en: d.client_name_en,
      contact_name_en: d.contact_name_en,
      email: d.email, phone: d.phone,
      account_type: d.account_type || null,
      other_account_type: d.account_type === "Other" ? (d.other_account_type || null) : null,
      extra_contacts: extraContacts.filter(c => c.name.trim()).length > 0
        ? JSON.stringify(extraContacts.filter(c => c.name.trim()))
        : null,
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent to your manager and admin");
    onSubmitted?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Request New Account</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Fill in the details below — your manager will review and approve</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Project Info ── */}
        <div className={`${sectionCls} mt-1`}>Account Info</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Account Name *</span>
            <input value={v.name_en ?? ""} onChange={set("name_en")} className={inputCls} placeholder="e.g. Office Fit-out – Downtown" />
          </label>
          <label className="block">
            <span className={labelCls}>Account Type</span>
            <select value={v.account_type ?? ""} onChange={set("account_type")} className={selectCls}>
              <option value="">— Select —</option>
              <option value="End User">End User</option>
              <option value="Contractor">Contractor</option>
              <option value="System Integrator">System Integrator</option>
              <option value="Other">Other</option>
            </select>
          </label>
          {v.account_type === "Other" && (
            <label className="block sm:col-span-2">
              <span className={labelCls}>Specify Account Type</span>
              <input value={v.other_account_type ?? ""} onChange={set("other_account_type")} className={inputCls} placeholder="Please specify…" />
            </label>
          )}
          <div className="hidden">
          <label className="block">
            <span className={labelCls}>Category</span>
            <select className={selectCls} value={v.category_en ?? ""} onChange={e => onCategory(e.target.value)}>
              <option value="">Select category…</option>
              {categories.map(c => <option key={c.en} value={c.en}>{c.en}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Project Type</span>
            <select className={selectCls} value={v.project_type_en ?? ""} onChange={e => onType(e.target.value)}>
              <option value="">Select type…</option>
              {types.map(c => <option key={c.en} value={c.en}>{c.en}</option>)}
            </select>
          </label>

          {/* Hidden but submitted fields */}
          <input type="hidden" value={v.category_ar ?? ""} readOnly />
          <input type="hidden" value={v.project_type_ar ?? ""} readOnly />

          <label className="block">
            <span className={labelCls}>Budget</span>
            <input type="number" min={0} value={v.budget ?? ""} onChange={set("budget")} className={inputCls} placeholder="0" />
          </label>
          <label className="block">
            <span className={labelCls}>Start Date</span>
            <input type="date" value={v.start_date ?? ""} onChange={set("start_date")} className={inputCls} />
          </label>
          <label className="block">
            <span className={labelCls}>End Date</span>
            <input type="date" value={v.end_date ?? ""} min={v.start_date || undefined} onChange={set("end_date")} className={inputCls} />
          </label>
          </div>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Description</span>
            <textarea value={v.description_en ?? ""} onChange={set("description_en")} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="Brief project description…" />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Competitors (comma-separated)</span>
            <input value={v.competitors ?? ""} onChange={set("competitors")} className={inputCls} placeholder="Competitor A, Competitor B…" />
          </label>
        </div>

        {/* ── Location ── */}
        <div className={`${sectionCls} mt-5`}>Location</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>City</span>
            <select className={selectCls} value={v.city_en ?? ""} onChange={e => onCity(e.target.value)}>
              <option value="">Select city…</option>
              {locations.map(l => <option key={l.city_en} value={l.city_en}>{l.city_en}{l.city_ar ? ` — ${l.city_ar}` : ""}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>District</span>
            <select className={selectCls} value={v.district_en ?? ""} onChange={e => onDistrict(e.target.value)} disabled={!selectedCity}>
              <option value="">{selectedCity ? "Select district…" : "Select a city first"}</option>
              {districtPairs.map(d => <option key={d.en} value={d.en}>{d.en}{d.ar ? ` — ${d.ar}` : ""}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Street / Address</span>
            <input value={v.street_en ?? ""} onChange={set("street_en")} className={inputCls} placeholder="Building / Street name…" />
          </label>
        </div>

        {/* ── Client Info ── */}
        <div className={`${sectionCls} mt-5`}>Client Info</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Full Name *</span>
            <input value={v.contact_name_en ?? ""} onChange={set("contact_name_en")} className={inputCls} placeholder="Contact person name" />
          </label>
          <label className="block">
            <span className={labelCls}>Company / Client *</span>
            <input value={v.client_name_en ?? ""} onChange={set("client_name_en")} className={inputCls} placeholder="Company or client name" />
          </label>
          <label className="block">
            <span className={labelCls}>Email *</span>
            <input type="email" value={v.email ?? ""} onChange={set("email")} className={inputCls} placeholder="email@example.com" />
          </label>
          <div className="block">
            <span className={labelCls}>Phone *</span>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
        </div>

        {/* ── Extra Contacts ── */}
        <div className="mt-5 mb-2 flex items-center justify-between">
          <span className={sectionCls}>Extra Contacts</span>
          <button
            type="button"
            onClick={addContact}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add Contact
          </button>
        </div>
        {extraContacts.length === 0 && (
          <p className="mb-3 text-xs text-muted-foreground">No extra contacts yet. Click "Add Contact" to add one.</p>
        )}
        <div className="space-y-3 mb-2">
          {extraContacts.map((c, i) => (
            <div key={i} className="relative rounded-lg border border-border bg-background/60 p-3">
              <button
                type="button"
                onClick={() => removeContact(i)}
                className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pr-8">
                <label className="block">
                  <span className={labelCls}>Name</span>
                  <input value={c.name} onChange={e => updateContact(i, "name", e.target.value)} placeholder="Full name" className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Title / Role</span>
                  <input value={c.title} onChange={e => updateContact(i, "title", e.target.value)} placeholder="e.g. Site Manager" className={inputCls} />
                </label>
                <div className="block sm:col-span-2">
                  <span className={labelCls}>Phone</span>
                  <PhoneInput value={c.phone || "+20"} onChange={val => updateContact(i, "phone", val)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Actions ── */}
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground ring-1 ring-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {busy ? "Submitting…" : "Send for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
