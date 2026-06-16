import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Briefcase, TrendingUp, Target, Calendar, Phone, MapPin, Mail,
  CheckCircle2, Clock, RefreshCw, Download, Plus, FileText, UserPlus,
  AlertTriangle, ArrowUpRight, Activity as ActivityIcon, DollarSign,
} from "lucide-react";
import { fmtMoney } from "@/lib/mock-data";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
  head: () => ({ meta: [{ title: "Admin Dashboard · INT-CRM" }] }),
});

const iconMap = { call: Phone, meeting: Calendar, email: Mail, visit: MapPin } as const;

const STAGE_COLORS: Record<string, string> = {
  new: "#94a3b8", contacted: "#0ea5e9", qualified: "#6366f1",
  proposal: "#f59e0b", negotiation: "#a855f7", won: "#10b981", lost: "#ef4444",
};
const STAGE_LABELS: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified",
  proposal: "Proposal", negotiation: "Negotiation", won: "Won", lost: "Lost",
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8", sent: "#0ea5e9", negotiating: "#a855f7",
  pending_approval: "#f59e0b", approved: "#10b981", rejected: "#ef4444",
};

const SOURCE_PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#0ea5e9", "#a855f7", "#ef4444", "#64748b"];

type RangeKey = "7d" | "30d" | "90d" | "ytd" | "all";
const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days",
  ytd: "Year to date", all: "All time",
};

function rangeStart(range: RangeKey): Date | null {
  const d = new Date();
  if (range === "7d") { d.setDate(d.getDate() - 7); return d; }
  if (range === "30d") { d.setDate(d.getDate() - 30); return d; }
  if (range === "90d") { d.setDate(d.getDate() - 90); return d; }
  if (range === "ytd") return new Date(new Date().getFullYear(), 0, 1);
  return null;
}

function useDashboardData(range: RangeKey) {
  return useQuery({
    queryKey: ["admin-dashboard", range],
    queryFn: async () => {
      const start = rangeStart(range);
      const startIso = start ? start.toISOString() : null;
      const nowIso = new Date().toISOString();
      const in7 = new Date(); in7.setDate(in7.getDate() + 7);

      const [leadsRes, projectsRes, quotationsRes, activitiesRes, profilesRes] = await Promise.all([
        supabase.from("leads").select("id,company_en,status,value,owner_id,source_en,created_at,updated_at,expected_close_date"),
        supabase.from("projects").select("id,status"),
        supabase.from("quotations").select("id,value,status,created_at"),
        supabase.from("activities").select("id,title_en,title_ar,type,status,time,due_date,owner_id,lead_id,created_at").order("due_date", { ascending: true }).limit(200),
        supabase.from("profiles").select("id,full_name_en,full_name_ar,title_en,title_ar,target_value,annual_target,avatar_url").eq("active", true),
      ]);

      const allLeads = leadsRes.data ?? [];
      const projects = projectsRes.data ?? [];
      const quotations = quotationsRes.data ?? [];
      const activities = activitiesRes.data ?? [];
      const profiles = profilesRes.data ?? [];

      // Range-filtered leads (by created_at)
      const leads = startIso ? allLeads.filter((l) => l.created_at >= startIso) : allLeads;

      // KPIs
      const totalLeads = leads.length;
      const activeProjects = projects.filter((p) => p.status !== "Completed").length;
      const openLeadValue = leads
        .filter((l) => l.status !== "lost")
        .reduce((s, l) => s + Number(l.value ?? 0), 0);
      const wonCount = leads.filter((l) => l.status === "won").length;
      const closedCount = leads.filter((l) => l.status === "won" || l.status === "lost").length;
      const conversion = closedCount ? Math.round((wonCount / closedCount) * 100) : 0;
      const wonValue = leads.filter((l) => l.status === "won").reduce((s, l) => s + Number(l.value ?? 0), 0);

      // Pipeline by stage
      const stageKeys = ["new", "contacted", "qualified", "proposal", "negotiation", "won"];
      const pipeline = stageKeys.map((k) => {
        const items = leads.filter((l) => l.status === k);
        return {
          key: k, label: STAGE_LABELS[k], color: STAGE_COLORS[k],
          count: items.length,
          value: items.reduce((s, l) => s + Number(l.value ?? 0), 0),
        };
      });

      // Funnel (use counts) with drop-off
      const funnel = pipeline.map((s, i) => {
        const prev = i > 0 ? pipeline[i - 1].count : s.count;
        const drop = prev > 0 ? Math.round(((prev - s.count) / prev) * 100) : 0;
        return { ...s, dropFromPrev: i === 0 ? 0 : Math.max(drop, 0) };
      });

      // Trend — leads per week last 8 weeks
      const trend: number[] = [];
      for (let i = 7; i >= 0; i--) {
        const s = new Date(); s.setDate(s.getDate() - (i + 1) * 7);
        const e = new Date(); e.setDate(e.getDate() - i * 7);
        trend.push(allLeads.filter((l) => l.created_at >= s.toISOString() && l.created_at < e.toISOString()).length);
      }

      // Revenue chart (won deals by month last 12 months) — uses all leads (won state)
      const revenueMonths: { label: string; value: number; count: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
        const next = new Date(d); next.setMonth(next.getMonth() + 1);
        const wonInMonth = allLeads.filter(
          (l) => l.status === "won" && l.updated_at >= d.toISOString() && l.updated_at < next.toISOString()
        );
        revenueMonths.push({
          label: d.toLocaleDateString("en", { month: "short" }),
          value: wonInMonth.reduce((s, l) => s + Number(l.value ?? 0), 0),
          count: wonInMonth.length,
        });
      }

      // Top performers
      const profileById = new Map(profiles.map((p) => [p.id, p]));
      const perf = new Map<string, number>();
      leads
        .filter((l) => l.status === "won" && l.owner_id)
        .forEach((l) => perf.set(l.owner_id!, (perf.get(l.owner_id!) ?? 0) + Number(l.value ?? 0)));
      const performers = Array.from(perf.entries())
        .map(([profileId, achieved]) => {
          const p = profileById.get(profileId);
          if (!p) return null;
          const target = Number((p as any).annual_target ?? p.target_value ?? 0);
          const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
          return { id: p.id, name: p.full_name_en, role: p.title_en ?? "", achieved, target, pct };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.achieved - a.achieved)
        .slice(0, 5) as Array<{ id: string; name: string; role: string; achieved: number; target: number; pct: number }>;

      // Quick status
      const countBy = (s: string) => leads.filter((l) => l.status === s).length;
      const today = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const quick = {
        newToday: leads.filter((l) => l.status === "new" && l.created_at.slice(0, 10) === today).length,
        awaitingProposal: countBy("proposal"),
        inNegotiation: countBy("negotiation"),
        wonWeek: leads.filter((l) => l.status === "won" && l.created_at >= weekAgo.toISOString()).length,
        lostWeek: leads.filter((l) => l.status === "lost" && l.created_at >= weekAgo.toISOString()).length,
      };

      const revenueForecast = openLeadValue + quotations
        .filter((q) => q.status === "sent" || q.status === "negotiating" || q.status === "pending_approval")
        .reduce((s, q) => s + Number(q.value ?? 0), 0);

      // Quotations overview
      const quoteStatusKeys = ["draft", "sent", "negotiating", "pending_approval", "approved", "rejected"];
      const quotesByStatus = quoteStatusKeys.map((k) => {
        const items = quotations.filter((q) => q.status === k);
        return {
          key: k, label: k.replace(/_/g, " "), color: QUOTE_STATUS_COLORS[k],
          count: items.length,
          value: items.reduce((s, q) => s + Number(q.value ?? 0), 0),
        };
      });
      const totalQuoteValue = quotations.reduce((s, q) => s + Number(q.value ?? 0), 0);

      // Lead source breakdown
      const srcMap = new Map<string, number>();
      leads.forEach((l) => {
        const k = (l.source_en && l.source_en.trim()) || "Unknown";
        srcMap.set(k, (srcMap.get(k) ?? 0) + 1);
      });
      const sourceTotal = Array.from(srcMap.values()).reduce((a, b) => a + b, 0);
      const sources = Array.from(srcMap.entries())
        .map(([name, count], i) => ({ name, count, color: SOURCE_PALETTE[i % SOURCE_PALETTE.length], pct: sourceTotal > 0 ? Math.round((count / sourceTotal) * 100) : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7);

      // Upcoming activities — next 7 days, pending/in-progress
      const upcoming = activities
        .filter((a) => a.status !== "done" && a.due_date && a.due_date >= today && a.due_date <= in7.toISOString().slice(0, 10))
        .slice(0, 6);

      // Overdue follow-ups — leads with no activity in last 14 days, not closed
      const lastTouch = new Map<string, string>();
      activities.forEach((a) => {
        if (!a.lead_id) return;
        const t = a.created_at;
        const prev = lastTouch.get(a.lead_id);
        if (!prev || t > prev) lastTouch.set(a.lead_id, t);
      });
      const fourteenAgo = new Date(); fourteenAgo.setDate(fourteenAgo.getDate() - 14);
      const overdue = allLeads
        .filter((l) => l.status !== "won" && l.status !== "lost")
        .map((l) => {
          const last = lastTouch.get(l.id) ?? l.updated_at ?? l.created_at;
          return { ...l, lastTouch: last };
        })
        .filter((l) => l.lastTouch < fourteenAgo.toISOString())
        .sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))
        .slice(0, 6);

      // Recent activities (latest by created_at)
      const recentActivities = [...activities]
        .sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
        .slice(0, 6);

      return {
        kpis: { totalLeads, activeProjects, revenueForecast, conversion, wonValue, openLeadValue },
        pipeline, funnel, trend, revenueMonths, performers, quick,
        quotesByStatus, totalQuoteValue, totalQuotes: quotations.length,
        sources, upcoming, overdue, recentActivities,
        rangeLabel: RANGE_LABELS[range],
      };
    },
  });
}

function toCsv(rows: Array<Record<string, any>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function AdminDashboard() {
  const { t, lang } = useI18n();
  const { profile, role } = useAuth();
  const [range, setRange] = useState<RangeKey>("30d");
  const { data, isLoading, isFetching, refetch } = useDashboardData(range);

  const initials = (profile?.full_name_en ?? profile?.email ?? "U")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const user = {
    name: lang === "ar" ? (profile?.full_name_ar ?? profile?.full_name_en ?? "") : (profile?.full_name_en ?? ""),
    role: role ? t(role as any) : t("admin"),
    initials,
    photo: profile?.avatar_url ?? "",
  };

  const maxRevenue = useMemo(() => Math.max(1, ...(data?.revenueMonths.map((m) => m.value) ?? [1])), [data]);
  const maxFunnel = useMemo(() => Math.max(1, ...(data?.funnel.map((s) => s.count) ?? [1])), [data]);

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ...data.pipeline.map((p) => ({ section: "pipeline", key: p.key, label: p.label, count: p.count, value: p.value })),
      ...data.quotesByStatus.map((q) => ({ section: "quotations", key: q.key, label: q.label, count: q.count, value: q.value })),
      ...data.sources.map((s) => ({ section: "sources", key: s.name, label: s.name, count: s.count, value: s.pct })),
      ...data.revenueMonths.map((m) => ({ section: "revenue", key: m.label, label: m.label, count: m.count, value: m.value })),
    ];
    downloadCsv(`dashboard-${range}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  if (isLoading || !data) {
    return (
      <AppShell panel="admin" user={user} pageTitle={t("overview")}>
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  const { kpis, pipeline, funnel, trend, revenueMonths, performers, quick, quotesByStatus, totalQuoteValue, totalQuotes, sources, upcoming, overdue, recentActivities } = data;
  const maxTrend = Math.max(1, ...trend);
  const maxPipeline = Math.max(1, ...pipeline.map((x) => x.value));

  return (
    <AppShell panel="admin" user={user} pageTitle={t("overview")}>
      {/* Header: range, refresh, export */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-1">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                range === k
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {RANGE_LABELS[k]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link to="/admin/leads" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Plus className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">New Lead</div>
            <div className="text-xs text-muted-foreground">Capture opportunity</div>
          </div>
          <ArrowUpRight className="ms-auto h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
        </Link>
        <Link to="/admin/offers" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600"><FileText className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">New Quotation</div>
            <div className="text-xs text-muted-foreground">Draft an offer</div>
          </div>
          <ArrowUpRight className="ms-auto h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
        </Link>
        <Link to="/admin/activities" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600"><ActivityIcon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">New Activity</div>
            <div className="text-xs text-muted-foreground">Log a touchpoint</div>
          </div>
          <ArrowUpRight className="ms-auto h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
        </Link>
        <Link to="/admin/settings" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:border-primary hover:shadow-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600"><UserPlus className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">Invite User</div>
            <div className="text-xs text-muted-foreground">Onboard teammate</div>
          </div>
          <ArrowUpRight className="ms-auto h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("totalLeads")} value={kpis.totalLeads.toLocaleString()} icon={Users} accent="primary" />
        <KpiCard label={t("activeProjects")} value={String(kpis.activeProjects)} icon={Briefcase} accent="info" />
        <KpiCard label={t("revenueForecast")} value={fmtMoney(kpis.revenueForecast)} icon={TrendingUp} accent="success" />
        <KpiCard label={t("conversionRate")} value={`${kpis.conversion}%`} icon={Target} accent="warning" />
      </div>

      {/* Revenue chart + Pipeline funnel */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Revenue (Won Deals)</h3>
              <p className="text-xs text-muted-foreground">Last 12 months · Total won: <span className="font-mono font-bold text-emerald-600">{fmtMoney(kpis.wonValue)}</span></p>
            </div>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-6 flex h-48 items-end gap-2">
            {revenueMonths.map((m, i) => {
              const h = (m.value / maxRevenue) * 100;
              return (
                <div key={i} className="group flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-emerald-500/40 to-emerald-500 transition-all hover:from-emerald-500 hover:to-emerald-400"
                      style={{ height: `${Math.max(h, 2)}%` }}
                      title={`${m.label}: ${fmtMoney(m.value)} (${m.count} deals)`}
                    />
                    <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background opacity-0 transition group-hover:opacity-100">
                      {fmtMoney(m.value)}
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold uppercase text-muted-foreground">{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-base font-bold text-foreground">Pipeline Funnel</h3>
          <p className="text-xs text-muted-foreground">Drop-off between stages</p>
          <div className="mt-5 space-y-2">
            {funnel.map((s, idx) => {
              const widthPct = (s.count / maxFunnel) * 100;
              return (
                <div key={s.key}>
                  {idx > 0 && s.dropFromPrev > 0 && (
                    <div className="flex items-center justify-end pe-2 text-[10px] font-semibold text-rose-600">
                      ↓ {s.dropFromPrev}% drop-off
                    </div>
                  )}
                  <div className="relative h-9 overflow-hidden rounded-lg bg-secondary">
                    <div
                      className="flex h-full items-center justify-between px-3 text-xs font-bold text-white transition-all"
                      style={{ width: `${Math.max(widthPct, 18)}%`, background: s.color }}
                    >
                      <span>{s.label}</span>
                      <span className="font-mono">{s.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pipeline by stage + Top performers (existing) */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{t("pipelineByStage")}</h3>
            <span className="text-xs text-muted-foreground">{data.rangeLabel}</span>
          </div>
          <div className="mt-5 space-y-3">
            {pipeline.map((s) => {
              const pct = (s.value / maxPipeline) * 100;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="font-semibold text-foreground">{s.label}</span>
                      <span className="text-muted-foreground">· {s.count} {t("leadsCount")}</span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">{fmtMoney(s.value)}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("leadsTrendTitle")}</h4>
              <span className="text-[10px] text-muted-foreground">Last 8 weeks</span>
            </div>
            <div className="mt-4 flex h-24 items-end gap-1.5">
              {trend.map((v, i) => (
                <div
                  key={i}
                  className="group flex-1 rounded-t-md bg-gradient-to-t from-primary/30 to-primary transition-all hover:from-primary hover:to-primary/80"
                  style={{ height: `${(v / maxTrend) * 100}%` }}
                  title={`Week ${i + 1}: ${v}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-base font-bold text-foreground">{t("topPerformers")}</h3>
          <div className="mt-5 space-y-4">
            {performers.length === 0 && (
              <div className="text-xs text-muted-foreground">No data yet</div>
            )}
            {performers.map((e, idx) => {
              const textColor = e.pct >= 100 ? "text-emerald-600" : e.pct >= 75 ? "text-amber-600" : "text-rose-600";
              const bgBadge = e.pct >= 100 ? "bg-emerald-100 text-emerald-700" : e.pct >= 75 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
              const init = e.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              return (
                <Link
                  key={e.id}
                  to="/admin/employees/$employeeId"
                  params={{ employeeId: e.id }}
                  className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition hover:bg-accent"
                >
                  <div className="relative">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${bgBadge}`}>{init}</div>
                    {idx === 0 && (
                      <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">1</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{e.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{e.role}</div>
                  </div>
                  <div className="text-end">
                    <div className={`font-mono text-sm font-bold ${textColor}`}>{e.target > 0 ? `${e.pct}%` : fmtMoney(e.achieved)}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">{t("score")}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quotations overview + Lead source mix */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Quotations Overview</h3>
              <p className="text-xs text-muted-foreground">{totalQuotes} quotations · Total value <span className="font-mono font-bold text-foreground">{fmtMoney(totalQuoteValue)}</span></p>
            </div>
            <Link to="/admin/offers" className="text-xs font-semibold text-primary hover:underline">{t("viewAll")}</Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {quotesByStatus.map((q) => (
              <div key={q.key} className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: q.color }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{q.label}</span>
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-foreground">{q.count}</div>
                <div className="font-mono text-xs text-muted-foreground">{fmtMoney(q.value)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-base font-bold text-foreground">Lead Sources</h3>
          <p className="text-xs text-muted-foreground">Where leads come from</p>
          {sources.length === 0 ? (
            <div className="mt-6 text-xs text-muted-foreground">No source data</div>
          ) : (
            <>
              <div className="mt-5 flex items-center gap-4">
                {/* Donut */}
                <div className="relative h-28 w-28 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    {(() => {
                      let offset = 0;
                      const C = 2 * Math.PI * 15.9155;
                      return sources.map((s) => {
                        const len = (s.pct / 100) * C;
                        const dash = `${len} ${C - len}`;
                        const el = (
                          <circle key={s.name} cx="18" cy="18" r="15.9155"
                            fill="none" stroke={s.color} strokeWidth="4"
                            strokeDasharray={dash} strokeDashoffset={-offset} />
                        );
                        offset += len;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-lg font-bold text-foreground">{sources.reduce((a, b) => a + b.count, 0)}</span>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground">leads</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {sources.slice(0, 5).map((s) => (
                    <div key={s.name} className="flex items-center justify-between text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="truncate font-semibold text-foreground">{s.name}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upcoming activities + Overdue follow-ups */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Upcoming Activities</h3>
              <p className="text-xs text-muted-foreground">Next 7 days</p>
            </div>
            <Link to="/admin/activities" className="text-xs font-semibold text-primary hover:underline">{t("viewAll")}</Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {upcoming.length === 0 && (
              <div className="py-6 text-center text-xs text-muted-foreground">Nothing scheduled in the next 7 days</div>
            )}
            {upcoming.map((a: any) => {
              const Icon = iconMap[String(a.type).toLowerCase() as keyof typeof iconMap] ?? Calendar;
              const title = lang === "ar" ? (a.title_ar ?? a.title_en) : a.title_en;
              const d = new Date(a.due_date);
              return (
                <Link key={a.id} to="/admin/activities/$activityId" params={{ activityId: String(a.id) }}
                  className="flex items-center gap-3 py-3 rounded-lg px-2 -mx-2 transition hover:bg-accent">
                  <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-border bg-secondary text-foreground">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">{d.toLocaleDateString("en", { month: "short" })}</span>
                    <span className="text-sm font-bold leading-none">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="truncate text-sm font-semibold text-foreground">{title}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.due_date}{a.time ? ` · ${a.time}` : ""}</div>
                  </div>
                  {a.status === "in_progress" ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{t("live")}</span>
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="font-display text-base font-bold text-foreground">Overdue Follow-ups</h3>
            </div>
            <span className="text-xs text-muted-foreground">No touch in 14+ days</span>
          </div>
          <div className="mt-4 divide-y divide-border">
            {overdue.length === 0 && (
              <div className="py-6 text-center text-xs text-emerald-600">All caught up — no overdue leads</div>
            )}
            {overdue.map((l: any) => {
              const days = Math.floor((Date.now() - new Date(l.lastTouch).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Link key={l.id} to="/admin/leads/$leadId" params={{ leadId: String(l.id) }}
                  className="flex items-center gap-3 py-3 rounded-lg px-2 -mx-2 transition hover:bg-accent">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{l.company_en}</div>
                    <div className="text-xs text-muted-foreground">{days} days inactive · <StatusBadge status={l.status} /></div>
                  </div>
                  <div className="text-end">
                    <div className="font-mono text-sm font-bold text-foreground">{fmtMoney(Number(l.value ?? 0))}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activities + Quick status (existing) */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{t("recentActivities")}</h3>
            <Link to="/admin/activities" className="text-xs font-semibold text-primary hover:underline">{t("viewAll")}</Link>
          </div>
          <div className="mt-4 divide-y divide-border">
            {recentActivities.length === 0 && (
              <div className="py-4 text-xs text-muted-foreground">No activities yet</div>
            )}
            {recentActivities.map((a: any) => {
              const Icon = iconMap[String(a.type).toLowerCase() as keyof typeof iconMap] ?? Calendar;
              const title = lang === "ar" ? (a.title_ar ?? a.title_en) : a.title_en;
              return (
                <Link key={a.id} to="/admin/activities/$activityId" params={{ activityId: String(a.id) }}
                  className="flex items-center gap-3 py-3 rounded-lg px-2 -mx-2 transition hover:bg-accent">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{title}</div>
                    <div className="text-xs text-muted-foreground">{a.due_date}{a.time ? ` · ${a.time}` : ""}</div>
                  </div>
                  {a.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : a.status === "in_progress" ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{t("live")}</span>
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-base font-bold text-foreground">{t("quickStatusTitle")}</h3>
          <div className="mt-4 space-y-3 text-sm">
            {[
              { lKey: "newLeadsToday", v: quick.newToday, b: "new" },
              { lKey: "awaitingProposal", v: quick.awaitingProposal, b: "proposal" },
              { lKey: "inNegotiation", v: quick.inNegotiation, b: "negotiation" },
              { lKey: "closedWonWeek", v: quick.wonWeek, b: "won" },
              { lKey: "lostWeek", v: quick.lostWeek, b: "lost" },
            ].map((r) => (
              <Link key={r.lKey} to="/admin/leads" className="flex items-center justify-between rounded-lg p-2 -mx-2 transition hover:bg-accent">
                <span className="text-muted-foreground">{t(r.lKey as any)}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">{r.v}</span>
                  <StatusBadge status={r.b} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
