import { createFileRoute, useSearch, useNavigate, Link } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { ChatWithContacts } from "@/components/ChatWithContacts";
import { chatContactsFor } from "@/lib/chatContacts";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { employees, fmtMoney } from "@/lib/mock-data";
import { useEffect, useMemo, useState } from "react";
import { Wallet, FileBadge, MessageSquare, FileSpreadsheet, UserCircle2, Download, TrendingUp, CheckCircle2, Clock, AlertTriangle, Mail, Phone, Building2, KeyRound } from "lucide-react";
import * as XLSX from "xlsx";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";


type Tab = "dashboard" | "quotations" | "chat" | "reports" | "profile";

export const Route = createFileRoute("/finance/")({
  component: FinancePage,
  validateSearch: (s: Record<string, unknown>) => ({ tab: (s.tab as Tab) ?? "dashboard" }),
  head: () => ({ meta: [{ title: "Finance Panel · INT-CRM" }] }),
});

const TABS: { key: Tab; label: string; labelAr: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard", labelAr: "لوحة التحكم", icon: Wallet },
  { key: "quotations", label: "Quotations", labelAr: "العروض", icon: FileBadge },
  { key: "chat", label: "Chat", labelAr: "المحادثة", icon: MessageSquare },
  { key: "reports", label: "Reports", labelAr: "التقارير", icon: FileSpreadsheet },
  { key: "profile", label: "Profile", labelAr: "الملف", icon: UserCircle2 },
];

function FinancePage() {
  const { dir } = useI18n();
  const search = useSearch({ from: "/finance/" }) as { tab: Tab };
  const navigate = useNavigate();
  const tab: Tab = search.tab ?? "dashboard";
  const setTab = (t: Tab) => navigate({ to: "/finance", search: { tab: t } });
  const { quotations } = useStoreState();
  const me = employees[0]; // demo finance user uses admin photo
  const { profile, user: authUser, refresh } = useAuth();
  const [profileExtra, setProfileExtra] = useState<{ phone: string | null; department_en: string | null; department_ar: string | null } | null>(null);

  const reloadExtra = () => {
    if (!authUser) return;
    supabase.from("profiles").select("phone,department_en,department_ar").eq("user_id", authUser.id).maybeSingle()
      .then(({ data }) => setProfileExtra((data as any) ?? null));
  };
  useEffect(() => { reloadExtra(); }, [authUser?.id]);

  const displayName = (dir === "rtl" ? profile?.full_name_ar : profile?.full_name_en) || profile?.full_name_en || authUser?.email || "—";
  const displayRole = (dir === "rtl" ? profile?.title_ar : profile?.title_en) || (dir === "rtl" ? "مالية" : "Finance Officer");
  const initials = (displayName || "").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "FN";
  const user = { name: displayName, role: displayRole, initials, photo: profile?.avatar_url || undefined };
  const profileFields = {
    email: profile?.email || authUser?.email || "—",
    phone: profileExtra?.phone || "—",
    department: (dir === "rtl" ? profileExtra?.department_ar : profileExtra?.department_en) || (dir === "rtl" ? "قسم المالية" : "Finance Department"),
  };



  return (
    <AppShell panel="finance" user={user} pageTitle={dir === "rtl" ? "لوحة المالية" : "Finance Panel"}>
      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border">
        {TABS.map((tb) => {
          const Icon = tb.icon;
          const active = tab === tb.key;
          return (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {dir === "rtl" ? tb.labelAr : tb.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && <Dashboard quotations={quotations} />}
      {tab === "quotations" && <QuotationsView quotations={quotations} />}
      {tab === "chat" && <FinanceChatTab />}
      {tab === "reports" && <ReportsView quotations={quotations} />}
      {tab === "profile" && (
        <ProfileView
          user={user}
          fields={profileFields}
          initial={{
            full_name_en: profile?.full_name_en ?? "",
            full_name_ar: profile?.full_name_ar ?? "",
            avatar_url: profile?.avatar_url ?? "",
            phone: profileExtra?.phone ?? "",
          }}
          userId={authUser?.id}
          onSaved={async () => { await refresh(); reloadExtra(); }}
        />
      )}
    </AppShell>
  );
}

function Dashboard({ quotations }: { quotations: any[] }) {
  const { dir } = useI18n();
  const totals = useMemo(() => {
    const total = quotations.reduce((s, q) => s + q.value, 0);
    const accepted = quotations.filter((q) => q.status === "accepted").reduce((s, q) => s + q.value, 0);
    const pending = quotations.filter((q) => ["pending_approval", "sent", "negotiating"].includes(q.status)).reduce((s, q) => s + q.value, 0);
    const rejected = quotations.filter((q) => q.status === "rejected").reduce((s, q) => s + q.value, 0);
    return { total, accepted, pending, rejected };
  }, [quotations]);
  const cards = [
    { label: dir === "rtl" ? "إجمالي العروض" : "Total Pipeline", v: fmtMoney(totals.total), icon: TrendingUp, tone: "text-primary", bg: "from-primary/10" },
    { label: dir === "rtl" ? "مقبول" : "Accepted", v: fmtMoney(totals.accepted), icon: CheckCircle2, tone: "text-emerald-600", bg: "from-emerald-100" },
    { label: dir === "rtl" ? "قيد المراجعة" : "Pending", v: fmtMoney(totals.pending), icon: Clock, tone: "text-amber-600", bg: "from-amber-100" },
    { label: dir === "rtl" ? "مرفوض" : "Rejected", v: fmtMoney(totals.rejected), icon: AlertTriangle, tone: "text-rose-600", bg: "from-rose-100" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((c) => {
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
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{dir === "rtl" ? "آخر العروض" : "Recent Quotations"}</h3>
        <div className="mt-3 space-y-2">
          {quotations.slice(0, 5).map((q) => (
            <Link
              key={q.id}
              to="/finance/quotations/$quotationId"
              params={{ quotationId: q.id }}
              className="flex items-center justify-between rounded-lg border border-border bg-background p-3 transition hover:border-primary/40 hover:bg-secondary/40"
            >
              <div>
                <div className="text-sm font-semibold text-foreground">{q.client}</div>
                <div className="text-[11px] text-muted-foreground">{shortId(q.id)} · {q.owner}</div>
              </div>
              <div className="text-end">
                <div className="font-mono text-sm font-bold text-primary">{fmtMoney(q.value)}</div>
                <div className="text-[10px] uppercase text-muted-foreground">{q.status.replace("_", " ")}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuotationsView({ quotations }: { quotations: any[] }) {
  const { dir } = useI18n();
  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="border-b border-border p-4">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{dir === "rtl" ? "جميع العروض" : "All Quotations"}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start">ID</th>
              <th className="px-4 py-3 text-start">{dir === "rtl" ? "العميل" : "Client"}</th>
              <th className="px-4 py-3 text-start">{dir === "rtl" ? "المسؤول" : "Owner"}</th>
              <th className="px-4 py-3 text-end">{dir === "rtl" ? "القيمة" : "Value"}</th>
              <th className="px-4 py-3 text-start">{dir === "rtl" ? "الحالة" : "Status"}</th>
              <th className="px-4 py-3 text-start">{dir === "rtl" ? "التاريخ" : "Date"}</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id} className="cursor-pointer border-t border-border hover:bg-secondary/30">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground"><Link to="/finance/quotations/$quotationId" params={{ quotationId: q.id }} className="text-primary hover:underline">{shortId(q.id)}</Link></td>
                <td className="px-4 py-3 font-semibold text-foreground"><Link to="/finance/quotations/$quotationId" params={{ quotationId: q.id }} className="hover:underline">{q.client}</Link></td>
                <td className="px-4 py-3">{q.owner}</td>
                <td className="px-4 py-3 text-end font-mono font-bold text-primary">{fmtMoney(q.value)}</td>
                <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                <td className="px-4 py-3 text-muted-foreground">{q.submissionDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.replace("_", " ");
  const cls: Record<string, string> = {
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    "pending_approval": "bg-amber-100 text-amber-700",
    negotiating: "bg-blue-100 text-blue-700",
    sent: "bg-sky-100 text-sky-700",
    draft: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls[status] ?? "bg-secondary text-muted-foreground"}`}>
      {s}
    </span>
  );
}

function ReportsView({ quotations }: { quotations: any[] }) {
  const { dir } = useI18n();
  const isAr = dir === "rtl";

  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const [client, setClient] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const owners = useMemo(() => Array.from(new Set(quotations.map((q) => q.owner))).sort(), [quotations]);
  const clients = useMemo(() => Array.from(new Set(quotations.map((q) => q.client))).sort(), [quotations]);
  const statuses = useMemo(() => Array.from(new Set(quotations.map((q) => q.status))).sort(), [quotations]);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      if (status !== "all" && q.status !== status) return false;
      if (owner !== "all" && q.owner !== owner) return false;
      if (client !== "all" && q.client !== client) return false;
      if (from && q.submissionDate < from) return false;
      if (to && q.submissionDate > to) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !q.id.toLowerCase().includes(s) &&
          !q.client.toLowerCase().includes(s) &&
          !q.owner.toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [quotations, status, owner, client, from, to, search]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, q) => s + q.value, 0);
    const accepted = filtered.filter((q) => q.status === "accepted").reduce((s, q) => s + q.value, 0);
    const pending = filtered.filter((q) => ["pending_approval", "sent", "negotiating"].includes(q.status)).reduce((s, q) => s + q.value, 0);
    const rejected = filtered.filter((q) => q.status === "rejected").reduce((s, q) => s + q.value, 0);
    const winRate = filtered.length ? (filtered.filter((q) => q.status === "accepted").length / filtered.length) * 100 : 0;
    return { total, accepted, pending, rejected, winRate, count: filtered.length };
  }, [filtered]);

  const clearFilters = () => { setFrom(""); setTo(""); setStatus("all"); setOwner("all"); setClient("all"); setSearch(""); };
  const activeFilterCount =
    (from ? 1 : 0) + (to ? 1 : 0) + (status !== "all" ? 1 : 0) + (owner !== "all" ? 1 : 0) + (client !== "all" ? 1 : 0) + (search ? 1 : 0);

  const exportExcel = (kind: "quotations" | "summary" | "by_owner" | "by_client" | "by_month") => {
    const wb = XLSX.utils.book_new();
    const stamp = new Date().toISOString().slice(0, 10);
    if (kind === "quotations") {
      const rows = filtered.map((q) => ({
        ID: q.id, Client: q.client, Owner: q.owner, Value: q.value,
        Status: q.status, Revisions: q.revisions, SubmissionDate: q.submissionDate,
        Feedback: q.feedback ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws, "Quotations");
    } else if (kind === "summary") {
      const byStatus = filtered.reduce((acc: Record<string, { count: number; value: number }>, q) => {
        acc[q.status] = acc[q.status] ?? { count: 0, value: 0 };
        acc[q.status].count += 1;
        acc[q.status].value += q.value;
        return acc;
      }, {});
      const rows = Object.entries(byStatus).map(([s, v]) => ({ Status: s, Count: v.count, TotalValue: v.value }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 22 }, { wch: 10 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws, "Summary");
    } else if (kind === "by_owner") {
      const map = filtered.reduce((acc: Record<string, { count: number; value: number; accepted: number }>, q) => {
        acc[q.owner] = acc[q.owner] ?? { count: 0, value: 0, accepted: 0 };
        acc[q.owner].count += 1;
        acc[q.owner].value += q.value;
        if (q.status === "accepted") acc[q.owner].accepted += 1;
        return acc;
      }, {});
      const rows = Object.entries(map).map(([o, v]) => ({
        Owner: o, Quotations: v.count, TotalValue: v.value, Accepted: v.accepted,
        WinRate: v.count ? `${((v.accepted / v.count) * 100).toFixed(1)}%` : "0%",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, "By Owner");
    } else if (kind === "by_client") {
      const map = filtered.reduce((acc: Record<string, { count: number; value: number }>, q) => {
        acc[q.client] = acc[q.client] ?? { count: 0, value: 0 };
        acc[q.client].count += 1;
        acc[q.client].value += q.value;
        return acc;
      }, {});
      const rows = Object.entries(map).sort((a, b) => b[1].value - a[1].value)
        .map(([c, v]) => ({ Client: c, Quotations: v.count, TotalValue: v.value }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws, "By Client");
    } else if (kind === "by_month") {
      const map = filtered.reduce((acc: Record<string, { count: number; value: number }>, q) => {
        const m = (q.submissionDate || "").slice(0, 7) || "unknown";
        acc[m] = acc[m] ?? { count: 0, value: 0 };
        acc[m].count += 1;
        acc[m].value += q.value;
        return acc;
      }, {});
      const rows = Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
        .map(([m, v]) => ({ Month: m, Quotations: v.count, TotalValue: v.value }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws, "By Month");
    }
    XLSX.writeFile(wb, `INT-CRM-${kind}-${stamp}.xlsx`);
  };

  const reports = [
    { key: "quotations" as const, title: isAr ? "تقرير العروض الكامل" : "Full Quotations Report", desc: isAr ? "كافة العروض المفلترة مع التفاصيل" : "All filtered quotations with details" },
    { key: "summary" as const, title: isAr ? "ملخص حسب الحالة" : "Summary by Status", desc: isAr ? "إجمالي القيم والعدد لكل حالة" : "Aggregated counts & totals per status" },
    { key: "by_owner" as const, title: isAr ? "حسب المسؤول" : "By Owner", desc: isAr ? "أداء كل مسؤول مع نسبة الفوز" : "Owner performance with win rate" },
    { key: "by_client" as const, title: isAr ? "حسب العميل" : "By Client", desc: isAr ? "إجمالي القيم لكل عميل" : "Total quotation value per client" },
    { key: "by_month" as const, title: isAr ? "حسب الشهر" : "Monthly Trend", desc: isAr ? "العروض المُقدّمة شهرياً" : "Quotations submitted per month" },
  ];

  const kpis = [
    { label: isAr ? "العروض" : "Quotations", v: String(totals.count), tone: "text-foreground" },
    { label: isAr ? "الإجمالي" : "Total Value", v: fmtMoney(totals.total), tone: "text-primary" },
    { label: isAr ? "مقبول" : "Accepted", v: fmtMoney(totals.accepted), tone: "text-emerald-600" },
    { label: isAr ? "قيد المراجعة" : "Pending", v: fmtMoney(totals.pending), tone: "text-amber-600" },
    { label: isAr ? "مرفوض" : "Rejected", v: fmtMoney(totals.rejected), tone: "text-rose-600" },
    { label: isAr ? "نسبة الفوز" : "Win Rate", v: `${totals.winRate.toFixed(1)}%`, tone: "text-foreground" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            {isAr ? "الفلاتر" : "Filters"}
            {activeFilterCount > 0 && (
              <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{activeFilterCount}</span>
            )}
          </h3>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs font-semibold text-primary hover:underline">
              {isAr ? "مسح الكل" : "Clear all"}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث…" : "Search…"}
            className="col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="all">{isAr ? "كل الحالات" : "All statuses"}</option>
            {statuses.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="all">{isAr ? "كل المسؤولين" : "All owners"}</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={client} onChange={(e) => setClient(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="all">{isAr ? "كل العملاء" : "All clients"}</option>
            {clients.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</div>
            <div className={`mt-1 font-mono text-lg font-bold ${k.tone}`}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <div key={r.key} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></div>
              <div className="flex-1">
                <h4 className="font-display text-base font-bold text-foreground">{r.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </div>
            <button
              onClick={() => exportExcel(r.key)}
              disabled={filtered.length === 0}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> {isAr ? "تصدير إلى Excel" : "Export to Excel"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            {isAr ? "معاينة البيانات" : "Data Preview"}
          </h3>
          <span className="text-xs text-muted-foreground">{isAr ? `${filtered.length} عرض` : `${filtered.length} quotations`}</span>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary/60 text-[11px] font-bold uppercase tracking-wider text-muted-foreground backdrop-blur">
              <tr>
                <th className="px-4 py-2.5 text-start">ID</th>
                <th className="px-4 py-2.5 text-start">{isAr ? "العميل" : "Client"}</th>
                <th className="px-4 py-2.5 text-start">{isAr ? "المسؤول" : "Owner"}</th>
                <th className="px-4 py-2.5 text-end">{isAr ? "القيمة" : "Value"}</th>
                <th className="px-4 py-2.5 text-start">{isAr ? "الحالة" : "Status"}</th>
                <th className="px-4 py-2.5 text-start">{isAr ? "التاريخ" : "Date"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">{isAr ? "لا توجد نتائج" : "No matching quotations"}</td></tr>
              ) : (
                filtered.map((q) => (
                  <tr key={q.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{shortId(q.id)}</td>
                    <td className="px-4 py-2 font-semibold text-foreground">{q.client}</td>
                    <td className="px-4 py-2">{q.owner}</td>
                    <td className="px-4 py-2 text-end font-mono font-bold text-primary">{fmtMoney(q.value)}</td>
                    <td className="px-4 py-2"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-2 text-muted-foreground">{q.submissionDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProfileView({
  user,
  fields,
  initial,
  userId,
  onSaved,
}: {
  user: { name: string; role: string; photo?: string };
  fields: { email: string; phone: string; department: string };
  initial: { full_name_en: string; full_name_ar: string; avatar_url: string; phone: string };
  userId?: string;
  onSaved: () => void | Promise<void>;
}) {
  const { dir, t } = useI18n();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setForm(initial); }, [initial.full_name_en, initial.full_name_ar, initial.avatar_url, initial.phone]);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setErr(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name_en: form.full_name_en,
        full_name_ar: form.full_name_ar || null,
        avatar_url: form.avatar_url || null,
        phone: form.phone || null,
      })
      .eq("user_id", userId);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    await onSaved();
    setEditing(false);
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-4">
          {(editing ? form.avatar_url : user.photo) ? (
            <img src={editing ? form.avatar_url : user.photo!} alt={user.name} className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/30" onError={(e) => ((e.currentTarget.style.display = "none"))} />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-600 text-lg font-bold text-primary-foreground ring-2 ring-primary/30">
              {(user.name || "?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">{user.name}</h2>
                <p className="text-sm text-muted-foreground">{user.role}</p>
              </div>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent transition"
                >
                  {dir === "rtl" ? "تعديل" : "Edit"}
                </button>
              )}
            </div>

            {!editing ? (
              <>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                    <Mail className="h-4 w-4 text-primary" /> {fields.email}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                    <Phone className="h-4 w-4 text-primary" /> {fields.phone}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                    <Building2 className="h-4 w-4 text-primary" /> {fields.department}
                  </div>
                </div>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition"
                >
                  <KeyRound className="h-4 w-4 text-primary" /> {t("changePassword")}
                </button>
              </>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">
                  {dir === "rtl" ? "رابط الصورة الرمزية" : "Avatar URL"}
                  <input
                    type="url"
                    value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                    placeholder="https://…"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  {dir === "rtl" ? "الاسم (إنجليزي)" : "Full name (English)"}
                  <input
                    type="text"
                    value={form.full_name_en}
                    onChange={(e) => setForm({ ...form, full_name_en: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  {dir === "rtl" ? "الاسم (عربي)" : "Full name (Arabic)"}
                  <input
                    type="text"
                    dir="rtl"
                    value={form.full_name_ar}
                    onChange={(e) => setForm({ ...form, full_name_ar: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">
                  {dir === "rtl" ? "رقم الهاتف" : "Phone"}
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+20 100 000 0000"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </label>
                {err && <p className="text-xs text-rose-600 sm:col-span-2">{err}</p>}
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {saving ? (dir === "rtl" ? "جارٍ الحفظ…" : "Saving…") : (dir === "rtl" ? "حفظ" : "Save")}
                  </button>
                  <button
                    onClick={() => { setForm(initial); setEditing(false); setErr(null); }}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent transition"
                  >
                    {dir === "rtl" ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </>
  );
}

function FinanceChatTab() {
  const { dir, lang } = useI18n();
  const { profile, role } = useAuth();
  const { users, employees } = useStoreState();
  const contacts = chatContactsFor(role ?? "finance", profile?.id, users, employees);
  const meName =
    (dir === "rtl" ? profile?.full_name_ar : profile?.full_name_en) ||
    profile?.full_name_en ||
    "Finance";
  const meInitials =
    (meName || "").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() ||
    "FN";

  return (
    <ChatWithContacts
      contacts={contacts}
      me={{ name: meName, photo: profile?.avatar_url ?? undefined, initials: meInitials }}
      emptyHint={lang === "ar" ? "لا يوجد مسؤولون متاحون للمحادثة." : "No admins available to chat with."}
    />
  );
}
