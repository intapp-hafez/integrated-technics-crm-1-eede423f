import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PhoneInput } from "@/components/PhoneInput";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

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
  phone: z
    .string()
    .trim()
    .regex(/^[0-9 +()\-]{6,25}$/, "Invalid phone"),
  account_type: z.string().max(80).optional().or(z.literal("")),
  other_account_type: z.string().max(120).optional().or(z.literal("")),
});

type LocRow = {
  city_en: string;
  city_ar: string | null;
  districts_en: string[] | null;
  districts_ar: string[] | null;
};
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

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const selectCls =
  "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const labelCls = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
const sectionCls = "mb-1 text-[11px] font-bold uppercase tracking-wider text-primary";

export function ProjectRequestDialog({
  profileId,
  onClose,
  onSubmitted,
  existingRequest,
}: {
  profileId?: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
  existingRequest?: any;
}) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const L = {
    title: isAr ? "طلب حساب جديد" : "Request New Account",
    subtitle: isAr
      ? "قم بملء التفاصيل أدناه — سيقوم مديرك بمراجعتها والموافقة عليها"
      : "Fill in the details below — your manager will review and approve",
    accountInfo: isAr ? "معلومات الحساب" : "Account Info",
    accountName: isAr ? "اسم الحساب *" : "Account Name *",
    accountNamePh: isAr ? "مثال: تجهيز مكتب – وسط المدينة" : "e.g. Office Fit-out – Downtown",
    accountType: isAr ? "نوع الحساب" : "Account Type",
    select: isAr ? "— اختر —" : "— Select —",
    endUser: isAr ? "مستخدم نهائي" : "End User",
    contractor: isAr ? "مقاول" : "Contractor",
    systemIntegrator: isAr ? "متكامل أنظمة" : "System Integrator",
    other: isAr ? "أخرى" : "Other",
    specifyType: isAr ? "حدد نوع الحساب" : "Specify Account Type",
    specifyPh: isAr ? "يرجى التحديد…" : "Please specify…",
    category: isAr ? "الفئة" : "Category",
    selectCategory: isAr ? "اختر الفئة…" : "Select category…",
    projectType: isAr ? "نوع المشروع" : "Project Type",
    selectType: isAr ? "اختر النوع…" : "Select type…",
    budget: isAr ? "الميزانية" : "Budget",
    startDate: isAr ? "تاريخ البدء" : "Start Date",
    endDate: isAr ? "تاريخ الانتهاء" : "End Date",
    description: isAr ? "الوصف" : "Description",
    descriptionPh: isAr ? "وصف موجز للمشروع…" : "Brief project description…",
    competitors: isAr ? "المنافسين (مفصولين بفاصلة)" : "Competitors (comma-separated)",
    competitorsPh: isAr ? "المنافس أ، المنافس ب…" : "Competitor A, Competitor B…",
    location: isAr ? "الموقع" : "Location",
    city: isAr ? "المدينة" : "City",
    selectCity: isAr ? "اختر المدينة…" : "Select city…",
    district: isAr ? "المنطقة / الحي" : "District",
    selectDistrictFirst: isAr ? "اختر مدينة أولاً" : "Select a city first",
    selectDistrict: isAr ? "اختر المنطقة…" : "Select district…",
    street: isAr ? "الشارع / العنوان" : "Street / Address",
    streetPh: isAr ? "اسم المبنى / الشارع…" : "Building / Street name…",
    clientInfo: isAr ? "معلومات العميل" : "Client Info",
    fullName: isAr ? "الاسم الكامل *" : "Full Name *",
    fullNamePh: isAr ? "اسم مسؤول الاتصال" : "Contact person name",
    company: isAr ? "الشركة / العميل *" : "Company / Client *",
    companyPh: isAr ? "الشركة أو اسم العميل" : "Company or client name",
    email: isAr ? "البريد الإلكتروني *" : "Email *",
    phoneLabel: isAr ? "رقم الهاتف *" : "Phone *",
    extraContacts: isAr ? "جهات اتصال إضافية" : "Extra Contacts",
    addContact: isAr ? "إضافة جهة اتصال" : "Add Contact",
    noExtraContacts: isAr
      ? "لا توجد جهات اتصال إضافية. انقر فوق 'إضافة جهة اتصال' لإضافة واحدة."
      : 'No extra contacts yet. Click "Add Contact" to add one.',
    name: isAr ? "الاسم" : "Name",
    namePh: isAr ? "الاسم الكامل" : "Full name",
    titleRole: isAr ? "المسمى الوظيفي / الدور" : "Title / Role",
    titleRolePh: isAr ? "مثال: مدير الموقع" : "e.g. Site Manager",
    cancel: isAr ? "إلغاء" : "Cancel",
    submit: isAr ? "إرسال للموافقة" : "Send for Approval",
    submitting: isAr ? "جاري الإرسال…" : "Submitting…",
    errorFix: isAr ? "يرجى إصلاح الأخطاء" : "Please fix errors",
    errorNoProfile: isAr ? "لم يتم تحميل الملف الشخصي" : "Profile not loaded",
    successSent: isAr
      ? "تم إرسال الطلب إلى مديرك والمسؤول"
      : "Request sent to your manager and admin",
  };
  const [v, setV] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState("+20");
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState<LocRow[]>([]);
  const [categories, setCategories] = useState<Pair[]>(FALLBACK_CATEGORIES);
  const [types, setTypes] = useState<Pair[]>(FALLBACK_TYPES);
  const [extraContacts, setExtraContacts] = useState<
    Array<{ name: string; title: string; phone: string; email: string }>
  >([]);

  useEffect(() => {
    if (existingRequest) {
      setV({
        name_en: existingRequest.name_en || "",
        name_ar: existingRequest.name_ar || "",
        description_en: existingRequest.description_en || "",
        category_en: existingRequest.category_en || "",
        category_ar: existingRequest.category_ar || "",
        project_type_en: existingRequest.project_type_en || "",
        project_type_ar: existingRequest.project_type_ar || "",
        city_en: existingRequest.city_en || "",
        city_ar: existingRequest.city_ar || "",
        district_en: existingRequest.district_en || "",
        district_ar: existingRequest.district_ar || "",
        street_en: existingRequest.street_en || "",
        budget: existingRequest.budget ? String(existingRequest.budget) : "",
        start_date: existingRequest.start_date || "",
        end_date: existingRequest.end_date || "",
        competitors: existingRequest.competitors?.join(", ") || "",
        client_name_en: existingRequest.client_name_en || "",
        contact_name_en: existingRequest.contact_name_en || "",
        email: existingRequest.email || "",
        account_type: existingRequest.account_type || "",
        other_account_type: existingRequest.other_account_type || "",
      });
      setPhone(existingRequest.phone || "+20");
      if (existingRequest.extra_contacts) {
        try {
          const parsed =
            typeof existingRequest.extra_contacts === "string"
              ? JSON.parse(existingRequest.extra_contacts)
              : existingRequest.extra_contacts;
          // Handle double-encoded JSON just in case
          const arr = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
          if (Array.isArray(arr)) setExtraContacts(arr);
        } catch {
          /* ignore */
        }
      }
    }
  }, [existingRequest]);

  useEffect(() => {
    (async () => {
      const [locRes, projRes] = await Promise.all([
        supabase
          .from("locations")
          .select("city_en, city_ar, districts_en, districts_ar")
          .order("city_en"),
        supabase
          .from("projects")
          .select("category_en, category_ar, project_type_en, project_type_ar"),
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

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setV((s) => ({ ...s, [k]: e.target.value }));

  const selectedCity = useMemo(
    () => locations.find((l) => l.city_en === v.city_en),
    [locations, v.city_en],
  );
  const districtPairs = useMemo<Pair[]>(() => {
    if (!selectedCity) return [];
    const en = selectedCity.districts_en ?? [];
    const ar = selectedCity.districts_ar ?? [];
    return en.map((e, i) => ({ en: e, ar: ar[i] ?? "" }));
  }, [selectedCity]);

  const onCity = (en: string) => {
    const row = locations.find((l) => l.city_en === en);
    setV((s) => ({
      ...s,
      city_en: en,
      city_ar: row?.city_ar ?? "",
      district_en: "",
      district_ar: "",
    }));
  };
  const onDistrict = (en: string) => {
    const d = districtPairs.find((p) => p.en === en);
    setV((s) => ({ ...s, district_en: en, district_ar: d?.ar ?? "" }));
  };
  const onCategory = (en: string) => {
    const p = categories.find((c) => c.en === en);
    setV((s) => ({ ...s, category_en: en, category_ar: p?.ar ?? "" }));
  };
  const onType = (en: string) => {
    const p = types.find((c) => c.en === en);
    setV((s) => ({ ...s, project_type_en: en, project_type_ar: p?.ar ?? "" }));
  };

  const addContact = () =>
    setExtraContacts((prev) => [...prev, { name: "", title: "", phone: "", email: "" }]);
  const removeContact = (i: number) =>
    setExtraContacts((prev) => prev.filter((_, idx) => idx !== i));
  const updateContact = (i: number, field: "name" | "title" | "phone" | "email", val: string) =>
    setExtraContacts((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: val } : c)));

  const submit = async () => {
    const parsed = schema.safeParse({ ...v, phone });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? L.errorFix);
      return;
    }
    if (!profileId && !existingRequest) {
      toast.error(L.errorNoProfile);
      return;
    }
    const d = parsed.data;
    setBusy(true);

    const payload = {
      name_en: d.name_en,
      name_ar: d.name_ar || null,
      description_en: d.description_en || null,
      category_en: d.category_en || null,
      category_ar: d.category_ar || null,
      project_type_en: d.project_type_en || null,
      project_type_ar: d.project_type_ar || null,
      city_en: d.city_en || null,
      city_ar: d.city_ar || null,
      district_en: d.district_en || null,
      district_ar: d.district_ar || null,
      street_en: d.street_en || null,
      budget: d.budget ?? 0,
      start_date: d.start_date || null,
      end_date: d.end_date || null,
      competitors: d.competitors
        ? d.competitors
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      client_name_en: d.client_name_en,
      contact_name_en: d.contact_name_en,
      email: d.email,
      phone: d.phone,
      account_type: d.account_type || null,
      other_account_type: d.account_type === "Other" ? d.other_account_type || null : null,
      extra_contacts:
        extraContacts.filter((c) => c.name.trim()).length > 0
          ? JSON.stringify(extraContacts.filter((c) => c.name.trim()))
          : null,
    };

    let error;
    if (existingRequest) {
      const { error: updateError } = await supabase
        .from("project_requests")
        .update(payload)
        .eq("id", existingRequest.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("project_requests").insert({
        requested_by: profileId,
        ...payload,
      } as any);
      error = insertError;
    }

    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(L.successSent);
    onSubmitted?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{L.title}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{L.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Project Info ── */}
        <div className={`${sectionCls} mt-1`}>{L.accountInfo}</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{L.accountName}</span>
            <input
              value={v.name_en ?? ""}
              onChange={set("name_en")}
              className={inputCls}
              placeholder={L.accountNamePh}
            />
          </label>
          <label className="block">
            <span className={labelCls}>{L.accountType}</span>
            <select
              value={v.account_type ?? ""}
              onChange={set("account_type")}
              className={selectCls}
              dir={isAr ? "rtl" : "ltr"}
            >
              <option value="">{L.select}</option>
              <option value="End User">{L.endUser}</option>
              <option value="Contractor">{L.contractor}</option>
              <option value="System Integrator">{L.systemIntegrator}</option>
              <option value="Other">{L.other}</option>
            </select>
          </label>
          {v.account_type === "Other" && (
            <label className="block sm:col-span-2">
              <span className={labelCls}>{L.specifyType}</span>
              <input
                value={v.other_account_type ?? ""}
                onChange={set("other_account_type")}
                className={inputCls}
                placeholder={L.specifyPh}
              />
            </label>
          )}
          <div className="hidden">
            <label className="block">
              <span className={labelCls}>{L.category}</span>
              <select
                className={selectCls}
                value={v.category_en ?? ""}
                onChange={(e) => onCategory(e.target.value)}
              >
                <option value="">{L.selectCategory}</option>
                {categories.map((c) => (
                  <option key={c.en} value={c.en}>
                    {isAr && c.ar ? c.ar : c.en}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>{L.projectType}</span>
              <select
                className={selectCls}
                value={v.project_type_en ?? ""}
                onChange={(e) => onType(e.target.value)}
              >
                <option value="">{L.selectType}</option>
                {types.map((c) => (
                  <option key={c.en} value={c.en}>
                    {isAr && c.ar ? c.ar : c.en}
                  </option>
                ))}
              </select>
            </label>

            {/* Hidden but submitted fields */}
            <input type="hidden" value={v.category_ar ?? ""} readOnly />
            <input type="hidden" value={v.project_type_ar ?? ""} readOnly />

            <label className="block">
              <span className={labelCls}>{L.budget}</span>
              <input
                type="number"
                min={0}
                value={v.budget ?? ""}
                onChange={set("budget")}
                className={inputCls}
                placeholder="0"
              />
            </label>
            <label className="block">
              <span className={labelCls}>{L.startDate}</span>
              <input
                type="date"
                value={v.start_date ?? ""}
                onChange={set("start_date")}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>{L.endDate}</span>
              <input
                type="date"
                value={v.end_date ?? ""}
                min={v.start_date || undefined}
                onChange={set("end_date")}
                className={inputCls}
              />
            </label>
          </div>
          <label className="block sm:col-span-2">
            <span className={labelCls}>{L.description}</span>
            <textarea
              value={v.description_en ?? ""}
              onChange={set("description_en")}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder={L.descriptionPh}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>{L.competitors}</span>
            <input
              value={v.competitors ?? ""}
              onChange={set("competitors")}
              className={inputCls}
              placeholder={L.competitorsPh}
            />
          </label>
        </div>

        {/* ── Location ── */}
        <div className={`${sectionCls} mt-5`}>{L.location}</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{L.city}</span>
            <select
              className={selectCls}
              value={v.city_en ?? ""}
              onChange={(e) => onCity(e.target.value)}
            >
              <option value="">{L.selectCity}</option>
              {locations.map((l) => (
                <option key={l.city_en} value={l.city_en}>
                  {isAr && l.city_ar ? l.city_ar : l.city_en}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>{L.district}</span>
            <select
              className={selectCls}
              value={v.district_en ?? ""}
              onChange={(e) => onDistrict(e.target.value)}
              disabled={!selectedCity}
            >
              <option value="">{selectedCity ? L.selectDistrict : L.selectDistrictFirst}</option>
              {districtPairs.map((d) => (
                <option key={d.en} value={d.en}>
                  {isAr && d.ar ? d.ar : d.en}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>{L.street}</span>
            <input
              value={v.street_en ?? ""}
              onChange={set("street_en")}
              className={inputCls}
              placeholder={L.streetPh}
            />
          </label>
        </div>

        {/* ── Client Info ── */}
        <div className={`${sectionCls} mt-5`}>{L.clientInfo}</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>{L.fullName}</span>
            <input
              value={v.contact_name_en ?? ""}
              onChange={set("contact_name_en")}
              className={inputCls}
              placeholder={L.fullNamePh}
            />
          </label>
          <label className="block">
            <span className={labelCls}>{L.company}</span>
            <input
              value={v.client_name_en ?? ""}
              onChange={set("client_name_en")}
              className={inputCls}
              placeholder={L.companyPh}
            />
          </label>
          <label className="block">
            <span className={labelCls}>{L.email}</span>
            <input
              type="email"
              value={v.email ?? ""}
              onChange={set("email")}
              className={inputCls}
              placeholder="email@example.com"
              dir="ltr"
            />
          </label>
          <div className="block">
            <span className={labelCls}>{L.phoneLabel}</span>
            <PhoneInput value={phone} onChange={setPhone} />
          </div>
        </div>

        {/* ── Extra Contacts ── */}
        <div className="mt-5 mb-2 flex items-center justify-between">
          <span className={sectionCls}>{L.extraContacts}</span>
          <button
            type="button"
            onClick={addContact}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="h-3 w-3" /> {L.addContact}
          </button>
        </div>
        {extraContacts.length === 0 && (
          <p className="mb-3 text-xs text-muted-foreground">{L.noExtraContacts}</p>
        )}
        <div className="space-y-3 mb-2">
          {extraContacts.map((c, i) => (
            <div key={i} className="relative rounded-lg border border-border bg-background/60 p-3">
              <button
                type="button"
                onClick={() => removeContact(i)}
                className={`absolute top-2 ${isAr ? "left-2" : "right-2"} flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${isAr ? "pl-8" : "pr-8"}`}>
                <label className="block">
                  <span className={labelCls}>{L.name}</span>
                  <input
                    value={c.name}
                    onChange={(e) => updateContact(i, "name", e.target.value)}
                    placeholder={L.namePh}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>{L.titleRole}</span>
                  <input
                    value={c.title}
                    onChange={(e) => updateContact(i, "title", e.target.value)}
                    placeholder={L.titleRolePh}
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>{L.email}</span>
                  <input
                    type="email"
                    value={c.email || ""}
                    onChange={(e) => updateContact(i, "email", e.target.value)}
                    placeholder="email@example.com"
                    className={inputCls}
                    dir="ltr"
                  />
                </label>
                <div className="block">
                  <span className={labelCls}>{L.phoneLabel}</span>
                  <PhoneInput
                    value={c.phone || "+20"}
                    onChange={(val) => updateContact(i, "phone", val)}
                  />
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
            {L.cancel}
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {busy ? L.submitting : L.submit}
          </button>
        </div>
      </div>
    </div>
  );
}
