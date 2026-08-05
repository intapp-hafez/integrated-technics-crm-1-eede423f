import { createFileRoute, useSearch, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { actions, useStoreState, getProbabilityForStatus, type Lead, type LeadStatus } from "@/lib/store";
import { fmtMoney } from "@/lib/mock-data";
import { shortId, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { LeadFormModal } from "@/components/leads/LeadFormModal";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase as rawSupabase } from "@/integrations/supabase/client";
const supabase = rawSupabase as any;
import { useEffect, useState, useMemo, useCallback, type ComponentType } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Layers,
  Calculator,
  DollarSign,
  PackageCheck,
  Users,
  UserCircle2,
  Plus,
  Search,
  Filter,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Pencil,
  Trash2,
  X,
  Save,
  ArrowRight,
  Building2,
  ExternalLink,
  KeyRound,
  List,
  Map as MapIcon,
  Download,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "cases" | "boq" | "cost" | "offers" | "handover" | "crm" | "profile";

type CaseStatus = "new" | "under_review" | "boq_ready" | "offer_sent" | "approved" | "handover" | "closed";
type CasePriority = "low" | "medium" | "high" | "urgent";
type OfferStatus = "draft" | "submitted" | "approved" | "rejected" | "revised";

interface PresalesCase {
  id: string;
  code: string | null;
  title_en: string;
  title_ar: string | null;
  status: CaseStatus;
  priority: CasePriority;
  technical_notes: string | null;
  assigned_to: string | null;
  lead_id: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_profile?: { full_name_en: string | null; full_name_ar: string | null } | null;
  lead?: { code: string | null; company_en: string } | null;
  client?: { name_en: string } | null;
}

interface BoqItem {
  id: string;
  case_id: string;
  item_no: number | null;
  description_en: string;
  description_ar: string | null;
  unit: string | null;
  quantity: number;
  unit_cost: number;
  notes: string | null;
  sort_order: number;
}

interface CostItem {
  id: string;
  case_id: string;
  category: string | null;
  description_en: string;
  description_ar: string | null;
  quantity: number;
  unit_cost: number;
  sort_order: number;
}

interface FinancialOffer {
  id: string;
  case_id: string;
  offer_code: string | null;
  offer_date: string;
  valid_until: string | null;
  total_cost: number;
  margin_pct: number;
  selling_price: number;
  currency: string;
  status: OfferStatus;
  notes: string | null;
  created_at: string;
}

interface HandoverRecord {
  id: string;
  case_id: string;
  handover_date: string;
  handed_by: string | null;
  received_by: string | null;
  project_id: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  handed_profile?: { full_name_en: string | null } | null;
  received_profile?: { full_name_en: string | null } | null;
}

// ─── Route ─────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/presales/")({
  component: PresalesPage,
  validateSearch: (s: Record<string, unknown>): { tab?: Tab; caseId?: string; leadId?: string } => {
    const res: { tab?: Tab; caseId?: string; leadId?: string } = {
      tab: (s.tab as Tab) ?? "dashboard",
    };
    if (s.caseId) res.caseId = String(s.caseId);
    if (s.leadId) res.leadId = String(s.leadId);
    return res;
  },
  head: () => ({ meta: [{ title: "Presales Panel · INT-CRM" }] }),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_COLORS: Record<CaseStatus, string> = {
  new: "bg-sky-100 text-sky-700",
  under_review: "bg-amber-100 text-amber-700",
  boq_ready: "bg-violet-100 text-violet-700",
  offer_sent: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  handover: "bg-orange-100 text-orange-700",
  closed: "bg-gray-100 text-gray-600",
};

const PRIORITY_COLORS: Record<CasePriority, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const OFFER_STATUS_COLORS: Record<OfferStatus, string> = {
  draft: "bg-secondary text-muted-foreground",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  revised: "bg-amber-100 text-amber-700",
};

// ─── TABS CONFIG ───────────────────────────────────────────────────────────

const TABS: { key: Tab; icon: any }[] = [
  { key: "dashboard", icon: LayoutDashboard },
  { key: "crm", icon: Users },
  { key: "cases", icon: ClipboardList },
  { key: "boq", icon: Layers },
  { key: "cost", icon: Calculator },
  { key: "offers", icon: DollarSign },
  { key: "handover", icon: PackageCheck },
  { key: "profile", icon: UserCircle2 },
];

const TAB_LABEL_EN: Record<Tab, string> = {
  dashboard: "Dashboard",
  cases: "Cases",
  boq: "BOQ",
  cost: "Cost Est.",
  offers: "Offers",
  handover: "Handover",
  crm: "CRM Leads",
  profile: "Profile",
};
const TAB_LABEL_AR: Record<Tab, string> = {
  dashboard: "لوحة التحكم",
  cases: "الحالات",
  boq: "قائمة الكميات",
  cost: "تقدير التكاليف",
  offers: "العروض المالية",
  handover: "التسليم",
  crm: "صفقات CRM",
  profile: "الملف الشخصي",
};

// ─── Main Page ─────────────────────────────────────────────────────────────

function PresalesPage() {
  const { dir, lang } = useI18n();
  const isAr = dir === "rtl";
  const search = useSearch({ from: "/presales/" }) as { tab?: Tab; caseId?: string; leadId?: string };
  const navigate = useNavigate();
  const tab: Tab = search.tab ?? "dashboard";
  const setTab = (t: Tab) => navigate({ to: "/presales", search: { tab: t, caseId: undefined, leadId: undefined } });
  const { profile, user: authUser, refresh } = useAuth();
  const { leads: storeLeads = [] } = useStoreState();

  // State: data
  const [cases, setCases] = useState<PresalesCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<PresalesCase | null>(null);
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [offers, setOffers] = useState<FinancialOffer[]>([]);
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [crmLeads, setCrmLeads] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // All CRM leads across the entire system (presales has full admin-level visibility across all leads)
  const crmLeadsCombined = useMemo(() => {
    const fromStore = storeLeads.map((l) => ({
      id: l.id,
      code: l.code || `L-${String(l.id).slice(-4)}`,
      company_en: l.company || (isAr ? "بدون اسم شركة" : "Unnamed Company"),
      contact_name_en: l.contact || "",
      status: l.status,
      value: l.value || 0,
      probability: l.probability,
      expected_close_date: l.expectedCloseDate,
      owner: { full_name_en: l.owner || "Unassigned" },
      city: l.city,
    }));

    const leadMap = new Map<string, any>();
    fromStore.forEach((l) => leadMap.set(l.id, l));
    crmLeads.forEach((l) => {
      const existing = leadMap.get(l.id);
      leadMap.set(l.id, {
        ...l,
        company_en: l.company_en || existing?.company_en || (isAr ? "بدون اسم شركة" : "Unnamed Company"),
        code: l.code || existing?.code || `L-${String(l.id).slice(-4)}`,
        owner: l.owner || existing?.owner || { full_name_en: "Unassigned" },
      });
    });

    return Array.from(leadMap.values());
  }, [storeLeads, crmLeads, isAr]);

  // Displayed name
  const displayName =
    (isAr ? profile?.full_name_ar : profile?.full_name_en) ||
    profile?.full_name_en ||
    authUser?.email ||
    "—";
  const displayRole = (isAr ? profile?.title_ar : profile?.title_en) || (isAr ? "مهندس ما قبل المبيعات" : "Presales Engineer");
  const initials =
    (displayName || "")
      .split(" ")
      .map((w: string) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PS";
  const user = { name: displayName, role: displayRole, initials, photo: profile?.avatar_url || undefined };

  // ── Load data ────────────────────────────────────────────────
  const loadCases = useCallback(async () => {
    const { data } = await supabase
      .from("presales_cases")
      .select(`
        *,
        assigned_profile:profiles!assigned_to(full_name_en,full_name_ar),
        lead:leads!lead_id(code,company_en),
        client:clients!client_id(name_en)
      `)
      .order("created_at", { ascending: false });
    if (data) setCases(data as any);
  }, []);

  const loadBoq = useCallback(async (caseId: string) => {
    const { data } = await supabase
      .from("presales_boq_items")
      .select("*")
      .eq("case_id", caseId)
      .order("sort_order");
    if (data) setBoqItems(data as BoqItem[]);
  }, []);

  const loadCost = useCallback(async (caseId: string) => {
    const { data } = await supabase
      .from("presales_cost_items")
      .select("*")
      .eq("case_id", caseId)
      .order("sort_order");
    if (data) setCostItems(data as CostItem[]);
  }, []);

  const loadOffers = useCallback(async (caseId?: string) => {
    let q = supabase.from("presales_financial_offers").select("*").order("created_at", { ascending: false });
    if (caseId) q = q.eq("case_id", caseId);
    const { data } = await q;
    if (data) setOffers(data as FinancialOffer[]);
  }, []);

  const loadHandovers = useCallback(async (caseId?: string) => {
    let q = supabase
      .from("presales_handover_records")
      .select(`*, handed_profile:profiles!handed_by(full_name_en), received_profile:profiles!received_by(full_name_en)`)
      .order("created_at", { ascending: false });
    if (caseId) q = q.eq("case_id", caseId);
    const { data } = await q;
    if (data) setHandovers(data as any);
  }, []);

  const loadCrmLeads = useCallback(async () => {
    const { data } = await supabase
      .from("leads")
      .select("id,code,company_en,contact_name_en,status,value,probability,expected_close_date,owner:profiles!owner_id(full_name_en)")
      .order("updated_at", { ascending: false });
    if (data) setCrmLeads(data as any);
  }, []);

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id,full_name_en,full_name_ar").order("full_name_en");
    if (data) setProfiles(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCases(), loadCrmLeads(), loadProfiles()]).finally(() => setLoading(false));
  }, []);

  // Auto-select case from URL search parameter (caseId or leadId)
  useEffect(() => {
    if (cases.length === 0) return;
    if (search.caseId) {
      const found = cases.find((c) => c.id === search.caseId || c.code === search.caseId);
      if (found) {
        setSelectedCase(found);
      }
    } else if (search.leadId) {
      const found = cases.find((c) => c.lead_id === search.leadId);
      if (found) {
        setSelectedCase(found);
      }
    }
  }, [search.caseId, search.leadId, cases]);

  // Load sub-data when selected case changes
  useEffect(() => {
    if (!selectedCase) return;
    loadBoq(selectedCase.id);
    loadCost(selectedCase.id);
    loadOffers(selectedCase.id);
    loadHandovers(selectedCase.id);
  }, [selectedCase?.id]);

  // KPIs
  const kpis = useMemo(() => {
    const active = cases.filter((c) => !["closed", "handover"].includes(c.status)).length;
    const pending = offers.filter((o) => o.status === "submitted").length;
    const completed = handovers.filter((h) => h.status === "completed").length;
    const totalVal = offers.reduce((s, o) => s + (o.selling_price || 0), 0);
    return { active, pending, completed, totalVal };
  }, [cases, offers, handovers]);

  const pageTitle = isAr ? "لوحة ما قبل المبيعات" : "Presales Panel";

  return (
    <AppShell panel="presales" user={user} pageTitle={pageTitle}>
      {/* Tab Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {isAr ? TAB_LABEL_AR[tb.key] : TAB_LABEL_EN[tb.key]}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "dashboard" && <DashboardTab cases={cases} kpis={kpis} isAr={isAr} setTab={setTab} />}
      {tab === "cases" && (
        <CasesTab
          cases={cases}
          selectedCase={selectedCase}
          setSelectedCase={setSelectedCase}
          profiles={profiles}
          crmLeads={crmLeadsCombined}
          isAr={isAr}
          onRefresh={loadCases}
        />
      )}
      {tab === "boq" && (
        <BoqTab
          cases={cases}
          selectedCase={selectedCase}
          setSelectedCase={setSelectedCase}
          boqItems={boqItems}
          isAr={isAr}
          onRefresh={() => selectedCase && loadBoq(selectedCase.id)}
        />
      )}
      {tab === "cost" && (
        <CostTab
          cases={cases}
          selectedCase={selectedCase}
          setSelectedCase={setSelectedCase}
          costItems={costItems}
          isAr={isAr}
          onRefresh={() => selectedCase && loadCost(selectedCase.id)}
        />
      )}
      {tab === "offers" && (
        <OffersTab
          cases={cases}
          selectedCase={selectedCase}
          setSelectedCase={setSelectedCase}
          offers={offers}
          isAr={isAr}
          onRefresh={() => loadOffers(selectedCase?.id)}
        />
      )}
      {tab === "handover" && (
        <HandoverTab
          cases={cases}
          selectedCase={selectedCase}
          setSelectedCase={setSelectedCase}
          handovers={handovers}
          profiles={profiles}
          isAr={isAr}
          onRefresh={() => loadHandovers(selectedCase?.id)}
          onCaseRefresh={loadCases}
        />
      )}
      {tab === "crm" && (
        <CrmLeadsTab
          isAr={isAr}
          cases={cases}
          onLinkCase={loadCases}
          setTab={setTab}
          setSelectedCase={setSelectedCase}
        />
      )}
      {tab === "profile" && (
        <ProfileTab user={user} profile={profile} authUser={authUser} isAr={isAr} onSaved={refresh} />
      )}
    </AppShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Dashboard Tab
// ══════════════════════════════════════════════════════════════════════════════

function DashboardTab({
  cases,
  kpis,
  isAr,
  setTab,
}: {
  cases: PresalesCase[];
  kpis: any;
  isAr: boolean;
  setTab: (t: Tab) => void;
}) {
  const navigate = useNavigate();
  const statusGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    cases.forEach((c) => { groups[c.status] = (groups[c.status] || 0) + 1; });
    return groups;
  }, [cases]);

  const kpiCards = [
    { label: isAr ? "الحالات النشطة" : "Active Cases", v: kpis.active, icon: ClipboardList, tone: "text-primary", bg: "from-primary/10" },
    { label: isAr ? "العروض المعلقة" : "Pending Offers", v: kpis.pending, icon: Clock, tone: "text-amber-600", bg: "from-amber-100" },
    { label: isAr ? "التسليمات المكتملة" : "Completed Handovers", v: kpis.completed, icon: CheckCircle2, tone: "text-emerald-600", bg: "from-emerald-100" },
    { label: isAr ? "إجمالي قيمة العروض" : "Total Offer Value", v: fmtMoney(kpis.totalVal), icon: TrendingUp, tone: "text-violet-600", bg: "from-violet-100" },
  ];

  const STATUS_LABELS_EN: Record<string, string> = { new: "New", under_review: "Under Review", boq_ready: "BOQ Ready", offer_sent: "Offer Sent", approved: "Approved", handover: "Handover", closed: "Closed" };
  const STATUS_LABELS_AR: Record<string, string> = { new: "جديدة", under_review: "قيد المراجعة", boq_ready: "BOQ جاهز", offer_sent: "عرض مُرسل", approved: "مُعتمد", handover: "تسليم", closed: "مغلق" };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpiCards.map((c) => {
          const I = c.icon;
          return (
            <div key={c.label} className={`rounded-2xl border border-border bg-gradient-to-br ${c.bg} to-card p-5 shadow-[var(--shadow-soft)]`}>
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</div>
                <I className={`h-4 w-4 ${c.tone}`} />
              </div>
              <div className={`mt-2 font-mono text-2xl font-bold ${c.tone}`}>{c.v}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Cases by Status */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground mb-4">
            {isAr ? "الحالات حسب الحالة" : "Cases by Status"}
          </h3>
          <div className="space-y-2">
            {Object.entries(STATUS_LABELS_EN).map(([status, labelEn]) => {
              const count = statusGroups[status] || 0;
              const total = cases.length || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-foreground">{isAr ? STATUS_LABELS_AR[status] : labelEn}</span>
                    <span className="font-mono text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Cases */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
              {isAr ? "أحدث الحالات" : "Recent Cases"}
            </h3>
            <button onClick={() => setTab("cases")} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              {isAr ? "عرض الكل" : "View all"} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {cases.slice(0, 5).map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  if (c.lead_id) {
                    navigate({ to: "/presales/leads/$leadId", params: { leadId: c.lead_id } });
                  } else {
                    setTab("cases");
                  }
                }}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-3 hover:border-primary/40 hover:bg-secondary/20 cursor-pointer transition"
              >
                <div>
                  <div className="text-sm font-semibold text-foreground hover:text-primary transition">{isAr && c.title_ar ? c.title_ar : c.title_en}</div>
                  <div className="text-[11px] text-muted-foreground">{c.code || "—"} · {c.client?.name_en || c.lead?.company_en || "—"}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[c.status]}`}>
                  {isAr ? STATUS_LABELS_AR[c.status] : STATUS_LABELS_EN[c.status]}
                </span>
              </div>
            ))}
            {cases.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">{isAr ? "لا توجد حالات بعد" : "No cases yet"}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Cases Tab
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_LABELS_EN: Record<string, string> = { new: "New", under_review: "Under Review", boq_ready: "BOQ Ready", offer_sent: "Offer Sent", approved: "Approved", handover: "Handover", closed: "Closed" };
const STATUS_LABELS_AR: Record<string, string> = { new: "جديدة", under_review: "قيد المراجعة", boq_ready: "BOQ جاهز", offer_sent: "عرض مُرسل", approved: "مُعتمد", handover: "تسليم", closed: "مغلق" };
const PRIORITY_LABELS_EN: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
const PRIORITY_LABELS_AR: Record<string, string> = { low: "منخفضة", medium: "متوسطة", high: "عالية", urgent: "عاجل" };

function CasesTab({
  cases,
  selectedCase,
  setSelectedCase,
  profiles,
  crmLeads,
  isAr,
  onRefresh,
}: {
  cases: PresalesCase[];
  selectedCase: PresalesCase | null;
  setSelectedCase: (c: PresalesCase | null) => void;
  profiles: any[];
  crmLeads: any[];
  isAr: boolean;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState<PresalesCase | null>(null);
  const [form, setForm] = useState({ title_en: "", title_ar: "", status: "new" as CaseStatus, priority: "medium" as CasePriority, technical_notes: "", assigned_to: "", lead_id: "", client_id: "" });
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!c.title_en.toLowerCase().includes(s) && !(c.code || "").toLowerCase().includes(s) && !(c.client?.name_en || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [cases, search, statusFilter]);

  const openNew = () => {
    setEditingCase(null);
    setForm({ title_en: "", title_ar: "", status: "new", priority: "medium", technical_notes: "", assigned_to: "", lead_id: "", client_id: "" });
    setShowForm(true);
  };
  const openEdit = (c: PresalesCase) => {
    setEditingCase(c);
    setForm({ title_en: c.title_en, title_ar: c.title_ar || "", status: c.status, priority: c.priority, technical_notes: c.technical_notes || "", assigned_to: c.assigned_to || "", lead_id: c.lead_id || "", client_id: c.client_id || "" });
    setShowForm(true);
  };

  const saveCase = async () => {
    if (!form.title_en.trim()) return;
    setSaving(true);
    if (editingCase) {
      await supabase.from("presales_cases").update({ ...form, assigned_to: form.assigned_to || null, lead_id: form.lead_id || null, client_id: form.client_id || null }).eq("id", editingCase.id);
    } else {
      const code = `PSC-${String(Date.now()).slice(-4)}`;
      await supabase.from("presales_cases").insert({ ...form, code, assigned_to: form.assigned_to || null, lead_id: form.lead_id || null, client_id: form.client_id || null });
    }
    setSaving(false);
    setShowForm(false);
    onRefresh();
  };

  const deleteCase = async (id: string) => {
    if (!confirm(isAr ? "حذف هذه الحالة؟" : "Delete this case?")) return;
    await supabase.from("presales_cases").delete().eq("id", id);
    if (selectedCase?.id === id) setSelectedCase(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAr ? "بحث..." : "Search..."} className="w-full rounded-lg border border-border bg-background ps-9 pe-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
          <option value="all">{isAr ? "كل الحالات" : "All Statuses"}</option>
          {Object.entries(STATUS_LABELS_EN).map(([k, v]) => <option key={k} value={k}>{isAr ? STATUS_LABELS_AR[k] : v}</option>)}
        </select>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90">
          <Plus className="h-4 w-4" /> {isAr ? "حالة جديدة" : "New Case"}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">{isAr ? "الكود" : "Code"}</th>
                <th className="px-4 py-3 text-start">{isAr ? "العنوان" : "Title"}</th>
                <th className="px-4 py-3 text-start">{isAr ? "العميل / الصفقة" : "Client / Lead"}</th>
                <th className="px-4 py-3 text-start">{isAr ? "الحالة" : "Status"}</th>
                <th className="px-4 py-3 text-start">{isAr ? "الأولوية" : "Priority"}</th>
                <th className="px-4 py-3 text-start">{isAr ? "المُسند إليه" : "Assigned"}</th>
                <th className="px-4 py-3 text-start">{isAr ? "التاريخ" : "Date"}</th>
                <th className="px-4 py-3 text-start"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">{isAr ? "لا توجد حالات" : "No cases found"}</td></tr>
              ) : filtered.map((c) => (
                <tr
                  key={c.id}
                  className={`border-t border-border hover:bg-secondary/20 cursor-pointer transition-colors ${selectedCase?.id === c.id ? "bg-primary/5" : ""}`}
                  onClick={() => {
                    setSelectedCase(c);
                    navigate({ to: "/presales/cases/$caseId", params: { caseId: c.id } });
                  }}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{c.code || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-foreground max-w-[200px] truncate hover:text-primary transition-colors">
                    {isAr && c.title_ar ? c.title_ar : c.title_en}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.client?.name_en || c.lead?.company_en || "—"}
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[c.status]}`}>{isAr ? STATUS_LABELS_AR[c.status] : STATUS_LABELS_EN[c.status]}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRIORITY_COLORS[c.priority]}`}>{isAr ? PRIORITY_LABELS_AR[c.priority] : PRIORITY_LABELS_EN[c.priority]}</span></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{(c as any).assigned_profile?.full_name_en || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(c)} className="rounded p-1 hover:bg-secondary"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => deleteCase(c.id)} className="rounded p-1 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{editingCase ? (isAr ? "تعديل الحالة" : "Edit Case") : (isAr ? "حالة جديدة" : "New Case")}</h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "العنوان (إنجليزي)" : "Title (English)"} *</label>
                <input value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "العنوان (عربي)" : "Title (Arabic)"}</label>
                <input value={form.title_ar} onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" dir="rtl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "الحالة" : "Status"}</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CaseStatus }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    {Object.entries(STATUS_LABELS_EN).map(([k, v]) => <option key={k} value={k}>{isAr ? STATUS_LABELS_AR[k] : v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "الأولوية" : "Priority"}</label>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as CasePriority }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    {Object.entries(PRIORITY_LABELS_EN).map(([k, v]) => <option key={k} value={k}>{isAr ? PRIORITY_LABELS_AR[k] : v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "مُسند إلى" : "Assigned To"}</label>
                <select value={form.assigned_to} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="">—</option>
                  {profiles.map((p: any) => <option key={p.id} value={p.id}>{p.full_name_en}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "الصفقة المرتبطة (CRM)" : "Linked CRM Lead"}</label>
                <select value={form.lead_id} onChange={(e) => setForm((f) => ({ ...f, lead_id: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                  <option value="">—</option>
                  {crmLeads.map((l: any) => <option key={l.id} value={l.id}>{l.code} · {l.company_en}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "ملاحظات تقنية" : "Technical Notes"}</label>
                <textarea value={form.technical_notes} onChange={(e) => setForm((f) => ({ ...f, technical_notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
              <button onClick={saveCase} disabled={saving || !form.title_en.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? (isAr ? "جارٍ الحفظ..." : "Saving...") : (isAr ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BOQ Tab
// ══════════════════════════════════════════════════════════════════════════════

function BoqTab({ cases, selectedCase, setSelectedCase, boqItems, isAr, onRefresh }: {
  cases: PresalesCase[]; selectedCase: PresalesCase | null; setSelectedCase: (c: PresalesCase | null) => void; boqItems: BoqItem[]; isAr: boolean; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description_en: "", description_ar: "", unit: "", quantity: "1", unit_cost: "0", notes: "" });
  const [saving, setSaving] = useState(false);

  const total = useMemo(() => boqItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0), [boqItems]);

  const addItem = async () => {
    if (!selectedCase || !form.description_en.trim()) return;
    setSaving(true);
    const nextNo = (boqItems.length > 0 ? Math.max(...boqItems.map((i) => i.item_no || 0)) : 0) + 1;
    await supabase.from("presales_boq_items").insert({
      case_id: selectedCase.id,
      item_no: nextNo,
      description_en: form.description_en,
      description_ar: form.description_ar || null,
      unit: form.unit || null,
      quantity: parseFloat(form.quantity) || 0,
      unit_cost: parseFloat(form.unit_cost) || 0,
      notes: form.notes || null,
      sort_order: nextNo,
    });
    setSaving(false);
    setForm({ description_en: "", description_ar: "", unit: "", quantity: "1", unit_cost: "0", notes: "" });
    setShowForm(false);
    onRefresh();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("presales_boq_items").delete().eq("id", id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <CasePicker cases={cases} selectedCase={selectedCase} setSelectedCase={setSelectedCase} isAr={isAr} />
      {selectedCase ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{isAr ? "بنود قائمة الكميات" : "Bill of Quantities"} — {isAr && selectedCase.title_ar ? selectedCase.title_ar : selectedCase.title_en}</h3>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> {isAr ? "إضافة بند" : "Add Item"}
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-start">#</th>
                    <th className="px-4 py-3 text-start">{isAr ? "الوصف" : "Description"}</th>
                    <th className="px-4 py-3 text-start">{isAr ? "الوحدة" : "Unit"}</th>
                    <th className="px-4 py-3 text-end">{isAr ? "الكمية" : "Qty"}</th>
                    <th className="px-4 py-3 text-end">{isAr ? "سعر الوحدة" : "Unit Cost"}</th>
                    <th className="px-4 py-3 text-end">{isAr ? "الإجمالي" : "Total"}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {boqItems.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">{isAr ? "لا توجد بنود بعد" : "No items yet"}</td></tr>
                  ) : boqItems.map((item) => (
                    <tr key={item.id} className="border-t border-border hover:bg-secondary/20">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.item_no}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{isAr && item.description_ar ? item.description_ar : item.description_en}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.unit || "—"}</td>
                      <td className="px-4 py-3 text-end font-mono">{item.quantity}</td>
                      <td className="px-4 py-3 text-end font-mono">{item.unit_cost.toLocaleString()}</td>
                      <td className="px-4 py-3 text-end font-mono font-bold text-primary">{(item.quantity * item.unit_cost).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteItem(item.id)} className="rounded p-1 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {boqItems.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-secondary/20">
                      <td colSpan={5} className="px-4 py-3 text-end text-sm font-bold text-foreground">{isAr ? "إجمالي التكلفة" : "Total BOQ Cost"}</td>
                      <td className="px-4 py-3 text-end font-mono text-lg font-bold text-primary">{total.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Add Item Modal */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">{isAr ? "إضافة بند BOQ" : "Add BOQ Item"}</h3>
                  <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  <input value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} placeholder={isAr ? "الوصف (إنجليزي) *" : "Description (English) *"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  <input value={form.description_ar} onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} placeholder={isAr ? "الوصف (عربي)" : "Description (Arabic)"} dir="rtl" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  <div className="grid grid-cols-3 gap-3">
                    <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder={isAr ? "الوحدة" : "Unit"} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                    <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder={isAr ? "الكمية" : "Qty"} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                    <input type="number" value={form.unit_cost} onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))} placeholder={isAr ? "سعر الوحدة" : "Unit Cost"} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder={isAr ? "ملاحظات" : "Notes"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
                  <button onClick={addItem} disabled={saving || !form.description_en.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    <Plus className="h-4 w-4" /> {saving ? "..." : (isAr ? "إضافة" : "Add")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyPicker isAr={isAr} />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Cost Estimation Tab
// ══════════════════════════════════════════════════════════════════════════════

function CostTab({ cases, selectedCase, setSelectedCase, costItems, isAr, onRefresh }: {
  cases: PresalesCase[]; selectedCase: PresalesCase | null; setSelectedCase: (c: PresalesCase | null) => void; costItems: CostItem[]; isAr: boolean; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "materials", description_en: "", description_ar: "", quantity: "1", unit_cost: "0" });
  const [saving, setSaving] = useState(false);

  const CATS = [
    { key: "materials", en: "Materials", ar: "مواد" },
    { key: "labor", en: "Labor", ar: "عمالة" },
    { key: "subcontracting", en: "Subcontracting", ar: "مقاولات" },
    { key: "other", en: "Other", ar: "أخرى" },
  ];

  const byCategory = useMemo(() => {
    const groups: Record<string, CostItem[]> = {};
    costItems.forEach((i) => {
      const cat = i.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(i);
    });
    return groups;
  }, [costItems]);

  const total = useMemo(() => costItems.reduce((s, i) => s + i.quantity * i.unit_cost, 0), [costItems]);

  const addItem = async () => {
    if (!selectedCase || !form.description_en.trim()) return;
    setSaving(true);
    await supabase.from("presales_cost_items").insert({
      case_id: selectedCase.id,
      category: form.category,
      description_en: form.description_en,
      description_ar: form.description_ar || null,
      quantity: parseFloat(form.quantity) || 1,
      unit_cost: parseFloat(form.unit_cost) || 0,
      sort_order: costItems.length + 1,
    });
    setSaving(false);
    setForm({ category: "materials", description_en: "", description_ar: "", quantity: "1", unit_cost: "0" });
    setShowForm(false);
    onRefresh();
  };

  const deleteItem = async (id: string) => {
    await supabase.from("presales_cost_items").delete().eq("id", id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <CasePicker cases={cases} selectedCase={selectedCase} setSelectedCase={setSelectedCase} isAr={isAr} />
      {selectedCase ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{isAr ? "تقدير التكاليف" : "Cost Estimation"}</h3>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> {isAr ? "إضافة بند" : "Add Item"}
            </button>
          </div>

          {CATS.map(({ key, en, ar }) => {
            const items = byCategory[key] || [];
            if (items.length === 0) return null;
            const catTotal = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);
            return (
              <div key={key} className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-secondary/30">
                  <span className="font-semibold text-foreground">{isAr ? ar : en}</span>
                  <span className="font-mono text-sm font-bold text-primary">{catTotal.toLocaleString()}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-border/50 hover:bg-secondary/10">
                        <td className="px-4 py-2 font-medium text-foreground">{isAr && item.description_ar ? item.description_ar : item.description_en}</td>
                        <td className="px-4 py-2 text-end text-muted-foreground font-mono text-xs">{item.quantity} × {item.unit_cost.toLocaleString()}</td>
                        <td className="px-4 py-2 text-end font-mono font-bold text-primary">{(item.quantity * item.unit_cost).toLocaleString()}</td>
                        <td className="px-4 py-2 w-8">
                          <button onClick={() => deleteItem(item.id)} className="rounded p-1 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {costItems.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">{isAr ? "لا توجد بنود تكلفة بعد" : "No cost items yet"}</div>}

          {costItems.length > 0 && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex justify-between items-center">
              <span className="font-display font-bold text-foreground">{isAr ? "إجمالي تقدير التكاليف" : "Total Cost Estimate"}</span>
              <span className="font-mono text-2xl font-bold text-primary">{total.toLocaleString()}</span>
            </div>
          )}

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">{isAr ? "إضافة بند تكلفة" : "Add Cost Item"}</h3>
                  <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    {CATS.map((c) => <option key={c.key} value={c.key}>{isAr ? c.ar : c.en}</option>)}
                  </select>
                  <input value={form.description_en} onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} placeholder={isAr ? "الوصف (إنجليزي) *" : "Description (English) *"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  <input value={form.description_ar} onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} placeholder={isAr ? "الوصف (عربي)" : "Description (Arabic)"} dir="rtl" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} placeholder={isAr ? "الكمية" : "Qty"} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                    <input type="number" value={form.unit_cost} onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))} placeholder={isAr ? "التكلفة" : "Unit Cost"} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
                  <button onClick={addItem} disabled={saving || !form.description_en.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    <Plus className="h-4 w-4" /> {saving ? "..." : (isAr ? "إضافة" : "Add")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : <EmptyPicker isAr={isAr} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Financial Offers Tab
// ══════════════════════════════════════════════════════════════════════════════

function OffersTab({ cases, selectedCase, setSelectedCase, offers, isAr, onRefresh }: {
  cases: PresalesCase[]; selectedCase: PresalesCase | null; setSelectedCase: (c: PresalesCase | null) => void; offers: FinancialOffer[]; isAr: boolean; onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ offer_date: new Date().toISOString().slice(0, 10), valid_until: "", total_cost: "0", margin_pct: "15", selling_price: "0", currency: "USD", notes: "" });
  const [saving, setSaving] = useState(false);

  const OFFER_STATUS_EN: Record<OfferStatus, string> = { draft: "Draft", submitted: "Submitted", approved: "Approved", rejected: "Rejected", revised: "Revised" };
  const OFFER_STATUS_AR: Record<OfferStatus, string> = { draft: "مسودة", submitted: "مُقدَّم", approved: "مُعتمد", rejected: "مرفوض", revised: "مُعدَّل" };

  const calcSelling = (cost: string, margin: string) => {
    const c = parseFloat(cost) || 0;
    const m = parseFloat(margin) || 0;
    return (c * (1 + m / 100)).toFixed(0);
  };

  const saveOffer = async () => {
    if (!selectedCase) return;
    setSaving(true);
    const code = `PFO-${String(Date.now()).slice(-4)}`;
    await supabase.from("presales_financial_offers").insert({
      case_id: selectedCase.id,
      offer_code: code,
      offer_date: form.offer_date,
      valid_until: form.valid_until || null,
      total_cost: parseFloat(form.total_cost) || 0,
      margin_pct: parseFloat(form.margin_pct) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
      currency: form.currency,
      notes: form.notes || null,
    });
    setSaving(false);
    setShowForm(false);
    onRefresh();
  };

  const updateStatus = async (id: string, status: OfferStatus) => {
    await supabase.from("presales_financial_offers").update({ status }).eq("id", id);
    onRefresh();
  };

  const deleteOffer = async (id: string) => {
    if (!confirm(isAr ? "حذف هذا العرض؟" : "Delete this offer?")) return;
    await supabase.from("presales_financial_offers").delete().eq("id", id);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <CasePicker cases={cases} selectedCase={selectedCase} setSelectedCase={setSelectedCase} isAr={isAr} />
      {selectedCase ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{isAr ? "العروض المالية" : "Financial Offers"}</h3>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> {isAr ? "عرض جديد" : "New Offer"}
            </button>
          </div>
          <div className="space-y-3">
            {offers.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">{isAr ? "لا توجد عروض بعد" : "No offers yet"}</div>
            ) : offers.map((offer) => (
              <div key={offer.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{offer.offer_code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${OFFER_STATUS_COLORS[offer.status]}`}>
                        {isAr ? OFFER_STATUS_AR[offer.status] : OFFER_STATUS_EN[offer.status]}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{isAr ? "تاريخ:" : "Date:"} {fmtDate(offer.offer_date)} {offer.valid_until ? `· ${isAr ? "ينتهي:" : "Valid:"} ${fmtDate(offer.valid_until)}` : ""}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-xs text-muted-foreground">{isAr ? "سعر البيع" : "Selling Price"}</div>
                    <div className="font-mono text-xl font-bold text-primary">{fmtMoney(offer.selling_price)}</div>
                    <div className="text-[11px] text-muted-foreground">{isAr ? `التكلفة: $${Number(offer.total_cost).toLocaleString()} | هامش: ${offer.margin_pct}%` : `Cost: $${Number(offer.total_cost).toLocaleString()} | Margin: ${offer.margin_pct}%`}</div>
                  </div>
                </div>
                {offer.notes && <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">{offer.notes}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["draft", "submitted", "approved", "rejected", "revised"] as OfferStatus[]).map((s) => (
                    <button key={s} disabled={offer.status === s} onClick={() => updateStatus(offer.id, s)} className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${offer.status === s ? OFFER_STATUS_COLORS[s] + " opacity-100" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}>
                      {isAr ? OFFER_STATUS_AR[s] : OFFER_STATUS_EN[s]}
                    </button>
                  ))}
                  <button onClick={() => deleteOffer(offer.id)} className="ms-auto rounded-full px-2.5 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50"><Trash2 className="inline h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">{isAr ? "عرض مالي جديد" : "New Financial Offer"}</h3>
                  <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "تاريخ العرض" : "Offer Date"}</label>
                      <input type="date" value={form.offer_date} onChange={(e) => setForm((f) => ({ ...f, offer_date: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "صالح حتى" : "Valid Until"}</label>
                      <input type="date" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "إجمالي التكلفة" : "Total Cost"}</label>
                      <input type="number" value={form.total_cost} onChange={(e) => { const c = e.target.value; setForm((f) => ({ ...f, total_cost: c, selling_price: calcSelling(c, f.margin_pct) })); }} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "هامش الربح %" : "Margin %"}</label>
                      <input type="number" value={form.margin_pct} onChange={(e) => { const m = e.target.value; setForm((f) => ({ ...f, margin_pct: m, selling_price: calcSelling(f.total_cost, m) })); }} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "سعر البيع" : "Selling Price"}</label>
                      <input type="number" value={form.selling_price} onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "العملة" : "Currency"}</label>
                      <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                        {["USD", "EUR", "SAR", "AED", "EGP"].map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "ملاحظات" : "Notes"}</label>
                    <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
                  <button onClick={saveOffer} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    <Save className="h-4 w-4" /> {saving ? "..." : (isAr ? "حفظ" : "Save")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : <EmptyPicker isAr={isAr} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Handover Tab
// ══════════════════════════════════════════════════════════════════════════════

function HandoverTab({ cases, selectedCase, setSelectedCase, handovers, profiles, isAr, onRefresh, onCaseRefresh }: {
  cases: PresalesCase[]; selectedCase: PresalesCase | null; setSelectedCase: (c: PresalesCase | null) => void; handovers: HandoverRecord[]; profiles: any[]; isAr: boolean; onRefresh: () => void; onCaseRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ handover_date: new Date().toISOString().slice(0, 10), handed_by: "", received_by: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const HO_STATUS_EN: Record<string, string> = { pending: "Pending", completed: "Completed", cancelled: "Cancelled" };
  const HO_STATUS_AR: Record<string, string> = { pending: "معلق", completed: "مكتمل", cancelled: "ملغى" };
  const HO_STATUS_COLORS: Record<string, string> = { pending: "bg-amber-100 text-amber-700", completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700" };

  const saveHandover = async () => {
    if (!selectedCase) return;
    setSaving(true);
    await supabase.from("presales_handover_records").insert({
      case_id: selectedCase.id,
      handover_date: form.handover_date,
      handed_by: form.handed_by || null,
      received_by: form.received_by || null,
      notes: form.notes || null,
    });
    // Update case status to handover
    await supabase.from("presales_cases").update({ status: "handover" }).eq("id", selectedCase.id);
    setSaving(false);
    setShowForm(false);
    onRefresh();
    onCaseRefresh();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("presales_handover_records").update({ status }).eq("id", id);
    // If completed, close the case
    if (status === "completed" && selectedCase) {
      await supabase.from("presales_cases").update({ status: "closed" }).eq("id", selectedCase.id);
      onCaseRefresh();
    }
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <CasePicker cases={cases} selectedCase={selectedCase} setSelectedCase={setSelectedCase} isAr={isAr} />
      {selectedCase ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{isAr ? "سجلات التسليم" : "Handover Records"}</h3>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> {isAr ? "تسليم جديد" : "New Handover"}
            </button>
          </div>
          <div className="space-y-3">
            {handovers.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">{isAr ? "لا توجد سجلات تسليم بعد" : "No handover records yet"}</div>
            ) : handovers.map((h) => (
              <div key={h.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{isAr ? "تسليم بتاريخ" : "Handover"} {fmtDate(h.handover_date)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {isAr ? "سلَّمه:" : "Handed by:"} {(h as any).handed_profile?.full_name_en || "—"} →{" "}
                      {isAr ? "استلمه:" : "Received by:"} {(h as any).received_profile?.full_name_en || "—"}
                    </div>
                    {h.notes && <p className="mt-2 text-xs text-muted-foreground">{h.notes}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${HO_STATUS_COLORS[h.status] || "bg-secondary text-muted-foreground"}`}>
                    {isAr ? HO_STATUS_AR[h.status] : HO_STATUS_EN[h.status]}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  {["pending", "completed", "cancelled"].map((s) => (
                    <button key={s} disabled={h.status === s} onClick={() => updateStatus(h.id, s)} className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition ${h.status === s ? (HO_STATUS_COLORS[s] || "") + " opacity-100" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}>
                      {isAr ? HO_STATUS_AR[s] : HO_STATUS_EN[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">{isAr ? "تسجيل تسليم جديد" : "New Handover Record"}</h3>
                  <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "تاريخ التسليم" : "Handover Date"}</label>
                    <input type="date" value={form.handover_date} onChange={(e) => setForm((f) => ({ ...f, handover_date: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "سلَّمه" : "Handed By"}</label>
                    <select value={form.handed_by} onChange={(e) => setForm((f) => ({ ...f, handed_by: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                      <option value="">—</option>
                      {profiles.map((p: any) => <option key={p.id} value={p.id}>{p.full_name_en}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "استلمه" : "Received By"}</label>
                    <select value={form.received_by} onChange={(e) => setForm((f) => ({ ...f, received_by: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
                      <option value="">—</option>
                      {profiles.map((p: any) => <option key={p.id} value={p.id}>{p.full_name_en}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">{isAr ? "ملاحظات" : "Notes"}</label>
                    <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
                  <button onClick={saveHandover} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    <Save className="h-4 w-4" /> {saving ? "..." : (isAr ? "حفظ" : "Save")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : <EmptyPicker isAr={isAr} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CRM Leads Tab
// ══════════════════════════════════════════════════════════════════════════════

function CrmLeadsTab({
  isAr,
  cases,
  onLinkCase,
  setTab,
  setSelectedCase,
}: {
  isAr: boolean;
  cases: PresalesCase[];
  onLinkCase: () => void;
  setTab: (t: Tab) => void;
  setSelectedCase: (c: PresalesCase | null) => void;
}) {
  const { t, lang } = useI18n();
  const { leads, settings, leadDistricts, activities, projects } = useStoreState();
  const STATUSES = settings.statuses;
  const stageLabel = (k: string) =>
    settings.stages.find((s) => s.key === k)?.label ?? t(k as any) ?? k;
  const stageColor = (k: string) => settings.stages.find((s) => s.key === k)?.color ?? "#64748b";

  const projectById = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const leadActivityProjectIds = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const a of activities) {
      if (a.leadId && a.projectId) {
        (map[a.leadId] ??= new Set()).add(a.projectId);
      }
    }
    return map;
  }, [activities]);

  const getLinkedProjectId = useCallback(
    (l: Lead) => {
      if (l.projectId) return l.projectId;
      const match = projects.find((p) => p.name === l.company || p.client === l.company);
      if (match) return match.id;
      const ids = leadActivityProjectIds[l.id];
      return ids ? Array.from(ids)[0] : undefined;
    },
    [projects, leadActivityProjectIds],
  );

  const leadProjectName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const l of leads) {
      const pid = getLinkedProjectId(l);
      if (pid) {
        const p = projectById.get(pid);
        if (p) map[l.id] = p.name;
      }
    }
    return map;
  }, [leads, projectById, getLinkedProjectId]);

  const leadValidation = useMemo(() => {
    const issues: Record<string, { kind: "missing" | "mismatch"; message: string }> = {};
    for (const l of leads) {
      const activityIds = leadActivityProjectIds[l.id];
      const pid = getLinkedProjectId(l);

      if (!pid && (!activityIds || activityIds.size === 0)) {
        issues[l.id] = { kind: "missing", message: "No project linked" };
      } else if (pid && activityIds && activityIds.size > 0 && !activityIds.has(pid)) {
        const names = Array.from(activityIds)
          .map((id) => projectById.get(id)?.name ?? id)
          .join(", ");
        issues[l.id] = {
          kind: "mismatch",
          message: `Lead project differs from activity project (${names})`,
        };
      } else if (!pid && activityIds && activityIds.size > 0) {
        issues[l.id] = { kind: "missing", message: "Lead has no project but activity links exist" };
      }
    }
    return issues;
  }, [leads, leadActivityProjectIds, projectById, getLinkedProjectId]);

  const cityLabel = (name: string) =>
    isAr ? settings.locations.find((c) => c.name === name)?.nameAr || name : name;

  const [tabView, setTabView] = useState<"list" | "map">("list");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minValue, setMinValue] = useState<string>("");
  const [maxValue, setMaxValue] = useState<string>("");
  const [minProb, setMinProb] = useState<string>("");
  const [closeFrom, setCloseFrom] = useState<string>("");
  const [closeTo, setCloseTo] = useState<string>("");
  const [noActivitiesFilter, setNoActivitiesFilter] = useState(false);
  const [closingThisMonthFilter, setClosingThisMonthFilter] = useState(false);
  const [next7DaysFilter, setNext7DaysFilter] = useState(false);
  const [next15DaysFilter, setNext15DaysFilter] = useState(false);
  const [editing, setEditing] = useState<Lead | "new" | null>(null);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [creatingForLeadId, setCreatingForLeadId] = useState<string | null>(null);

  const [LeadsMap, setLeadsMap] = useState<ComponentType<{ leads: Lead[] }> | null>(null);
  useEffect(() => {
    if (tabView === "map" && !LeadsMap) {
      import("@/components/LeadsMap").then((m) => setLeadsMap(() => m.LeadsMap));
    }
  }, [tabView, LeadsMap]);

  const linkedLeadMap = useMemo(() => {
    const map = new Map<string, PresalesCase>();
    cases.forEach((c) => {
      if (c.lead_id) map.set(c.lead_id, c);
    });
    return map;
  }, [cases]);

  const owners = Array.from(new Set(leads.map((l) => l.owner || "Unassigned")));
  const citiesInLeads = Array.from(new Set(leads.map((l) => l.city).filter(Boolean)));
  const projectsInLeads = useMemo(() => {
    const names = new Set<string>();
    for (const l of leads) {
      const name = leadProjectName[l.id];
      if (name) names.add(name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [leads, leadProjectName]);

  const minV = minValue ? Number(minValue) : null;
  const maxV = maxValue ? Number(maxValue) : null;
  const minP = minProb ? Number(minProb) : null;
  const closeFromTs = closeFrom ? new Date(closeFrom).getTime() : null;
  const closeToTs = closeTo ? new Date(closeTo).getTime() : null;

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (cityFilter !== "all" && l.city !== cityFilter) return false;
      if (ownerFilter !== "all" && (l.owner || "Unassigned") !== ownerFilter) return false;
      if (projectFilter !== "all") {
        const name = leadProjectName[l.id] ?? "";
        if (name !== projectFilter) return false;
      }
      if (minV !== null && (l.value || 0) < minV) return false;
      if (maxV !== null && (l.value || 0) > maxV) return false;
      if (minP !== null && (l.probability ?? 0) < minP) return false;
      if (closeFromTs !== null) {
        const d = l.expectedCloseDate ? new Date(l.expectedCloseDate).getTime() : null;
        if (!d || d < closeFromTs) return false;
      }
      if (closeToTs !== null) {
        const d = l.expectedCloseDate ? new Date(l.expectedCloseDate).getTime() : null;
        if (!d || d > closeToTs) return false;
      }
      if (noActivitiesFilter) {
        const acts = activities.filter((a) => a.leadId === l.id);
        if (acts.length > 0) return false;
      }
      if (closingThisMonthFilter) {
        if (!l.expectedCloseDate) return false;
        const d = new Date(l.expectedCloseDate);
        const now = new Date();
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
      }
      if (next7DaysFilter) {
        if (!l.expectedCloseDate) return false;
        const d = new Date(l.expectedCloseDate).getTime();
        const now = Date.now();
        const in7 = now + 7 * 24 * 60 * 60 * 1000;
        if (d < now || d > in7) return false;
      }
      if (next15DaysFilter) {
        if (!l.expectedCloseDate) return false;
        const d = new Date(l.expectedCloseDate).getTime();
        const now = Date.now();
        const in15 = now + 15 * 24 * 60 * 60 * 1000;
        if (d < now || d > in15) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const match =
          l.company.toLowerCase().includes(q) ||
          l.contact.toLowerCase().includes(q) ||
          (l.code && l.code.toLowerCase().includes(q)) ||
          l.owner.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          (leadDistricts[l.id] && leadDistricts[l.id].toLowerCase().includes(q)) ||
          (leadProjectName[l.id] && leadProjectName[l.id].toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [
    leads,
    statusFilter,
    cityFilter,
    ownerFilter,
    projectFilter,
    minV,
    maxV,
    minP,
    closeFromTs,
    closeToTs,
    noActivitiesFilter,
    closingThisMonthFilter,
    next7DaysFilter,
    next15DaysFilter,
    query,
    leadDistricts,
    leadProjectName,
    activities,
  ]);

  // Status breakdown cards (all leads)
  const byStatus = useMemo(() => {
    return STATUSES.map((s) => {
      const items = leads.filter((l) => l.status === s);
      return {
        status: s,
        count: items.length,
        value: items.reduce((acc, l) => acc + (l.value || 0), 0),
      };
    });
  }, [leads, STATUSES]);

  const totalValue = filtered.reduce((s, l) => s + (l.value || 0), 0);
  const weightedValue = filtered.reduce(
    (s, l) => s + (l.value || 0) * ((l.probability ?? 0) / 100),
    0,
  );
  const wonValue = filtered
    .filter((l) => l.status === "won")
    .reduce((s, l) => s + (l.value || 0), 0);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    if (!sortKey) return arr;
    const dir = sortDir === "asc" ? 1 : -1;
    const get = (l: Lead): string | number => {
      switch (sortKey) {
        case "id":
          return shortId(l.id);
        case "company":
          return l.company;
        case "project":
          return leadProjectName[l.id] ?? "";
        case "contact":
          return l.contact;
        case "city":
          return l.city;
        case "district":
          return leadDistricts[l.id] ?? "";
        case "expectedCloseDate":
          return l.expectedCloseDate ?? "";
        case "status":
          return l.status;
        case "owner":
          return l.owner;
        case "value":
          return l.value || 0;
        default:
          return "";
      }
    };
    arr.sort((a, b) => {
      const va = get(a),
        vb = get(b);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).toLowerCase().localeCompare(String(vb).toLowerCase()) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir, leadDistricts, leadProjectName]);

  const totalPages = Math.ceil(sorted.length / pageSize) || 1;
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (cityFilter !== "all" ? 1 : 0) +
    (ownerFilter !== "all" ? 1 : 0) +
    (projectFilter !== "all" ? 1 : 0) +
    (minValue ? 1 : 0) +
    (maxValue ? 1 : 0) +
    (minProb ? 1 : 0) +
    (closeFrom ? 1 : 0) +
    (closeTo ? 1 : 0) +
    (noActivitiesFilter ? 1 : 0) +
    (closingThisMonthFilter ? 1 : 0) +
    (next7DaysFilter ? 1 : 0) +
    (next15DaysFilter ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter("all");
    setCityFilter("all");
    setOwnerFilter("all");
    setProjectFilter("all");
    setMinValue("");
    setMaxValue("");
    setMinProb("");
    setCloseFrom("");
    setCloseTo("");
    setNoActivitiesFilter(false);
    setClosingThisMonthFilter(false);
    setNext7DaysFilter(false);
    setNext15DaysFilter(false);
    setQuery("");
  };

  const handleExport = () => {
    const rows = filtered.map((l) => ({
      ID: shortId(l.id),
      LeadName: l.company,
      Account: leadProjectName[l.id] ?? "",
      Contact: l.contact,
      Email: l.email ?? "",
      Phone: l.phone ?? "",
      City: l.city,
      Status: l.status,
      Owner: l.owner,
      Value: l.value || 0,
      CloseDate: l.expectedCloseDate ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(isAr ? "تم تصدير الصفقات بنجاح" : "Leads exported successfully");
  };

  const handleCreateCaseFromLead = async (lead: Lead) => {
    setCreatingForLeadId(lead.id);
    try {
      const code = `PSC-${String(Date.now()).slice(-4)}`;
      const { data, error } = await supabase
        .from("presales_cases")
        .insert({
          code,
          title_en: lead.company ? `Technical Review - ${lead.company}` : `Presales Case ${code}`,
          title_ar: lead.company ? `دراسة فنية - ${lead.company}` : `دراسة فنية ${code}`,
          status: "new",
          priority: "medium",
          lead_id: lead.id,
          technical_notes: `Initiated from CRM Lead ${lead.code || ""}. Stage: ${lead.status}`,
        })
        .select()
        .single();

      if (!error && data) {
        toast.success(isAr ? `تم إنشاء دراسة فنية (${code})` : `Presales case ${code} created`);
        await onLinkCase();
        setSelectedCase(data as any);
        setTab("cases");
      } else if (error) {
        toast.error(error.message || "Failed to create case");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create case");
    } finally {
      setCreatingForLeadId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("leads")}
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">
            {filtered.length}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("value")}
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-foreground">
            {fmtMoney(totalValue)}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Weighted
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-primary">
            {fmtMoney(Math.round(weightedValue))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("won")}
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-600">
            {fmtMoney(wonValue)}
          </div>
        </div>
      </div>

      {/* By status breakdown cards */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("status")}
        </div>
        <div className="flex w-full items-stretch gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {byStatus.map((s) => (
            <button
              key={s.status}
              onClick={() => setStatusFilter(statusFilter === s.status ? "all" : s.status)}
              className={`flex-1 min-w-[100px] rounded-lg border p-2.5 text-start transition ${
                statusFilter === s.status
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: stageColor(s.status) }}
                />
                <span className="text-xs font-semibold text-foreground">
                  {stageLabel(s.status)}
                </span>
              </div>
              <div className="mt-1 text-lg font-bold text-foreground">{s.count}</div>
              <div className="text-[11px] font-mono text-muted-foreground">
                {fmtMoney(s.value)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Account mismatch alert if any */}
      {(() => {
        const mismatch = Object.keys(leadValidation).filter(
          (id) => leadValidation[id].kind === "mismatch",
        ).length;
        if (mismatch === 0) return null;
        return (
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 shadow-[var(--shadow-soft)]">
            <span aria-hidden className="text-base leading-none">
              ⚠
            </span>
            <div className="flex-1">
              <div className="font-semibold">Account mismatch detected</div>
              <div className="text-xs">
                {mismatch} lead{mismatch === 1 ? "" : "s"} where the assigned account doesn't match
                the linked activity's account.
              </div>
            </div>
          </div>
        );
      })()}

      {/* Controls and quick filter checkboxes */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-6">
          <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
            <button
              onClick={() => setTabView("list")}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
                tabView === "list"
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" /> {t("listView")}
            </button>
            <button
              onClick={() => setTabView("map")}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${
                tabView === "map"
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapIcon className="h-4 w-4" /> {t("map")}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={noActivitiesFilter}
              onChange={(e) => setNoActivitiesFilter(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
            />
            {isAr ? "بدون نشاطات" : "No Activities"}
          </label>
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
        </div>
        <div className="text-sm font-semibold text-muted-foreground">
          {filtered.length} {t("leads")}
        </div>
      </div>

      {tabView === "map" ? (
        LeadsMap ? (
          <LeadsMap leads={filtered} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("loadingMap")}
          </div>
        )
      ) : (
        <>
          {/* Filter dropdowns & Actions */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
                aria-label={t("status")}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">
                  {t("status")}: {t("all")}
                </option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </select>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                aria-label={t("city")}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">
                  {t("city")}: {t("all")}
                </option>
                {citiesInLeads.map((c) => (
                  <option key={c} value={c}>
                    {cityLabel(c)}
                  </option>
                ))}
              </select>
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                aria-label={t("owner")}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">
                  {t("owner")}: {t("all")}
                </option>
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label={t("project") ?? "Account"}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs font-medium focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">
                  {t("project") ?? "Account"}: {t("all")}
                </option>
                {projectsInLeads.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition ${
                  showAdvanced || activeFilterCount > 0
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card hover:bg-accent"
                }`}
              >
                <Filter className="h-3.5 w-3.5" /> {t("filters")}
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleExport}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-medium hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5" /> {t("export")}
              </button>
              <button
                onClick={() => setEditing("new")}
                className="shrink-0 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> {t("addLead")}
              </button>
            </div>
            <div className="relative w-full max-w-sm">
              <Search
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                style={{ insetInlineStart: "0.75rem" }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAr ? "بحث بالاسم، المسؤول، المدينة، الحساب..." : "Search leads by name, owner, city, account..."}
                className="h-9 w-full rounded-lg border border-border bg-card text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                style={{ paddingInlineStart: "2.25rem", paddingInlineEnd: "0.75rem" }}
              />
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvanced && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {isAr ? "فلاتر متقدمة" : "Advanced Filters"}
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <X className="h-3.5 w-3.5" /> {isAr ? "إعادة تعيين" : "Clear all"}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Min value
                  <input
                    type="number"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    placeholder="0"
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Max value
                  <input
                    type="number"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    placeholder="∞"
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Min probability %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={minProb}
                    onChange={(e) => setMinProb(e.target.value)}
                    placeholder="0"
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Close from
                  <input
                    type="date"
                    value={closeFrom}
                    onChange={(e) => setCloseFrom(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Close to
                  <input
                    type="date"
                    value={closeTo}
                    onChange={(e) => setCloseTo(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Full CRM Leads Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <div className="min-w-[1280px] text-sm">
                <div
                  className="grid items-center gap-2 bg-secondary/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  style={{
                    gridTemplateColumns: "80px 1.4fr 1fr 1fr 1fr 0.8fr 0.9fr 1fr 110px 150px",
                  }}
                >
                  {(
                    [
                      ["id", "ID", ""],
                      ["company", isAr ? "اسم العميل" : "Lead Name", ""],
                      ["project", t("project") ?? "Account", ""],
                      ["contact", t("contact"), ""],
                      ["city", t("city"), ""],
                      ["expectedCloseDate", isAr ? "تاريخ الإغلاق" : "Close Date", ""],
                      ["status", `${t("status")} / %`, ""],
                      ["owner", t("owner"), ""],
                      ["value", t("value"), "justify-end"],
                    ] as const
                  ).map(([k, label, align]) => (
                    <button
                      key={k}
                      onClick={() => toggleSort(k)}
                      className={`inline-flex items-center gap-1 text-start uppercase ${align} hover:text-foreground`}
                    >
                      <span>{label}</span>
                      {sortKey === k ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ))}
                  <div className="text-end">{isAr ? "الدراسة الفنية / الإجراء" : "Presales / Action"}</div>
                </div>

                <div className="divide-y divide-border">
                  {paginated.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {isAr ? "لا توجد صفقات مطابقة للبحث أو الفلتر" : "No leads matching the criteria"}
                    </div>
                  ) : (
                    paginated.map((l) => {
                      const linkedCase = linkedLeadMap.get(l.id);
                      const isCreating = creatingForLeadId === l.id;

                      return (
                        <div
                          key={l.id}
                          className={`grid items-center gap-2 px-4 py-3 transition-colors ${
                            (l.value || 0) === 0
                              ? "bg-rose-50/30 hover:bg-rose-50/60 dark:bg-rose-950/10 dark:hover:bg-rose-950/20"
                              : "hover:bg-primary/5"
                          }`}
                          style={{
                            gridTemplateColumns: "80px 1.4fr 1fr 1fr 1fr 0.8fr 0.9fr 1fr 110px 150px",
                          }}
                        >
                          <div className="font-mono text-xs">
                            <Link
                              to="/presales/leads/$leadId"
                              params={{ leadId: l.id }}
                              className="text-muted-foreground hover:text-primary hover:underline transition-colors"
                              title={isAr ? "عرض تفاصيل الفرصة" : "View lead details"}
                            >
                              {shortId(l.id)}
                            </Link>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                to="/presales/leads/$leadId"
                                params={{ leadId: l.id }}
                                className="font-semibold text-foreground truncate hover:text-primary hover:underline transition-colors"
                                title={isAr ? "عرض تفاصيل الفرصة" : "View lead details"}
                              >
                                {l.code || l.company}
                              </Link>
                              {l.code && (
                                <span className="font-mono text-[9px] text-muted-foreground bg-secondary px-1 py-0.2 rounded">
                                  {l.code}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{l.industry}</div>
                          </div>

                          <div className="min-w-0">
                            {(() => {
                              const pId = getLinkedProjectId(l);
                              const accountName = pId ? projectById.get(pId)?.name : null;
                              return (
                                <div className="text-xs font-medium text-foreground truncate" title={accountName || ""}>
                                  {accountName || <span className="text-muted-foreground">—</span>}
                                </div>
                              );
                            })()}
                          </div>

                          <div>
                            <div className="text-foreground text-xs font-medium">{l.contact}</div>
                            {(() => {
                              const relatedProject = projects.find(
                                (p) => p.id === (l as any).projectId || p.id === (l as any).project_id,
                              );
                              const displayPhone = l.phone || relatedProject?.clientPhone;
                              return displayPhone ? (
                                <div className="text-[11px] text-muted-foreground font-mono">
                                  {displayPhone}
                                </div>
                              ) : null;
                            })()}
                          </div>

                          <div className="text-muted-foreground text-xs">{cityLabel(l.city)}</div>

                          <div className="text-muted-foreground font-mono text-xs">
                            {formatDate(l.expectedCloseDate)}
                          </div>

                          <div>
                            <StatusBadge status={l.status} label={stageLabel(l.status)} />
                            {(() => {
                              const isWon = l.status === "won";
                              const isLost = l.status === "lost";
                              const pct = getProbabilityForStatus(l.status) ?? 0;
                              const barColor = isWon
                                ? "bg-emerald-500"
                                : isLost
                                  ? "bg-rose-500"
                                  : pct >= 70
                                    ? "bg-emerald-500"
                                    : pct >= 40
                                      ? "bg-amber-500"
                                      : "bg-sky-500";
                              const textColor = isWon
                                ? "text-emerald-600"
                                : isLost
                                  ? "text-rose-600"
                                  : "text-muted-foreground";
                              return (
                                <div className="mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-secondary">
                                      <div
                                        className={`h-full transition-all duration-500 ease-out ${barColor}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className={`text-[10px] font-semibold ${textColor}`}>
                                      {pct}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-2">
                            {(l as any).ownerPhoto ? (
                              <img
                                src={(l as any).ownerPhoto}
                                alt={`${l.owner} avatar`}
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                role="img"
                                aria-label={`${l.owner} avatar`}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
                              >
                                {l.owner
                                  .split(" ")
                                  .map((w: string) => w[0])
                                  .join("")}
                              </div>
                            )}
                            <span className="text-foreground text-xs truncate">{l.owner}</span>
                          </div>

                          <div className="text-end font-mono font-semibold text-xs">
                            {(l.value || 0) === 0 ? (
                              <div className="flex flex-col items-end">
                                <span className="text-rose-600">{fmtMoney(0)}</span>
                                <span className="mt-0.5 inline-flex items-center gap-0.5 text-[8px] uppercase tracking-wider text-rose-500 font-sans">
                                  ⚠ {t("noValue" as any) || "No Value"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-foreground">{fmtMoney(l.value)}</span>
                            )}
                          </div>

                          {/* Action Column: Presales Case & Edit */}
                          <div className="flex items-center justify-end gap-1.5">
                            {linkedCase ? (
                              <button
                                onClick={() => {
                                  setSelectedCase(linkedCase);
                                  setTab("cases");
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 transition"
                                title={isAr ? `الانتقال إلى الحالة ${linkedCase.code || ""}` : `Go to case ${linkedCase.code || ""}`}
                              >
                                <ClipboardList className="h-3 w-3" />
                                <span>{linkedCase.code || "Case"}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCreateCaseFromLead(l)}
                                disabled={isCreating}
                                className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50"
                                title={isAr ? "إنشاء دراسة فنية / حالة لهذه الصفقة" : "Create Technical Study / Case"}
                              >
                                <Plus className="h-3 w-3" />
                                <span>{isCreating ? "..." : isAr ? "دراسة فنية" : "+ Study"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
                <div>
                  {isAr
                    ? `عرض ${(page - 1) * pageSize + 1} إلى ${Math.min(page * pageSize, sorted.length)} من ${sorted.length}`
                    : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, sorted.length)} of ${sorted.length}`}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-accent"
                  >
                    {isAr ? "السابق" : "Previous"}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-7 w-7 rounded-md text-xs font-semibold ${
                        page === p ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-md border border-border px-2.5 py-1 disabled:opacity-40 hover:bg-accent"
                  >
                    {isAr ? "التالي" : "Next"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {editing && (
        <LeadFormModal
          initial={editing === "new" ? null : editing}
          locations={settings.locations}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Profile Tab
// ══════════════════════════════════════════════════════════════════════════════

function ProfileTab({ user, profile, authUser, isAr, onSaved }: {
  user: any; profile: any; authUser: any; isAr: boolean; onSaved: () => void;
}) {
  const [showPwd, setShowPwd] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name_en: profile?.full_name_en || "", full_name_ar: profile?.full_name_ar || "", avatar_url: profile?.avatar_url || "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ full_name_en: profile?.full_name_en || "", full_name_ar: profile?.full_name_ar || "", avatar_url: profile?.avatar_url || "" });
  }, [profile?.full_name_en, profile?.full_name_ar, profile?.avatar_url]);

  const save = async () => {
    if (!authUser) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name_en: form.full_name_en, full_name_ar: form.full_name_ar || null, avatar_url: form.avatar_url || null }).eq("user_id", authUser.id);
    setSaving(false);
    await onSaved();
    setEditing(false);
  };

  return (
    <div className="max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-4">
          {user.photo ? (
            <img src={user.photo} alt={user.name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/30" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-600 text-lg font-bold text-primary-foreground ring-2 ring-primary/30">
              {user.initials}
            </div>
          )}
          <div className="flex-1">
            <h2 className="font-display text-2xl font-bold text-foreground">{user.name}</h2>
            <p className="text-sm text-muted-foreground">{user.role}</p>
            <p className="text-xs text-muted-foreground mt-1">{profile?.email || authUser?.email}</p>
          </div>
        </div>
        {editing ? (
          <div className="mt-6 space-y-3">
            <input value={form.full_name_en} onChange={(e) => setForm((f) => ({ ...f, full_name_en: e.target.value }))} placeholder={isAr ? "الاسم (إنجليزي)" : "Full Name (English)"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            <input value={form.full_name_ar} onChange={(e) => setForm((f) => ({ ...f, full_name_ar: e.target.value }))} placeholder={isAr ? "الاسم (عربي)" : "Full Name (Arabic)"} dir="rtl" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            <input value={form.avatar_url} onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))} placeholder={isAr ? "رابط الصورة" : "Avatar URL"} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">{isAr ? "إلغاء" : "Cancel"}</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? "..." : (isAr ? "حفظ" : "Save")}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
            <Pencil className="inline h-3.5 w-3.5 me-1" /> {isAr ? "تعديل الملف" : "Edit Profile"}
          </button>
        )}
        <div className="mt-4 border-t border-border pt-4">
          <button onClick={() => setShowPwd(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
            <KeyRound className="h-4 w-4" /> {isAr ? "تغيير كلمة المرور" : "Change Password"}
          </button>
        </div>
      </div>
      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Shared UI Components
// ══════════════════════════════════════════════════════════════════════════════

function CasePicker({ cases, selectedCase, setSelectedCase, isAr }: {
  cases: PresalesCase[]; selectedCase: PresalesCase | null; setSelectedCase: (c: PresalesCase | null) => void; isAr: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-semibold text-muted-foreground whitespace-nowrap">{isAr ? "اختر الحالة:" : "Select Case:"}</label>
      <select
        value={selectedCase?.id || ""}
        onChange={(e) => {
          const c = cases.find((c) => c.id === e.target.value) || null;
          setSelectedCase(c);
        }}
        className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      >
        <option value="">{isAr ? "— اختر حالة —" : "— Select a case —"}</option>
        {cases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} · {isAr && c.title_ar ? c.title_ar : c.title_en}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyPicker({ isAr }: { isAr: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
      <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{isAr ? "اختر حالة من القائمة أعلاه للبدء" : "Select a case from the picker above to get started"}</p>
    </div>
  );
}
