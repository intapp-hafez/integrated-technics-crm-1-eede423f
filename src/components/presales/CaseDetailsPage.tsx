import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/role";
import { useI18n } from "@/lib/i18n";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Copy,
  Cpu,
  DollarSign,
  Download,
  Edit2,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Layers,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  Maximize2,
  Network,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Save,
  Send,
  Server,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Workflow,
  Wrench,
  X,
} from "lucide-react";
import { supabase as rawSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sbSignedAttachmentUrl } from "@/lib/supabaseWrites";

const supabase = rawSupabase as any;

export type CaseStatus =
  | "new"
  | "under_review"
  | "boq_ready"
  | "offer_sent"
  | "approved"
  | "handover"
  | "closed";

export type CasePriority = "low" | "medium" | "high" | "urgent";

export interface CustomTechnicalField {
  id: string;
  title_en: string;
  title_ar?: string;
  category: string;
  details: string;
}

export interface TechnicalStudyData {
  scope_summary: string;
  architecture_design: string;
  site_survey: string;
  system_specs: string;
  integration_interfaces: string;
  compliance_standards: string;
  risks_exclusions: string;
  timeline_delivery: string;
  custom_fields: CustomTechnicalField[];
}

const DEFAULT_TECHNICAL_STUDY: TechnicalStudyData = {
  scope_summary: "",
  architecture_design: "",
  site_survey: "",
  system_specs: "",
  integration_interfaces: "",
  compliance_standards: "",
  risks_exclusions: "",
  timeline_delivery: "",
  custom_fields: [],
};

function parseTechnicalNotes(raw?: string | null): TechnicalStudyData {
  if (!raw) return { ...DEFAULT_TECHNICAL_STUDY, custom_fields: [] };
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        scope_summary: parsed.scope_summary || "",
        architecture_design: parsed.architecture_design || "",
        site_survey: parsed.site_survey || "",
        system_specs: parsed.system_specs || "",
        integration_interfaces: parsed.integration_interfaces || "",
        compliance_standards: parsed.compliance_standards || "",
        risks_exclusions: parsed.risks_exclusions || "",
        timeline_delivery: parsed.timeline_delivery || "",
        custom_fields: Array.isArray(parsed.custom_fields) ? parsed.custom_fields : [],
      };
    } catch {
      // fallback to plain text in scope_summary
    }
  }
  return {
    ...DEFAULT_TECHNICAL_STUDY,
    scope_summary: raw,
    custom_fields: [],
  };
}

function serializeTechnicalNotes(data: TechnicalStudyData): string {
  return JSON.stringify(data, null, 2);
}

const STATUS_LABELS_EN: Record<CaseStatus, string> = {
  new: "New",
  under_review: "Under Review",
  boq_ready: "BOQ Ready",
  offer_sent: "Offer Sent",
  approved: "Approved",
  handover: "Handover",
  closed: "Closed",
};

const STATUS_LABELS_AR: Record<CaseStatus, string> = {
  new: "جديدة",
  under_review: "قيد المراجعة",
  boq_ready: "BOQ جاهز",
  offer_sent: "عرض مُرسل",
  approved: "مُعتمد",
  handover: "تسليم",
  closed: "مغلق",
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  under_review: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  boq_ready: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  offer_sent: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  handover: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
  closed: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

const PRIORITY_LABELS_EN: Record<CasePriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_LABELS_AR: Record<CasePriority, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجل",
};

const PRIORITY_COLORS: Record<CasePriority, string> = {
  low: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
  urgent: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300",
};

const FIELD_CATEGORIES = [
  { value: "general", labelEn: "General Notes", labelAr: "ملاحظات عامة" },
  { value: "calculations", labelEn: "Capacity & Calculations", labelAr: "الحسابات والسعات" },
  { value: "network", labelEn: "Network & Bandwidth", labelAr: "الشبكات والباندويث" },
  { value: "hardware", labelEn: "Hardware Specifications", labelAr: "مواصفات الأجهزة والمعدات" },
  { value: "software", labelEn: "Software & Licenses", labelAr: "البرمجيات والتراخيص" },
  { value: "civil", labelEn: "Civil & Electrical Works", labelAr: "أعمال مدنية وكهربائية" },
  { value: "warranty", labelEn: "Warranty, SLA & Support", labelAr: "الضمان والدعم الفني" },
];

function fmtMoney(amount?: number | null, currency = "SAR") {
  if (amount == null) return "0.00 " + currency;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + " " + currency;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function CaseDetailsPage({ caseId }: { caseId: string }) {
  const { lang, t } = useI18n();
  const isAr = lang === "ar";
  const router = useRouter();
  const { profile } = useAuth();
  const { role } = useRole();

  const user = {
    name: profile?.full_name_en || profile?.full_name_ar || "Presales Engineer",
    role: t(role as any) || "Presales",
    initials: (profile?.full_name_en || profile?.full_name_ar || "PE")
      .split(" ")
      .map((s: string) => s[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
  };

  // State
  const [loading, setLoading] = useState(true);
  const [presalesCase, setPresalesCase] = useState<any>(null);
  const [leadData, setLeadData] = useState<any>(null);
  const [leadItems, setLeadItems] = useState<any[]>([]);
  const [leadFiles, setLeadFiles] = useState<any[]>([]);
  const [boqItems, setBoqItems] = useState<any[]>([]);
  const [costItems, setCostItems] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  // Active Worksheet Tab
  const [activeTab, setActiveTab] = useState<"scope" | "boq" | "cost" | "offers" | "handover">("scope");

  // Structured Technical Study Form Fields
  const [studyData, setStudyData] = useState<TechnicalStudyData>(DEFAULT_TECHNICAL_STUDY);
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [status, setStatus] = useState<CaseStatus>("new");
  const [priority, setPriority] = useState<CasePriority>("medium");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [savingStudy, setSavingStudy] = useState(false);

  // Dynamic Custom Field Modal
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [customFieldForm, setCustomFieldForm] = useState<CustomTechnicalField>({
    id: "",
    title_en: "",
    title_ar: "",
    category: "general",
    details: "",
  });

  // Modals state
  const [showBoqModal, setShowBoqModal] = useState(false);
  const [boqForm, setBoqForm] = useState({ id: "", description_en: "", description_ar: "", unit: "Pcs", quantity: "1", unit_cost: "0", notes: "" });
  const [savingBoq, setSavingBoq] = useState(false);

  const [showCostModal, setShowCostModal] = useState(false);
  const [costForm, setCostForm] = useState({ id: "", category: "materials", description_en: "", description_ar: "", quantity: "1", unit_cost: "0" });
  const [savingCost, setSavingCost] = useState(false);

  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({ offer_date: new Date().toISOString().slice(0, 10), valid_until: "", total_cost: "0", margin_pct: "20", currency: "SAR", notes: "" });
  const [savingOffer, setSavingOffer] = useState(false);

  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverForm, setHandoverForm] = useState({ handover_date: new Date().toISOString().slice(0, 10), received_by: "", notes: "" });
  const [savingHandover, setSavingHandover] = useState(false);

  // Load everything
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Case
      const { data: caseRow, error: caseErr } = await supabase
        .from("presales_cases")
        .select(`
          *,
          assigned_profile:profiles!assigned_to(id, full_name_en, full_name_ar, email, title_en),
          client:clients!client_id(*),
          lead:leads!lead_id(
            id, code, company_en, company_ar, contact_name_en, contact_name_ar,
            email, phone, value, probability, expected_close_date, status,
            source_en, industry_en, city_en, district_en, street_en,
            owner:profiles!owner_id(id, full_name_en, full_name_ar, email, phone, title_en)
          )
        `)
        .eq("id", caseId)
        .single();

      if (caseErr || !caseRow) {
        toast.error("Case not found");
        setLoading(false);
        return;
      }

      setPresalesCase(caseRow);
      setTitleEn(caseRow.title_en || "");
      setTitleAr(caseRow.title_ar || "");
      setStudyData(parseTechnicalNotes(caseRow.technical_notes));
      setStatus(caseRow.status as CaseStatus);
      setPriority(caseRow.priority as CasePriority);
      setAssignedTo(caseRow.assigned_to || "");

      // 2. Set Lead data if exists
      if (caseRow.lead) {
        setLeadData(caseRow.lead);
        // Fetch requested lead catalog items
        const { data: items } = await supabase
          .from("lead_catalog_items")
          .select("*")
          .eq("lead_id", caseRow.lead.id);
        setLeadItems(items || []);

        // Fetch lead attachments
        const { data: files } = await supabase
          .from("attachments")
          .select("*")
          .eq("parent_table", "lead")
          .eq("parent_id", caseRow.lead.id)
          .order("created_at", { ascending: false });
        setLeadFiles(files || []);
      }

      // 3. Fetch BOQ Items
      const { data: boq } = await supabase
        .from("presales_boq_items")
        .select("*")
        .eq("case_id", caseId)
        .order("sort_order", { ascending: true });
      setBoqItems(boq || []);

      // 4. Fetch Cost Items
      const { data: cost } = await supabase
        .from("presales_cost_items")
        .select("*")
        .eq("case_id", caseId)
        .order("sort_order", { ascending: true });
      setCostItems(cost || []);

      // 5. Fetch Offers
      const { data: off } = await supabase
        .from("presales_financial_offers")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      setOffers(off || []);

      // 6. Fetch Handovers
      const { data: hnd } = await supabase
        .from("presales_handover_records")
        .select(`
          *,
          handed_profile:profiles!handed_by(full_name_en),
          received_profile:profiles!received_by(full_name_en)
        `)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      setHandovers(hnd || []);

      // 7. Fetch Profiles for assignment
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name_en, full_name_ar, title_en")
        .order("full_name_en");
      setProfiles(profs || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load case");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Save Case Header and All Technical Study Fields
  const saveFullTechnicalStudy = async () => {
    setSavingStudy(true);
    try {
      const serializedNotes = serializeTechnicalNotes(studyData);
      const { error } = await supabase
        .from("presales_cases")
        .update({
          title_en: titleEn,
          title_ar: titleAr || null,
          status,
          priority,
          assigned_to: assignedTo || null,
          technical_notes: serializedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", caseId);

      if (error) throw error;
      toast.success(isAr ? "تم حفظ دراسة وتصميم الأنظمة بنجاح" : "Technical study & architecture saved successfully");
      loadAll();
    } catch (e: any) {
      toast.error(e.message || "Failed to save technical study");
    } finally {
      setSavingStudy(false);
    }
  };

  // Quick Status change
  const handleStatusChange = async (newStatus: CaseStatus) => {
    setStatus(newStatus);
    try {
      await supabase
        .from("presales_cases")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", caseId);
      toast.success(isAr ? `تم تحديث الحالة إلى: ${STATUS_LABELS_AR[newStatus]}` : `Status updated to ${STATUS_LABELS_EN[newStatus]}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Quick Priority change
  const handlePriorityChange = async (newPriority: CasePriority) => {
    setPriority(newPriority);
    try {
      await supabase
        .from("presales_cases")
        .update({ priority: newPriority, updated_at: new Date().toISOString() })
        .eq("id", caseId);
      toast.success(isAr ? `تم تحديث الأولوية إلى: ${PRIORITY_LABELS_AR[newPriority]}` : `Priority updated to ${PRIORITY_LABELS_EN[newPriority]}`);
    } catch {
      toast.error("Failed to update priority");
    }
  };

  // Custom Field Handlers
  const handleOpenAddCustomField = () => {
    setCustomFieldForm({
      id: "",
      title_en: "",
      title_ar: "",
      category: "general",
      details: "",
    });
    setShowCustomFieldModal(true);
  };

  const handleOpenEditCustomField = (field: CustomTechnicalField) => {
    setCustomFieldForm({ ...field });
    setShowCustomFieldModal(true);
  };

  const handleSaveCustomField = () => {
    if (!customFieldForm.title_en.trim() && !customFieldForm.title_ar?.trim()) {
      toast.error(isAr ? "يرجى كتابة عنوان الحقل الفني" : "Please enter field title");
      return;
    }

    setStudyData((prev) => {
      const list = [...(prev.custom_fields || [])];
      if (customFieldForm.id) {
        const idx = list.findIndex((f) => f.id === customFieldForm.id);
        if (idx !== -1) {
          list[idx] = { ...customFieldForm };
        }
      } else {
        list.push({
          ...customFieldForm,
          id: `cf-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        });
      }
      return { ...prev, custom_fields: list };
    });

    setShowCustomFieldModal(false);
    toast.success(isAr ? "تمت إضافة/تحديث الحقل المخصص" : "Custom field updated");
  };

  const handleDeleteCustomField = (id: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذا الحقل؟" : "Delete this custom field?")) return;
    setStudyData((prev) => ({
      ...prev,
      custom_fields: (prev.custom_fields || []).filter((f) => f.id !== id),
    }));
    toast.success(isAr ? "تم حذف الحقل" : "Field removed");
  };

  const handleMoveCustomField = (index: number, direction: "up" | "down") => {
    setStudyData((prev) => {
      const list = [...(prev.custom_fields || [])];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return { ...prev, custom_fields: list };
    });
  };

  // Copy Study Summary to Clipboard
  const handleCopyStudyMarkdown = () => {
    const lines = [
      `# Technical Study: ${titleEn} ${titleAr ? `(${titleAr})` : ""}`,
      `Code: ${presalesCase.code || "PSC"} | Status: ${status} | Priority: ${priority}`,
      `Client / Lead: ${leadData?.company_en || presalesCase.client?.name_en || "N/A"}`,
      "",
      "## 1. Scope of Work & Objectives",
      studyData.scope_summary || "N/A",
      "",
      "## 2. System Architecture & Topology",
      studyData.architecture_design || "N/A",
      "",
      "## 3. Site Survey & Environmental Conditions",
      studyData.site_survey || "N/A",
      "",
      "## 4. Technical Specifications & Hardware",
      studyData.system_specs || "N/A",
      "",
      "## 5. Integration & Interfaces",
      studyData.integration_interfaces || "N/A",
      "",
      "## 6. Compliance & Standards",
      studyData.compliance_standards || "N/A",
      "",
      "## 7. Risks & Exclusions",
      studyData.risks_exclusions || "N/A",
      "",
      "## 8. Delivery Timeline",
      studyData.timeline_delivery || "N/A",
    ];

    if (studyData.custom_fields?.length > 0) {
      lines.push("", "## Additional Technical Sections");
      studyData.custom_fields.forEach((cf) => {
        lines.push(`### ${cf.title_en || cf.title_ar} (${cf.category})`, cf.details || "N/A", "");
      });
    }

    navigator.clipboard.writeText(lines.join("\n"));
    toast.success(isAr ? "تم نسخ ملخص الدراسة الفنية للحافظة" : "Study summary copied to clipboard");
  };

  // Totals calculations
  const totalBoqCost = useMemo(() => {
    return boqItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);
  }, [boqItems]);

  const totalEstimatedCost = useMemo(() => {
    return costItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0), 0);
  }, [costItems]);

  // BOQ Item save/delete
  const saveBoqItem = async () => {
    if (!boqForm.description_en.trim()) return;
    setSavingBoq(true);
    try {
      if (boqForm.id) {
        await supabase
          .from("presales_boq_items")
          .update({
            description_en: boqForm.description_en,
            description_ar: boqForm.description_ar || null,
            unit: boqForm.unit || null,
            quantity: parseFloat(boqForm.quantity) || 1,
            unit_cost: parseFloat(boqForm.unit_cost) || 0,
            notes: boqForm.notes || null,
          })
          .eq("id", boqForm.id);
      } else {
        const nextNo = (boqItems.length > 0 ? Math.max(...boqItems.map((i) => i.item_no || 0)) : 0) + 1;
        await supabase.from("presales_boq_items").insert({
          case_id: caseId,
          item_no: nextNo,
          description_en: boqForm.description_en,
          description_ar: boqForm.description_ar || null,
          unit: boqForm.unit || null,
          quantity: parseFloat(boqForm.quantity) || 1,
          unit_cost: parseFloat(boqForm.unit_cost) || 0,
          notes: boqForm.notes || null,
          sort_order: nextNo,
        });
      }
      setShowBoqModal(false);
      setBoqForm({ id: "", description_en: "", description_ar: "", unit: "Pcs", quantity: "1", unit_cost: "0", notes: "" });
      const { data } = await supabase.from("presales_boq_items").select("*").eq("case_id", caseId).order("sort_order");
      setBoqItems(data || []);
      toast.success(isAr ? "تم حفظ بند الكميات بنجاح" : "BOQ item saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save BOQ item");
    } finally {
      setSavingBoq(false);
    }
  };

  const deleteBoqItem = async (id: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف هذا البند؟" : "Delete this BOQ item?")) return;
    await supabase.from("presales_boq_items").delete().eq("id", id);
    setBoqItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(isAr ? "تم حذف البند" : "Item deleted");
  };

  // Cost Item save/delete
  const saveCostItem = async () => {
    if (!costForm.description_en.trim()) return;
    setSavingCost(true);
    try {
      if (costForm.id) {
        await supabase
          .from("presales_cost_items")
          .update({
            category: costForm.category,
            description_en: costForm.description_en,
            description_ar: costForm.description_ar || null,
            quantity: parseFloat(costForm.quantity) || 1,
            unit_cost: parseFloat(costForm.unit_cost) || 0,
          })
          .eq("id", costForm.id);
      } else {
        const nextOrder = (costItems.length > 0 ? Math.max(...costItems.map((i) => i.sort_order || 0)) : 0) + 1;
        await supabase.from("presales_cost_items").insert({
          case_id: caseId,
          category: costForm.category,
          description_en: costForm.description_en,
          description_ar: costForm.description_ar || null,
          quantity: parseFloat(costForm.quantity) || 1,
          unit_cost: parseFloat(costForm.unit_cost) || 0,
          sort_order: nextOrder,
        });
      }
      setShowCostModal(false);
      setCostForm({ id: "", category: "materials", description_en: "", description_ar: "", quantity: "1", unit_cost: "0" });
      const { data } = await supabase.from("presales_cost_items").select("*").eq("case_id", caseId).order("sort_order");
      setCostItems(data || []);
      toast.success(isAr ? "تم حفظ بند التكلفة" : "Cost item saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save cost item");
    } finally {
      setSavingCost(false);
    }
  };

  const deleteCostItem = async (id: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف بند التكلفة؟" : "Delete this cost item?")) return;
    await supabase.from("presales_cost_items").delete().eq("id", id);
    setCostItems((prev) => prev.filter((i) => i.id !== id));
    toast.success(isAr ? "تم حذف البند" : "Item deleted");
  };

  // Financial Offer save
  const saveOffer = async () => {
    setSavingOffer(true);
    try {
      const code = `PFO-${String(Date.now()).slice(-4)}`;
      const totalCost = parseFloat(offerForm.total_cost) || totalEstimatedCost || totalBoqCost || 0;
      const margin = parseFloat(offerForm.margin_pct) || 0;
      const selling = totalCost * (1 + margin / 100);

      await supabase.from("presales_financial_offers").insert({
        case_id: caseId,
        offer_code: code,
        offer_date: offerForm.offer_date,
        valid_until: offerForm.valid_until || null,
        total_cost: totalCost,
        margin_pct: margin,
        selling_price: selling,
        currency: offerForm.currency || "SAR",
        status: "draft",
        notes: offerForm.notes || null,
      });

      setShowOfferModal(false);
      const { data } = await supabase.from("presales_financial_offers").select("*").eq("case_id", caseId).order("created_at", { ascending: false });
      setOffers(data || []);
      toast.success(isAr ? `تم إنشاء العرض المالي (${code})` : `Offer ${code} created`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create offer");
    } finally {
      setSavingOffer(false);
    }
  };

  // Handover save
  const saveHandover = async () => {
    setSavingHandover(true);
    try {
      await supabase.from("presales_handover_records").insert({
        case_id: caseId,
        handover_date: handoverForm.handover_date,
        handed_by: profile?.id || null,
        received_by: handoverForm.received_by || null,
        status: "pending",
        notes: handoverForm.notes || null,
      });

      setShowHandoverModal(false);
      const { data } = await supabase
        .from("presales_handover_records")
        .select(`*, handed_profile:profiles!handed_by(full_name_en), received_profile:profiles!received_by(full_name_en)`)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      setHandovers(data || []);
      toast.success(isAr ? "تم تسجيل تسليم المشروع بنجاح" : "Handover registered");
    } catch (e: any) {
      toast.error(e.message || "Failed to save handover");
    } finally {
      setSavingHandover(false);
    }
  };

  // Download attachment helper
  const handleDownloadAttachment = async (path: string, name: string) => {
    const url = await sbSignedAttachmentUrl(path);
    if (!url) {
      toast.error("Could not generate download link");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (loading) {
    return (
      <AppShell panel="presales" user={user} pageTitle={isAr ? "تفاصيل الدراسة الفنية" : "Technical Study Details"}>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!presalesCase) {
    return (
      <AppShell panel="presales" user={user} pageTitle={isAr ? "الدراسة الفنية غير موجودة" : "Case Not Found"}>
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">{isAr ? "لم يتم العثور على الحالة المطلوبة." : "Technical study not found."}</p>
          <Link to="/presales" search={{ tab: "cases" } as any} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" /> {isAr ? "العودة لقائمة الحالات" : "Back to Cases"}
          </Link>
        </div>
      </AppShell>
    );
  }

  const pageTitle = `${presalesCase.code || "PSC"} · ${isAr && presalesCase.title_ar ? presalesCase.title_ar : presalesCase.title_en}`;

  return (
    <AppShell panel="presales" user={user} pageTitle={pageTitle}>
      {/* ── Top Bar / Back navigation ── */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/presales"
          search={{ tab: "cases" } as any}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition"
        >
          <ArrowLeft className="h-4 w-4" />
          {isAr ? "العودة إلى الحالات والفرص" : "Back to Cases & Leads"}
        </Link>

        {presalesCase.lead_id && (
          <Link
            to="/presales/leads/$leadId"
            params={{ leadId: presalesCase.lead_id }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/30 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition"
          >
            <LinkIcon className="h-3.5 w-3.5 text-primary" />
            {isAr ? "عرض الفرصة بالكامل في CRM" : "View CRM Lead Profile"}
          </Link>
        )}
      </div>

      {/* ── Header Hero Card ── */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg bg-primary/10 px-3 py-1 font-mono text-sm font-bold text-primary">
                {presalesCase.code || "PSC-000"}
              </span>
              {/* Status Selector */}
              <div className="relative inline-flex items-center">
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                  className={`appearance-none rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider pe-7 cursor-pointer transition ${STATUS_COLORS[status]}`}
                >
                  {Object.entries(STATUS_LABELS_EN).map(([k, v]) => (
                    <option key={k} value={k} className="bg-card text-foreground">
                      {isAr ? STATUS_LABELS_AR[k as CaseStatus] : v}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute end-2 h-3.5 w-3.5 opacity-70" />
              </div>

              {/* Priority Selector */}
              <div className="relative inline-flex items-center">
                <select
                  value={priority}
                  onChange={(e) => handlePriorityChange(e.target.value as CasePriority)}
                  className={`appearance-none rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider pe-7 cursor-pointer transition ${PRIORITY_COLORS[priority]}`}
                >
                  {Object.entries(PRIORITY_LABELS_EN).map(([k, v]) => (
                    <option key={k} value={k} className="bg-card text-foreground">
                      {isAr ? PRIORITY_LABELS_AR[k as CasePriority] : v}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute end-2 h-3.5 w-3.5 opacity-70" />
              </div>
            </div>

            {/* Editable Title */}
            <div className="space-y-1">
              <input
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder={isAr ? "عنوان الدراسة الفنية (إنجليزي)..." : "Technical Study Title (English)..."}
                className="w-full rounded-lg border-b border-transparent bg-transparent font-display text-xl font-extrabold text-foreground hover:border-border focus:border-primary focus:bg-secondary/20 focus:outline-none px-1 py-0.5"
              />
              <input
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                placeholder={isAr ? "عنوان الدراسة الفنية (عربي)..." : "Technical Study Title (Arabic)..."}
                className="w-full rounded-lg border-b border-transparent bg-transparent text-sm font-semibold text-muted-foreground hover:border-border focus:border-primary focus:bg-secondary/20 focus:outline-none px-1 py-0.5"
              />
            </div>

            {/* Sub-meta tags */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold text-foreground">
                  {leadData?.company_en || presalesCase.client?.name_en || (isAr ? "غير محدد" : "Unspecified")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {fmtDate(presalesCase.created_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>
                  {isAr ? "المهندس المسؤول:" : "Assigned Engineer:"}{" "}
                  <strong className="text-foreground">
                    {presalesCase.assigned_profile?.full_name_en || (isAr ? "غير مسند" : "Unassigned")}
                  </strong>
                </span>
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleCopyStudyMarkdown}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-bold text-foreground shadow-sm hover:bg-secondary transition"
              title={isAr ? "نسخ ملخص الدراسة" : "Copy Study Summary"}
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
              <span>{isAr ? "نسخ الملخص" : "Copy Summary"}</span>
            </button>
            <button
              onClick={saveFullTechnicalStudy}
              disabled={savingStudy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90 transition disabled:opacity-50"
            >
              {savingStudy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{isAr ? "حفظ الدراسة الفنية" : "Save Technical Study"}</span>
            </button>
            <button
              onClick={() => {
                setOfferForm((f) => ({ ...f, total_cost: String(totalEstimatedCost || totalBoqCost || 0) }));
                setShowOfferModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-sm hover:bg-secondary transition"
            >
              <Coins className="h-4 w-4 text-amber-500" />
              <span>{isAr ? "+ عرض مالي" : "+ Financial Offer"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Layout: 2 Columns ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* ── Left Column: Linked CRM Lead Context (Read-Only Reference) ── */}
        <div className="xl:col-span-4 space-y-6">
          {/* 1. Account & Lead Summary Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold">{isAr ? "بيانات الفرصة والعميل (CRM)" : "Linked CRM Lead Profile"}</h3>
              </div>
              {leadData?.code && (
                <span className="font-mono text-xs font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                  {leadData.code}
                </span>
              )}
            </div>

            {leadData ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{isAr ? "اسم الشركة / الحساب" : "Company / Account"}</div>
                  <div className="font-semibold text-foreground text-sm mt-0.5">
                    {leadData.company_en || "—"}
                    {leadData.company_ar ? ` (${leadData.company_ar})` : ""}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{isAr ? "جهة الاتصال" : "Contact Person"}</div>
                    <div className="font-medium text-foreground mt-0.5">{leadData.contact_name_en || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{isAr ? "مرحلة الصفقة" : "Deal Stage"}</div>
                    <div className="font-bold text-primary mt-0.5 uppercase">{leadData.status || "—"}</div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-border/60">
                  {leadData.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <a href={`tel:${leadData.phone}`} className="hover:underline font-mono text-foreground">{leadData.phone}</a>
                    </div>
                  )}
                  {leadData.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      <a href={`mailto:${leadData.email}`} className="hover:underline text-foreground truncate">{leadData.email}</a>
                    </div>
                  )}
                  {(leadData.city_en || leadData.district_en) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{[leadData.district_en, leadData.city_en].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
                  <div className="rounded-xl bg-secondary/50 p-2.5">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">{isAr ? "قيمة الصفقة المتوقعة" : "Expected Value"}</div>
                    <div className="font-mono text-sm font-bold text-foreground mt-0.5">{fmtMoney(leadData.value)}</div>
                  </div>
                  <div className="rounded-xl bg-secondary/50 p-2.5">
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">{isAr ? "نسبة الفوز" : "Probability"}</div>
                    <div className="font-mono text-sm font-bold text-emerald-600 mt-0.5">{leadData.probability ?? 0}%</div>
                  </div>
                </div>

                {/* Sales Lead Owner */}
                {leadData.owner && (
                  <div className="rounded-xl border border-border/80 bg-background p-3 mt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{isAr ? "مسؤول المبيعات (CRM Owner)" : "Sales Representative"}</div>
                    <div className="font-semibold text-foreground mt-1 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      {leadData.owner.full_name_en}
                    </div>
                    {leadData.owner.email && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{leadData.owner.email}</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {isAr ? "هذه الحالة غير مرتبطة بصفقة CRM محددة." : "This case is not linked to a CRM lead."}
              </div>
            )}
          </div>

          {/* 2. Requested Systems / Scope from CRM */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-violet-500" />
                <h3 className="font-display text-sm font-bold">{isAr ? "الأنظمة المطلوبة (CRM Scope)" : "Requested Systems / Catalog"}</h3>
              </div>
              <span className="rounded-full bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
                {leadItems.length}
              </span>
            </div>

            {leadItems.length === 0 ? (
              <div className="py-5 text-center text-xs text-muted-foreground">
                {isAr ? "لم يتم إدراج أنظمة مخصصة في الصفقة بعد." : "No specific systems listed in CRM lead."}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pe-1">
                {leadItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-background p-3 hover:border-primary/40 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-xs text-foreground">{item.service_name_en || item.details || "System item"}</div>
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold">Qty: {item.quantity || 1}</span>
                    </div>
                    {item.details && item.details !== item.service_name_en && (
                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.details}</div>
                    )}
                    {item.total_price > 0 && (
                      <div className="font-mono text-[11px] font-semibold text-emerald-600 mt-1">{fmtMoney(item.total_price)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Lead Attachments & RFPs */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-amber-500" />
                <h3 className="font-display text-sm font-bold">{isAr ? "مستندات وكراسات العميل (RFPs)" : "Lead Documents & Tender RFPs"}</h3>
              </div>
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                {leadFiles.length}
              </span>
            </div>

            {leadFiles.length === 0 ? (
              <div className="py-5 text-center text-xs text-muted-foreground">
                {isAr ? "لا توجد ملفات مرفقة في الصفقة." : "No documents attached to this lead."}
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pe-1">
                {leadFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between rounded-xl border border-border bg-background p-2.5 hover:border-primary/40 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-foreground">{file.name_en || file.name || "Document"}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtDate(file.created_at)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadAttachment(file.storage_path, file.name_en || "file")}
                      className="rounded-lg p-1.5 hover:bg-secondary text-primary transition"
                      title={isAr ? "تحميل الملف" : "Download File"}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Technical Study Worksheets & Scoping Fields ── */}
        <div className="xl:col-span-8 space-y-6">
          {/* Worksheet Navigation Tabs */}
          <div className="rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center gap-1">
              {[
                { key: "scope", labelEn: "Technical Study & Architecture", labelAr: "الدراسة الفنية وهندسة الأنظمة", icon: Sparkles },
                { key: "boq", labelEn: `BOQ (${boqItems.length})`, labelAr: `جدول الكميات (${boqItems.length})`, icon: FileSpreadsheet },
                { key: "cost", labelEn: `Costing (${costItems.length})`, labelAr: `تقدير التكاليف (${costItems.length})`, icon: DollarSign },
                { key: "offers", labelEn: `Offers (${offers.length})`, labelAr: `العروض المالية (${offers.length})`, icon: Coins },
                { key: "handover", labelEn: `Handover (${handovers.length})`, labelAr: `تسليم العمليات (${handovers.length})`, icon: Workflow },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {isAr ? tab.labelAr : tab.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── TAB 1: Technical Study & System Architecture (Structured + Dynamic Custom Fields) ── */}
          {activeTab === "scope" && (
            <div className="space-y-6">
              {/* Study Header Card */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        {isAr ? "الدراسة الفنية وهندسة الأنظمة (System Architecture & Specs)" : "Technical Study & System Architecture"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isAr
                          ? "سجل كافة محاور الدراسة الهندسية، مع إمكانية إضافة أقسام وحقول مخصصة ديناميكية."
                          : "Document engineering scope, architecture, compliance, and add custom technical fields."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOpenAddCustomField}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isAr ? "+ إضافة حقل / قسم مخصص" : "+ Add Custom Field"}</span>
                    </button>
                    <button
                      onClick={saveFullTechnicalStudy}
                      disabled={savingStudy}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition disabled:opacity-50"
                    >
                      {savingStudy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      <span>{isAr ? "حفظ التعديلات" : "Save Changes"}</span>
                    </button>
                  </div>
                </div>

                {/* Engineer & Status Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {isAr ? "المهندس المكلف بالدراسة" : "Assigned Presales Engineer"}
                    </label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">{isAr ? "— اختر المهندس —" : "— Select Engineer —"}</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name_en} {p.title_en ? `(${p.title_en})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {isAr ? "حالة الدراسة الفنية" : "Technical Case Status"}
                    </label>
                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      {Object.entries(STATUS_LABELS_EN).map(([k, v]) => (
                        <option key={k} value={k}>
                          {isAr ? STATUS_LABELS_AR[k as CaseStatus] : v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Core Structured Technical Fields ── */}
              <div className="space-y-4">
                {/* 1. Scope of Work & Objectives */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition focus-within:border-primary/60">
                  <div className="mb-2 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <Target className="h-4 w-4" />
                    <span>{isAr ? "1. نطاق العمل العام والأهداف (Scope of Work & Objectives)" : "1. Scope of Work & Key Objectives"}</span>
                  </div>
                  <textarea
                    value={studyData.scope_summary}
                    onChange={(e) => setStudyData((s) => ({ ...s, scope_summary: e.target.value }))}
                    rows={3}
                    placeholder={
                      isAr
                        ? "وصف موجز للمشروع، الأهداف الأساسية للعميل، والأنظمة المشمولة بالحل..."
                        : "Executive summary of the project scope, client objectives, and target systems..."
                    }
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y"
                  />
                </div>

                {/* 2. System Architecture & Topology */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition focus-within:border-primary/60">
                  <div className="mb-2 flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-xs uppercase tracking-wider">
                    <Network className="h-4 w-4" />
                    <span>{isAr ? "2. بنية وتصميم الأنظمة والشبكات (System Architecture & Topology)" : "2. System Architecture & Topology"}</span>
                  </div>
                  <textarea
                    value={studyData.architecture_design}
                    onChange={(e) => setStudyData((s) => ({ ...s, architecture_design: e.target.value }))}
                    rows={4}
                    placeholder={
                      isAr
                        ? "المخطط الهيكلي، طبولوجيا الشبكة، الخوادم ووحدات التخزين، النطاق الترددي (Bandwidth)، ومراكز التحكم..."
                        : "Describe system architecture, network topology, server/storage design, control rooms, bandwidth & redundancy..."
                    }
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y"
                  />
                </div>

                {/* 3. Site Survey & Environmental Conditions */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition focus-within:border-primary/60">
                  <div className="mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <MapPin className="h-4 w-4" />
                    <span>{isAr ? "3. نتائج المعاينة الميدانية وشروط الموقع (Site Survey & Conditions)" : "3. Site Survey & Environmental Conditions"}</span>
                  </div>
                  <textarea
                    value={studyData.site_survey}
                    onChange={(e) => setStudyData((s) => ({ ...s, site_survey: e.target.value }))}
                    rows={3}
                    placeholder={
                      isAr
                        ? "جاهزية الموقع، مسارات الكابلات، مصادر الطاقة، مساحات الراك، ظروف درجات الحرارة الداخلية والخارجية..."
                        : "Site readiness, cable containment routes, power supply availability, rack space, indoor/outdoor environmental conditions..."
                    }
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y"
                  />
                </div>

                {/* 4. Technical Specifications & Equipment Models */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition focus-within:border-primary/60">
                  <div className="mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                    <Server className="h-4 w-4" />
                    <span>{isAr ? "4. المواصفات الفنية والمعدات المعتمدة (Hardware Specifications)" : "4. Technical Specifications & Hardware"}</span>
                  </div>
                  <textarea
                    value={studyData.system_specs}
                    onChange={(e) => setStudyData((s) => ({ ...s, system_specs: e.target.value }))}
                    rows={3}
                    placeholder={
                      isAr
                        ? "الموديلات المقترحة، الدقة، العدسات، السويتشات، وحدات التخزين، مواصفات السيرفرات والتراخيص..."
                        : "Hardware models, camera resolutions/lenses, PoE switches, NVR/SAN storage specs, OS & VMS licensing..."
                    }
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y"
                  />
                </div>

                {/* 5. Integration & Interfaces */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition focus-within:border-primary/60">
                  <div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
                    <Workflow className="h-4 w-4" />
                    <span>{isAr ? "5. التكامل والربط مع الأنظمة الأخرى (Integration & Third-Party Interfaces)" : "5. System Integration & Interfaces"}</span>
                  </div>
                  <textarea
                    value={studyData.integration_interfaces}
                    onChange={(e) => setStudyData((s) => ({ ...s, integration_interfaces: e.target.value }))}
                    rows={3}
                    placeholder={
                      isAr
                        ? "الربط مع أنظمة التحكم بالدخول، إنذار الحريق، بروتوكولات ONVIF/API، أو بوابات الدفع والتسجيل..."
                        : "Integration with Access Control, Fire Alarm, BMS, ONVIF/APIs, PSIM platforms or third-party databases..."
                    }
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y"
                  />
                </div>

                {/* 6. Standards, Codes & Compliance */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition focus-within:border-primary/60">
                  <div className="mb-2 flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4" />
                    <span>{isAr ? "6. المعايير الهندسية والامتثال (Standards & Compliance - SASO, HCIS, CD)" : "6. Compliance & Engineering Standards"}</span>
                  </div>
                  <textarea
                    value={studyData.compliance_standards}
                    onChange={(e) => setStudyData((s) => ({ ...s, compliance_standards: e.target.value }))}
                    rows={2}
                    placeholder={
                      isAr
                        ? "مطابقة اشتراطات الدفاع المدني، الهيئة العليا للأمن الصناعي (HCIS)، المواصفات القياسية السعودية (SASO)..."
                        : "Compliance with SASO, HCIS directives, Civil Defense regulations, NFPA, BICSI, ISO standards..."
                    }
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y"
                  />
                </div>

                {/* 7. Risks, Assumptions & Exclusions */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition focus-within:border-primary/60">
                  <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{isAr ? "7. الفرضيات، المخاطر والاستثناءات (Risks, Assumptions & Exclusions)" : "7. Risks, Assumptions & Exclusions"}</span>
                  </div>
                  <textarea
                    value={studyData.risks_exclusions}
                    onChange={(e) => setStudyData((s) => ({ ...s, risks_exclusions: e.target.value }))}
                    rows={3}
                    placeholder={
                      isAr
                        ? "الأعمال المدنية المستثناة، التغذية الكهربائية المطلوبة من العميل، نقاط التوقف المحتملة والفرضيات الهندسية..."
                        : "Excluded civil/trenching works, client-supplied power/internet, environmental risks and critical dependencies..."
                    }
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y"
                  />
                </div>

                {/* 8. Delivery & Execution Timeline */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition focus-within:border-primary/60">
                  <div className="mb-2 flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <Clock className="h-4 w-4" />
                    <span>{isAr ? "8. الجدول الزمني المتوقع للتوريد والتنفيذ (Timeline & Delivery Schedule)" : "8. Estimated Timeline & Delivery Schedule"}</span>
                  </div>
                  <textarea
                    value={studyData.timeline_delivery}
                    onChange={(e) => setStudyData((s) => ({ ...s, timeline_delivery: e.target.value }))}
                    rows={2}
                    placeholder={
                      isAr
                        ? "مدة توريد المواد (Lead time)، مراحل التركيب، والمدة المتوقعة للاختبار والتشغيل التجريبي (Testing & Commissioning)..."
                        : "Material procurement lead times, installation milestones, testing & commissioning duration..."
                    }
                    className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y"
                  />
                </div>
              </div>

              {/* ── DYNAMIC CUSTOM FIELDS SECTION ── */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h4 className="font-display text-sm font-bold text-foreground">
                      {isAr ? `الحقول والأقسام الفنية المخصصة (${studyData.custom_fields?.length || 0})` : `Custom Technical Fields & Sections (${studyData.custom_fields?.length || 0})`}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {isAr ? "أضف أي محاور إضافية خاصة بالمشروع مثل الحسابات، شروط الضمان، أو متطلبات خاصة." : "Add bespoke project sections like storage calculations, warranty terms, or special requirements."}
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddCustomField}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-secondary/80 transition"
                  >
                    <Plus className="h-3.5 w-3.5 text-primary" />
                    <span>{isAr ? "+ إضافة حقل مخصص" : "+ Add Field"}</span>
                  </button>
                </div>

                {(!studyData.custom_fields || studyData.custom_fields.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
                    <p className="text-xs text-muted-foreground">
                      {isAr
                        ? "لم تتم إضافة حقول مخصصة بعد. يمكنك النقر على '+ إضافة حقل / قسم مخصص' لإدراج أقسام إضافية."
                        : "No custom fields added yet. Click '+ Add Custom Field' to add unique specifications."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studyData.custom_fields.map((field, idx) => (
                      <div
                        key={field.id || idx}
                        className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] hover:border-primary/40 transition space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              {field.category || "General"}
                            </span>
                            <h5 className="font-bold text-sm text-foreground">
                              {field.title_en || field.title_ar}
                              {field.title_ar && field.title_en && ` (${field.title_ar})`}
                            </h5>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveCustomField(idx, "up")}
                              disabled={idx === 0}
                              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                              title={isAr ? "تحريك لأعلى" : "Move Up"}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveCustomField(idx, "down")}
                              disabled={idx === studyData.custom_fields.length - 1}
                              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30"
                              title={isAr ? "تحريك لأسفل" : "Move Down"}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEditCustomField(field)}
                              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-primary"
                              title={isAr ? "تعديل الحقل" : "Edit Field"}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomField(field.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                              title={isAr ? "حذف الحقل" : "Delete Field"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <textarea
                          value={field.details}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStudyData((prev) => {
                              const list = [...prev.custom_fields];
                              list[idx] = { ...list[idx], details: val };
                              return { ...prev, custom_fields: list };
                            });
                          }}
                          rows={3}
                          placeholder={isAr ? "اكتب التفاصيل والمواصفات هنا..." : "Enter details & specifications here..."}
                          className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Sticky-like Save Bar */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleCopyStudyMarkdown}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground shadow-sm hover:bg-secondary transition"
                >
                  <Copy className="h-4 w-4" />
                  <span>{isAr ? "نسخ الملخص الكامل" : "Copy Full Summary"}</span>
                </button>
                <button
                  onClick={saveFullTechnicalStudy}
                  disabled={savingStudy}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {savingStudy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{isAr ? "حفظ كافة البيانات الفنية" : "Save All Technical Specs"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 2: Bill of Quantities (BOQ) ── */}
          {activeTab === "boq" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold">{isAr ? "جدول حصر الكميات (BOQ)" : "Bill of Quantities (BOQ)"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? "إجمالي بنود جدول الكميات لهذه الدراسة الفنية." : "Manage system items, hardware components, and quantities."}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40 px-3.5 py-1.5 text-end">
                    <div className="text-[10px] font-bold uppercase text-violet-800 dark:text-violet-300">{isAr ? "إجمالي التكلفة التقديرية" : "Total BOQ Cost"}</div>
                    <div className="font-mono text-sm font-bold text-violet-900 dark:text-violet-200">{fmtMoney(totalBoqCost)}</div>
                  </div>
                  <button
                    onClick={() => {
                      setBoqForm({ id: "", description_en: "", description_ar: "", unit: "Pcs", quantity: "1", unit_cost: "0", notes: "" });
                      setShowBoqModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                  >
                    <Plus className="h-4 w-4" />
                    {isAr ? "إضافة بند BOQ" : "Add BOQ Item"}
                  </button>
                </div>
              </div>

              {/* BOQ Table */}
              <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-start w-12">#</th>
                        <th className="px-4 py-3 text-start">{isAr ? "الوصف الفني للمادة / النظام" : "Description / System"}</th>
                        <th className="px-4 py-3 text-start">{isAr ? "الوحدة" : "Unit"}</th>
                        <th className="px-4 py-3 text-end">{isAr ? "الكمية" : "Qty"}</th>
                        <th className="px-4 py-3 text-end">{isAr ? "سعر التكلفة" : "Unit Cost"}</th>
                        <th className="px-4 py-3 text-end">{isAr ? "الإجمالي" : "Total Cost"}</th>
                        <th className="px-4 py-3 text-start">{isAr ? "ملاحظات" : "Notes"}</th>
                        <th className="px-4 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {boqItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                            {isAr ? "لا توجد بنود كميات مضافة بعد. اضغط على 'إضافة بند BOQ' للبدء." : "No BOQ items added yet. Click 'Add BOQ Item' to start."}
                          </td>
                        </tr>
                      ) : (
                        boqItems.map((item, idx) => {
                          const total = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                          return (
                            <tr key={item.id} className="border-t border-border hover:bg-secondary/20 transition">
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.item_no || idx + 1}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-foreground">{item.description_en}</div>
                                {item.description_ar && <div className="text-xs text-muted-foreground">{item.description_ar}</div>}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{item.unit || "Pcs"}</td>
                              <td className="px-4 py-3 text-end font-mono text-xs font-bold text-foreground">{item.quantity}</td>
                              <td className="px-4 py-3 text-end font-mono text-xs text-muted-foreground">{fmtMoney(item.unit_cost)}</td>
                              <td className="px-4 py-3 text-end font-mono text-xs font-bold text-primary">{fmtMoney(total)}</td>
                              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[150px] truncate">{item.notes || "—"}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => {
                                      setBoqForm({
                                        id: item.id,
                                        description_en: item.description_en,
                                        description_ar: item.description_ar || "",
                                        unit: item.unit || "Pcs",
                                        quantity: String(item.quantity),
                                        unit_cost: String(item.unit_cost),
                                        notes: item.notes || "",
                                      });
                                      setShowBoqModal(true);
                                    }}
                                    className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteBoqItem(item.id)}
                                    className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: Cost Estimation ── */}
          {activeTab === "cost" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold">{isAr ? "تحليل وتقدير التكاليف (Cost Estimation)" : "Project Cost Breakdown & Estimation"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? "تصنيف التكاليف حسب المواد، العمالة، مقاولي الباطن، والخدمات الهندسية." : "Breakdown costs by materials, labor, subcontractors, logistics, and engineering."}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-3.5 py-1.5 text-end">
                    <div className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">{isAr ? "إجمالي التكلفة المقدرة" : "Total Estimated Cost"}</div>
                    <div className="font-mono text-sm font-bold text-emerald-900 dark:text-emerald-200">{fmtMoney(totalEstimatedCost)}</div>
                  </div>
                  <button
                    onClick={() => {
                      setCostForm({ id: "", category: "materials", description_en: "", description_ar: "", quantity: "1", unit_cost: "0" });
                      setShowCostModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                  >
                    <Plus className="h-4 w-4" />
                    {isAr ? "إضافة بند تكلفة" : "Add Cost Item"}
                  </button>
                </div>
              </div>

              {/* Cost Items Table */}
              <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-start">{isAr ? "الفئة" : "Category"}</th>
                        <th className="px-4 py-3 text-start">{isAr ? "الوصف" : "Description"}</th>
                        <th className="px-4 py-3 text-end">{isAr ? "الكمية" : "Qty"}</th>
                        <th className="px-4 py-3 text-end">{isAr ? "سعر التكلفة" : "Unit Cost"}</th>
                        <th className="px-4 py-3 text-end">{isAr ? "الإجمالي" : "Subtotal"}</th>
                        <th className="px-4 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {costItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                            {isAr ? "لا توجد بنود تكاليف مضافة بعد." : "No cost items added yet."}
                          </td>
                        </tr>
                      ) : (
                        costItems.map((item) => {
                          const total = (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0);
                          return (
                            <tr key={item.id} className="border-t border-border hover:bg-secondary/20 transition">
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  {item.category || "General"}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-semibold text-foreground">{item.description_en}</td>
                              <td className="px-4 py-3 text-end font-mono text-xs">{item.quantity}</td>
                              <td className="px-4 py-3 text-end font-mono text-xs text-muted-foreground">{fmtMoney(item.unit_cost)}</td>
                              <td className="px-4 py-3 text-end font-mono text-xs font-bold text-emerald-600">{fmtMoney(total)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    onClick={() => {
                                      setCostForm({
                                        id: item.id,
                                        category: item.category || "materials",
                                        description_en: item.description_en,
                                        description_ar: item.description_ar || "",
                                        quantity: String(item.quantity),
                                        unit_cost: String(item.unit_cost),
                                      });
                                      setShowCostModal(true);
                                    }}
                                    className="rounded p-1 text-muted-foreground hover:text-primary hover:bg-secondary"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteCostItem(item.id)}
                                    className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Financial Offers ── */}
          {activeTab === "offers" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold">{isAr ? "العروض المالية والمقترحات" : "Financial Proposals & Offers"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? "إنشاء وتتبع عروض الأسعار المقدمة للعميل بناءً على دراسة التكاليف." : "Generate and track customer quotations with profit margin calculations."}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setOfferForm({
                      offer_date: new Date().toISOString().slice(0, 10),
                      valid_until: "",
                      total_cost: String(totalEstimatedCost || totalBoqCost || 0),
                      margin_pct: "20",
                      currency: "SAR",
                      notes: "",
                    });
                    setShowOfferModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                >
                  <Plus className="h-4 w-4" />
                  {isAr ? "إنشاء عرض مالي جديد" : "Create Financial Offer"}
                </button>
              </div>

              {offers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground">
                  {isAr ? "لم يتم إنشاء عروض مالية لهذه الحالة بعد. اضغط على الزر بالأعلى للإنشاء." : "No financial offers created for this case yet."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {offers.map((off) => (
                    <div key={off.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-primary">{off.offer_code || "PFO-000"}</span>
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {off.status || "Draft"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border">
                        <div>
                          <span className="text-muted-foreground">{isAr ? "التكلفة:" : "Total Cost:"}</span>
                          <div className="font-mono font-semibold">{fmtMoney(off.total_cost, off.currency)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{isAr ? "هامش الربح:" : "Margin:"}</span>
                          <div className="font-mono font-bold text-emerald-600">+{off.margin_pct}%</div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-secondary/50 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{isAr ? "سعر البيع النهائي" : "Selling Price"}</div>
                        <div className="font-mono text-lg font-extrabold text-foreground mt-0.5">{fmtMoney(off.selling_price, off.currency)}</div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                        <span>{isAr ? "تاريخ العرض:" : "Date:"} {fmtDate(off.offer_date)}</span>
                        {off.valid_until && <span>{isAr ? "صالح حتى:" : "Valid until:"} {fmtDate(off.valid_until)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 5: Handover ── */}
          {activeTab === "handover" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-bold">{isAr ? "تسليم المشروع للعمليات (Project Handover)" : "Project Operations Handover"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAr ? "توثيق محضر تسليم المشروع من فريق ما قبل المبيعات إلى إدارة المشاريع والعمليات." : "Handover study, BOQ, and specifications to the project execution team."}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setHandoverForm({ handover_date: new Date().toISOString().slice(0, 10), received_by: "", notes: "" });
                    setShowHandoverModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  {isAr ? "توثيق تسليم جديد" : "Record Handover"}
                </button>
              </div>

              {handovers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground">
                  {isAr ? "لم يتم تسجيل أي محضر تسليم للعمليات بعد." : "No handover records registered yet."}
                </div>
              ) : (
                <div className="space-y-3">
                  {handovers.map((h) => (
                    <div key={h.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] flex items-start justify-between">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-bold px-2.5 py-0.5 text-[10px] uppercase">
                            {h.status || "Pending"}
                          </span>
                          <span className="font-semibold text-foreground">{fmtDate(h.handover_date)}</span>
                        </div>
                        <div className="text-muted-foreground">
                          {isAr ? "المُسلِّم:" : "Handed by:"} <strong className="text-foreground">{h.handed_profile?.full_name_en || user.name}</strong>
                          {" · "}
                          {isAr ? "المُستلِم:" : "Received by:"} <strong className="text-foreground">{h.received_profile?.full_name_en || (isAr ? "غير محدد" : "Unspecified")}</strong>
                        </div>
                        {h.notes && <div className="text-xs text-muted-foreground mt-2 bg-secondary/40 p-2.5 rounded-lg">{h.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}

      {/* Dynamic Custom Technical Field Modal */}
      {showCustomFieldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold">
                {customFieldForm.id
                  ? (isAr ? "تعديل الحقل / القسم الفني المخصص" : "Edit Custom Field / Section")
                  : (isAr ? "إضافة حقل / قسم فني مخصص جديد" : "Add Custom Field / Section")}
              </h3>
              <button onClick={() => setShowCustomFieldModal(false)} className="rounded-lg p-1.5 hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">
                    {isAr ? "عنوان الحقل (إنجليزي) *" : "Field Title (English) *"}
                  </label>
                  <input
                    value={customFieldForm.title_en}
                    onChange={(e) => setCustomFieldForm((f) => ({ ...f, title_en: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. Storage & Retention Calculations"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">
                    {isAr ? "عنوان الحقل (عربي)" : "Field Title (Arabic)"}
                  </label>
                  <input
                    value={customFieldForm.title_ar || ""}
                    onChange={(e) => setCustomFieldForm((f) => ({ ...f, title_ar: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="مثال: حسابات سعة التخزين والباندويث"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-muted-foreground">
                  {isAr ? "تصنيف / فئة الحقل" : "Category"}
                </label>
                <select
                  value={customFieldForm.category}
                  onChange={(e) => setCustomFieldForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  {FIELD_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {isAr ? cat.labelAr : cat.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-bold text-muted-foreground">
                  {isAr ? "التفاصيل والمواصفات الفنية" : "Details & Technical Specifications"}
                </label>
                <textarea
                  value={customFieldForm.details}
                  onChange={(e) => setCustomFieldForm((f) => ({ ...f, details: e.target.value }))}
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none leading-relaxed resize-y font-sans"
                  placeholder={
                    isAr
                      ? "اكتب هنا تفاصيل الحقل، المعادلات، الشروط، أو المواصفات الخاصة..."
                      : "Enter technical notes, formulas, calculations, or specifications..."
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setShowCustomFieldModal(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSaveCustomField}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                {isAr ? "حفظ الحقل" : "Save Field"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOQ Item Modal */}
      {showBoqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold">{boqForm.id ? (isAr ? "تعديل بند BOQ" : "Edit BOQ Item") : (isAr ? "إضافة بند BOQ جديد" : "Add BOQ Item")}</h3>
              <button onClick={() => setShowBoqModal(false)} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "الوصف بالإنجليزية *" : "Description (English) *"}</label>
                <input
                  value={boqForm.description_en}
                  onChange={(e) => setBoqForm((f) => ({ ...f, description_en: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="e.g. 4MP IP Dome Camera with IR"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "الوصف بالعربية" : "Description (Arabic)"}</label>
                <input
                  value={boqForm.description_ar}
                  onChange={(e) => setBoqForm((f) => ({ ...f, description_ar: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="مثال: كاميرا شبكية بدقة 4 ميجابكسل"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "الوحدة" : "Unit"}</label>
                  <input
                    value={boqForm.unit}
                    onChange={(e) => setBoqForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-mono"
                    placeholder="Pcs"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "الكمية" : "Quantity"}</label>
                  <input
                    type="number"
                    value={boqForm.quantity}
                    onChange={(e) => setBoqForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "سعر التكلفة" : "Unit Cost"}</label>
                  <input
                    type="number"
                    value={boqForm.unit_cost}
                    onChange={(e) => setBoqForm((f) => ({ ...f, unit_cost: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "ملاحظات فنية" : "Notes"}</label>
                <input
                  value={boqForm.notes}
                  onChange={(e) => setBoqForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="e.g. Includes mounting bracket"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button onClick={() => setShowBoqModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
              <button onClick={saveBoqItem} disabled={savingBoq || !boqForm.description_en.trim()} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {savingBoq ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ البند" : "Save Item")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cost Item Modal */}
      {showCostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold">{costForm.id ? (isAr ? "تعديل بند التكلفة" : "Edit Cost Item") : (isAr ? "إضافة بند تكلفة جديد" : "Add Cost Item")}</h3>
              <button onClick={() => setShowCostModal(false)} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "الفئة" : "Category"}</label>
                <select
                  value={costForm.category}
                  onChange={(e) => setCostForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="materials">{isAr ? "مواد وتجهيزات (Materials)" : "Materials & Hardware"}</option>
                  <option value="labor">{isAr ? "أجور عمالة وتركيب (Labor)" : "Labor & Installation"}</option>
                  <option value="subcontractor">{isAr ? "مقاول باطن (Subcontractor)" : "Subcontractor"}</option>
                  <option value="engineering">{isAr ? "خدمات هندسية وبرمجة (Engineering)" : "Engineering & Programming"}</option>
                  <option value="logistics">{isAr ? "شحن ونقل ولوجستيات (Logistics)" : "Logistics & Transport"}</option>
                  <option value="other">{isAr ? "أخرى (Other)" : "Other"}</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "الوصف *" : "Description *"}</label>
                <input
                  value={costForm.description_en}
                  onChange={(e) => setCostForm((f) => ({ ...f, description_en: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="e.g. Fiber Splicing & Cable Pulling"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "الكمية" : "Quantity"}</label>
                  <input
                    type="number"
                    value={costForm.quantity}
                    onChange={(e) => setCostForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "سعر التكلفة" : "Unit Cost"}</label>
                  <input
                    type="number"
                    value={costForm.unit_cost}
                    onChange={(e) => setCostForm((f) => ({ ...f, unit_cost: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button onClick={() => setShowCostModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
              <button onClick={saveCostItem} disabled={savingCost || !costForm.description_en.trim()} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {savingCost ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold">{isAr ? "إنشاء عرض مالي جديد" : "Create Financial Offer"}</h3>
              <button onClick={() => setShowOfferModal(false)} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "تاريخ العرض" : "Offer Date"}</label>
                  <input
                    type="date"
                    value={offerForm.offer_date}
                    onChange={(e) => setOfferForm((f) => ({ ...f, offer_date: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "صالح حتى" : "Valid Until"}</label>
                  <input
                    type="date"
                    value={offerForm.valid_until}
                    onChange={(e) => setOfferForm((f) => ({ ...f, valid_until: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "التكلفة الإجمالية" : "Total Cost"}</label>
                  <input
                    type="number"
                    value={offerForm.total_cost}
                    onChange={(e) => setOfferForm((f) => ({ ...f, total_cost: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "هامش الربح %" : "Profit Margin %"}</label>
                  <input
                    type="number"
                    value={offerForm.margin_pct}
                    onChange={(e) => setOfferForm((f) => ({ ...f, margin_pct: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-mono"
                  />
                </div>
              </div>
              {/* Calculated selling price preview */}
              <div className="rounded-xl bg-secondary/60 p-3">
                <div className="text-[10px] font-bold uppercase text-muted-foreground">{isAr ? "سعر البيع المقترح للعميل" : "Calculated Selling Price"}</div>
                <div className="font-mono text-base font-extrabold text-primary mt-0.5">
                  {fmtMoney((parseFloat(offerForm.total_cost) || 0) * (1 + (parseFloat(offerForm.margin_pct) || 0) / 100))}
                </div>
              </div>
              <div>
                <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "ملاحظات أو شروط الدفع" : "Notes / Terms"}</label>
                <textarea
                  value={offerForm.notes}
                  onChange={(e) => setOfferForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-none resize-none"
                  placeholder="e.g. 50% advance, 50% on delivery"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button onClick={() => setShowOfferModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
              <button onClick={saveOffer} disabled={savingOffer} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {savingOffer ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "إنشاء العرض" : "Create Offer")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-base font-bold">{isAr ? "تسليم المشروع للعمليات" : "Handover to Operations"}</h3>
              <button onClick={() => setShowHandoverModal(false)} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "تاريخ التسليم" : "Handover Date"}</label>
                <input
                  type="date"
                  value={handoverForm.handover_date}
                  onChange={(e) => setHandoverForm((f) => ({ ...f, handover_date: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "المستلم (مدير المشروع / العمليات)" : "Received by (PM / Operations)"}</label>
                <select
                  value={handoverForm.received_by}
                  onChange={(e) => setHandoverForm((f) => ({ ...f, received_by: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">{isAr ? "— اختر المسؤول —" : "— Select Engineer / PM —"}</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name_en} {p.title_en ? `(${p.title_en})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-bold text-muted-foreground">{isAr ? "ملاحظات التسليم والمرفقات" : "Handover Notes"}</label>
                <textarea
                  value={handoverForm.notes}
                  onChange={(e) => setHandoverForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background p-2.5 text-xs focus:border-primary focus:outline-none resize-none"
                  placeholder="e.g. All BOQ and tender documents delivered."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button onClick={() => setShowHandoverModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
              <button onClick={saveHandover} disabled={savingHandover} className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50">
                {savingHandover ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "تسجيل التسليم" : "Submit Handover")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
