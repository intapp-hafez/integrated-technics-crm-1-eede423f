import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/mock-data";
import { CalendarDays, Target, Users2, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export interface EmployeeTargetsCardProps {
  /** The employee's auth user id — used to fetch the profile row. */
  userId?: string | null;
  /** Optional profile id — used as a fallback when userId is missing. */
  profileId?: string | null;
  /** Leads owned by this employee (used for annual/quarter sales achieved). */
  leads: Array<{ status?: string; value?: number | null; updatedAt?: string | null; updatedAtIso?: string | null }>;
  /** Activities owned by this employee (used for weekly meetings counter). */
  activities: Array<{ type?: string; status?: string; dueDate?: string; createdAt?: string }>;
  /** When true, render an "Edit targets" button that opens the inline editor. */
  canEdit?: boolean;
  /** Compact heading variant. */
  title?: string;
}

type ProfileTargets = {
  start_date: string | null;
  annual_target: number | null;
  q1_target: number | null;
  q2_target: number | null;
  q3_target: number | null;
  q4_target: number | null;
  weekly_meetings_target: number | null;
};

const CAIRO_TZ = "Africa/Cairo";

function cairoNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).reduce<Record<string, string>>((a, p) => p.type !== "literal" ? { ...a, [p.type]: p.value } : a, {});
  return { y: Number(parts.year), m: Number(parts.month) - 1, d: Number(parts.day) };
}

function quarterBounds(y: number, q: 1 | 2 | 3 | 4) {
  const start = new Date(Date.UTC(y, (q - 1) * 3, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, q * 3, 0, 23, 59, 59));
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function weekBounds(now = new Date()) {
  // Monday start of the current ISO week, Sunday end.
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 Sun..6 Sat
  const diffToMon = (day + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMon, 0, 0, 0));
  const sunday = new Date(monday.getTime() + 7 * 86400_000 - 1);
  return { startMs: monday.getTime(), endMs: sunday.getTime(), startIso: monday.toISOString().slice(0, 10), endIso: sunday.toISOString().slice(0, 10) };
}

function wonLeadsBetween(leads: EmployeeTargetsCardProps["leads"], startMs: number, endMs: number) {
  return leads.filter((l) => {
    if (l.status !== "won") return false;
    const u = l.updatedAtIso ?? l.updatedAt;
    if (!u) return false;
    const t = new Date(u).getTime();
    return Number.isFinite(t) && t >= startMs && t <= endMs;
  });
}
function sumWonBetween(leads: EmployeeTargetsCardProps["leads"], startMs: number, endMs: number) {
  return wonLeadsBetween(leads, startMs, endMs).reduce((s, l) => s + Number(l.value ?? 0), 0);
}
function countMeetingsBetween(activities: EmployeeTargetsCardProps["activities"], startIso: string, endIso: string) {
  return activities.filter((a) => {
    if ((a.type ?? "").toLowerCase() !== "meeting") return false;
    if (a.status === "cancelled") return false;
    const iso = (a.dueDate ?? a.createdAt ?? "").slice(0, 10);
    if (!iso) return false;
    return iso >= startIso && iso <= endIso;
  }).length;
}
function isoDay(ms: number) { return new Date(ms).toISOString().slice(0, 10); }

function countMeetingsInWeek(activities: EmployeeTargetsCardProps["activities"]) {
  const wk = weekBounds(new Date());
  return activities.filter((a) => {
    const isMeeting = (a.type ?? "").toLowerCase() === "meeting";
    if (!isMeeting) return false;
    if (a.status === "cancelled") return false;
    const iso = a.dueDate ?? a.createdAt;
    if (!iso) return false;
    return iso >= wk.startIso && iso <= wk.endIso;
  }).length;
}

function Bar({ value, max, tone }: { value: number; max: number; tone: "primary" | "emerald" | "amber" | "rose" | "sky" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const cls = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : tone === "rose" ? "bg-rose-500" : tone === "sky" ? "bg-sky-500" : "bg-primary";
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className={`h-full ${cls}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmployeeTargetsCard({ userId, profileId, leads, activities, canEdit, title }: EmployeeTargetsCardProps) {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const L = {
    perfMetrics: isAr ? "مؤشرات الأداء" : "Performance Metrics",
    employeeTargets: isAr ? "أهداف الموظف" : "Employee Targets",
    edit: isAr ? "تعديل" : "Edit",
    loading: isAr ? "جارٍ تحميل الأهداف…" : "Loading targets…",
    employmentStart: isAr ? "تاريخ بدء العمل" : "Employment Start",
    days: isAr ? "يوم" : "days",
    yrs: isAr ? "سنة" : "yrs",
    annualRevenueTarget: isAr ? "هدف الإيرادات السنوي" : "Annual Revenue Target",
    achieved: isAr ? "مُحقَّق" : "Achieved",
    progress: isAr ? "التقدم" : "Progress",
    meetingsThisWeek: isAr ? "اجتماعات هذا الأسبوع" : "Meetings this Week",
    required: isAr ? "مطلوب" : "required",
    of: isAr ? "من" : "of",
    focus: isAr ? "تركيز" : "Focus",
    completed: isAr ? "مكتمل" : "Completed",
    progressShort: isAr ? "تقدم" : "Progress",
    scheduled: isAr ? "مجدول" : "Scheduled",
    quarterlyKpi: isAr ? "تفصيل مؤشرات الأداء الربعي" : "Quarterly KPI breakdown",
    actualVsTarget: isAr ? "الفعلي مقابل الهدف" : "Actual vs Target",
    quarter: isAr ? "الربع" : "Quarter",
    period: isAr ? "الفترة" : "Period",
    target: isAr ? "الهدف" : "Target",
    gap: isAr ? "الفارق" : "Δ Gap",
    wonDeals: isAr ? "صفقات مكتسبة" : "Won deals",
    meetings: isAr ? "الاجتماعات" : "Meetings",
    now: isAr ? "الآن" : "now",
    yearTotal: isAr ? "إجمالي السنة" : "Year total",
  };
  const [editing, setEditing] = useState(false);

  const profileQuery = useQuery({
    enabled: !!(userId || profileId),
    queryKey: ["employee-targets", userId ?? null, profileId ?? null],
    refetchInterval: 30_000,
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id,start_date,annual_target,q1_target,q2_target,q3_target,q4_target,weekly_meetings_target");
      if (userId) q = q.eq("user_id", userId);
      else if (profileId) q = q.eq("id", profileId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as (ProfileTargets & { id: string }) | null;
    },
  });

  useEffect(() => {
    if (!userId && !profileId) return;
    const channel = supabase
      .channel(`emp-targets-${userId ?? profileId}`)
      .on("postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "profiles", filter: userId ? `user_id=eq.${userId}` : `id=eq.${profileId}` },
        () => { void qc.invalidateQueries({ queryKey: ["employee-targets", userId ?? null, profileId ?? null] }); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, profileId, qc]);

  const data = profileQuery.data;
  const startDate = data?.start_date ?? null;
  const annualTarget = Number(data?.annual_target ?? 0);
  const qTargets = [
    Number(data?.q1_target ?? 0),
    Number(data?.q2_target ?? 0),
    Number(data?.q3_target ?? 0),
    Number(data?.q4_target ?? 0),
  ];
  const meetingsTarget = Number(data?.weekly_meetings_target ?? 0);

  const { y, m } = cairoNow();
  const yearStart = new Date(Date.UTC(y, 0, 1)).getTime();
  const yearEnd = new Date(Date.UTC(y, 11, 31, 23, 59, 59)).getTime();
  const annualAchieved = useMemo(() => sumWonBetween(leads, yearStart, yearEnd), [leads, yearStart, yearEnd]);
  const currentQ = (Math.floor(m / 3) + 1) as 1 | 2 | 3 | 4;
  const qAchieved = useMemo(() => [1, 2, 3, 4].map((qn) => {
    const b = quarterBounds(y, qn as 1 | 2 | 3 | 4);
    return sumWonBetween(leads, b.startMs, b.endMs);
  }), [leads, y]);
  const qWonCounts = useMemo(() => [1, 2, 3, 4].map((qn) => {
    const b = quarterBounds(y, qn as 1 | 2 | 3 | 4);
    return wonLeadsBetween(leads, b.startMs, b.endMs).length;
  }), [leads, y]);
  const qMeetings = useMemo(() => [1, 2, 3, 4].map((qn) => {
    const b = quarterBounds(y, qn as 1 | 2 | 3 | 4);
    return countMeetingsBetween(activities, isoDay(b.startMs), isoDay(b.endMs));
  }), [activities, y]);
  const meetingsDone = useMemo(() => countMeetingsInWeek(activities), [activities]);

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso + "T12:00:00Z");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: CAIRO_TZ });
  };
  const tenureDays = startDate ? Math.max(0, Math.floor((Date.now() - new Date(startDate + "T00:00:00Z").getTime()) / 86400_000)) : null;

  const meetingsPct = meetingsTarget > 0 ? Math.min(100, (meetingsDone / meetingsTarget) * 100) : 0;
  const meetingsTone: Parameters<typeof Bar>[0]["tone"] = meetingsPct >= 100 ? "emerald" : meetingsPct >= 60 ? "amber" : "rose";
  const annualPct = annualTarget > 0 ? Math.min(100, (annualAchieved / annualTarget) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className={`text-[11px] font-bold uppercase ${isAr ? "" : "tracking-widest"} text-primary mb-1`}>{L.perfMetrics}</div>
          <h3 className="font-display text-xl font-bold text-foreground tracking-tight inline-flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> {title ?? L.employeeTargets}
          </h3>
        </div>
        {canEdit && data?.id && (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent">
            <Pencil className="h-3.5 w-3.5" /> {L.edit}
          </button>
        )}
      </div>

      {profileQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">{L.loading}</div>
      ) : (
        <>
          {/* Employment start pill */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-secondary/40 px-4 py-2 border border-border">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className={`text-[10px] font-bold uppercase ${isAr ? "" : "tracking-wider"} text-muted-foreground`}>{L.employmentStart}</span>
              <span className="text-sm font-bold text-foreground">{fmtDate(startDate)}</span>
              {tenureDays !== null && (
                <span className="text-xs text-muted-foreground">· {tenureDays} {L.days} · {(tenureDays / 365).toFixed(1)} {L.yrs}</span>
              )}
            </div>
          </div>

          {/* Top Row: Annual & Meetings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {/* Annual target hero card */}
            <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-lg">
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <p className={`text-slate-400 text-xs font-semibold uppercase ${isAr ? "" : "tracking-wider"} mb-2`}>{L.annualRevenueTarget} ({y})</p>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tight" dir="ltr">{fmtMoney(annualTarget)}</h3>
                    {annualTarget > 0 && (
                      <span className="bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-primary/30">{annualPct.toFixed(0)}% {L.achieved}</span>
                    )}
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between gap-3 text-xs font-bold mb-2">
                    <span className="text-slate-400">{L.progress}: {annualPct.toFixed(0)}%</span>
                    <span className="text-primary" dir={isAr ? "rtl" : "ltr"}>{fmtMoney(annualAchieved)} {L.achieved}</span>
                  </div>
                  <div className="flex w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      style={{ width: `${Math.min(100, annualPct)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className={`absolute ${isAr ? "-left-12" : "-right-12"} -top-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl`} />
            </div>

            {/* Meetings this week */}
            <div className="rounded-2xl border-2 border-secondary/60 bg-card p-5 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className={`text-muted-foreground text-xs font-semibold uppercase ${isAr ? "" : "tracking-wider"}`}>{L.meetingsThisWeek}</p>
                  <h3 className="text-4xl font-black text-foreground mt-2" dir="ltr">
                    {meetingsDone}
                    <span className="text-muted-foreground text-2xl font-medium">/{meetingsTarget}</span>
                  </h3>
                </div>
                <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
                  <Users2 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex gap-0.5 flex-1">
                    {Array.from({ length: Math.max(1, meetingsTarget) }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 rounded-sm ${i < meetingsDone ? 'bg-primary' : 'bg-secondary'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground w-8 text-end">{meetingsPct.toFixed(0)}%</span>
                </div>
                <div className={`text-[11px] font-bold ${meetingsPct >= 100 ? "text-emerald-600" : meetingsPct >= 60 ? "text-amber-600" : "text-rose-600"}`}>
                  {meetingsDone} {L.of} {meetingsTarget} {L.required}
                </div>
              </div>
            </div>
          </div>

          {/* Quarterly Targets Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {qTargets.map((t, i) => {
              const qn = (i + 1) as 1 | 2 | 3 | 4;
              const ach = qAchieved[i];
              const pct = t > 0 ? Math.min(100, (ach / t) * 100) : 0;
              const isPast = qn < currentQ;
              const isCurrent = qn === currentQ;
              const isFuture = qn > currentQ;

              return (
                <div
                  key={qn}
                  className={`group rounded-2xl p-5 transition-all duration-300 cursor-default ${
                    isFuture
                      ? 'bg-secondary/20 border border-dashed border-border opacity-60'
                      : 'bg-secondary/40 border border-transparent hover:bg-card hover:shadow-lg hover:shadow-primary/5 hover:border-border'
                  }`}
                >
                  <div className="flex justify-between items-center mb-4 gap-2">
                    <span className={`text-[10px] font-black uppercase ${isAr ? "" : "tracking-widest"} transition-colors ${
                      isFuture ? 'text-muted-foreground' : 'text-muted-foreground group-hover:text-primary'
                    }`}>{isAr ? `${L.focus} الربع ${qn}` : `Q${qn} ${L.focus}`}</span>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      isPast ? 'bg-emerald-500 ring-4 ring-emerald-500/20' :
                      isCurrent ? 'bg-primary animate-pulse ring-4 ring-primary/20' :
                      'bg-muted-foreground/30'
                    }`} />
                  </div>
                  <p className={`text-xl font-extrabold ${isFuture ? 'text-muted-foreground' : 'text-foreground'}`} dir="ltr">
                    {fmtMoney(t)}
                  </p>
                  <p className={`text-[10px] font-medium mb-3 ${isFuture ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                    {isPast ? L.completed : isCurrent ? `${pct.toFixed(0)}% ${L.progressShort}` : L.scheduled}
                  </p>
                  <div className="flex w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPast ? 'bg-emerald-500' :
                        isCurrent ? 'bg-primary' :
                        'bg-muted-foreground/20'
                      }`}
                      style={isCurrent ? { width: `${pct}%` } : isPast ? { width: '100%' } : { width: '0%' }}
                    />
                  </div>
                  {!isFuture && (
                    <p className="mt-2 text-[10px] font-bold text-muted-foreground" dir={isAr ? "rtl" : "ltr"}>
                      {isAr ? `${fmtMoney(ach)} ${L.achieved}` : `${fmtMoney(ach)} achieved`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!profileQuery.isLoading && (
        <div className="mt-6 rounded-lg border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <h4 className="font-display text-sm font-bold text-foreground inline-flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-primary" /> {L.quarterlyKpi} ({y})
            </h4>
            <div className={`text-[10px] uppercase ${isAr ? "" : "tracking-wider"} text-muted-foreground`}>{L.actualVsTarget}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className={`border-b border-border text-[10px] uppercase ${isAr ? "" : "tracking-wider"} text-muted-foreground`}>
                  <th className="py-2 text-start font-semibold">{L.quarter}</th>
                  <th className="py-2 text-start font-semibold">{L.period}</th>
                  <th className="py-2 text-end font-semibold">{L.target}</th>
                  <th className="py-2 text-end font-semibold">{L.achieved}</th>
                  <th className="py-2 text-end font-semibold">{L.gap}</th>
                  <th className="py-2 text-end font-semibold">{L.wonDeals}</th>
                  <th className="py-2 text-end font-semibold">{L.meetings}</th>
                  <th className="py-2 px-2 text-start font-semibold w-[28%]">{L.progress}</th>
                </tr>
              </thead>
              <tbody>
                {qTargets.map((tg, i) => {
                  const qn = (i + 1) as 1 | 2 | 3 | 4;
                  const ach = qAchieved[i];
                  const gap = ach - tg;
                  const pct = tg > 0 ? Math.min(100, (ach / tg) * 100) : 0;
                  const tone: Parameters<typeof Bar>[0]["tone"] = pct >= 100 ? "emerald" : pct >= 60 ? "amber" : qn === currentQ ? "primary" : "rose";
                  const b = quarterBounds(y, qn);
                  const period = `${isoDay(b.startMs).slice(5)} – ${isoDay(b.endMs).slice(5)}`;
                  const isCurrent = qn === currentQ;
                  return (
                    <tr key={qn} className={`border-b border-border/60 last:border-0 ${isCurrent ? "bg-primary/5" : ""}`}>
                      <td className="py-2.5 font-bold text-foreground">
                        Q{qn}{isCurrent && <span className={`${isAr ? "mr-1" : "ml-1"} rounded-sm bg-primary/15 px-1 py-0.5 text-[9px] uppercase tracking-wider text-primary`}>{L.now}</span>}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground" dir="ltr">{period}</td>
                      <td className="py-2.5 text-end font-mono text-xs text-foreground" dir="ltr">{fmtMoney(tg)}</td>
                      <td className="py-2.5 text-end font-mono text-xs font-bold text-foreground" dir="ltr">{fmtMoney(ach)}</td>
                      <td className={`py-2.5 text-end font-mono text-xs font-semibold ${gap >= 0 ? "text-emerald-600" : "text-rose-600"}`} dir="ltr">
                        {gap >= 0 ? "+" : ""}{fmtMoney(gap)}
                      </td>
                      <td className="py-2.5 text-end text-xs text-foreground" dir="ltr">{qWonCounts[i]}</td>
                      <td className="py-2.5 text-end text-xs text-foreground" dir="ltr">{qMeetings[i]}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1"><Bar value={ach} max={tg} tone={tone} /></div>
                          <span className={`w-10 text-end text-[11px] font-bold ${pct >= 100 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600"}`} dir="ltr">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(() => {
                  const tg = qTargets.reduce((s, v) => s + v, 0);
                  const ach = qAchieved.reduce((s, v) => s + v, 0);
                  const gap = ach - tg;
                  const pct = tg > 0 ? Math.min(100, (ach / tg) * 100) : 0;
                  const tone: Parameters<typeof Bar>[0]["tone"] = pct >= 100 ? "emerald" : pct >= 60 ? "amber" : "primary";
                  return (
                    <tr className="bg-secondary/40">
                      <td className="py-2.5 font-bold text-foreground" colSpan={2}>{L.yearTotal}</td>
                      <td className="py-2.5 text-end font-mono text-xs font-bold text-foreground" dir="ltr">{fmtMoney(tg)}</td>
                      <td className="py-2.5 text-end font-mono text-xs font-bold text-foreground" dir="ltr">{fmtMoney(ach)}</td>
                      <td className={`py-2.5 text-end font-mono text-xs font-bold ${gap >= 0 ? "text-emerald-600" : "text-rose-600"}`} dir="ltr">
                        {gap >= 0 ? "+" : ""}{fmtMoney(gap)}
                      </td>
                      <td className="py-2.5 text-end text-xs font-bold text-foreground" dir="ltr">{qWonCounts.reduce((s, v) => s + v, 0)}</td>
                      <td className="py-2.5 text-end text-xs font-bold text-foreground" dir="ltr">{qMeetings.reduce((s, v) => s + v, 0)}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1"><Bar value={ach} max={tg} tone={tone} /></div>
                          <span className={`w-10 text-end text-[11px] font-bold ${pct >= 100 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600"}`} dir="ltr">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && data && (
        <EditTargetsModal profileId={data.id} initial={data} onClose={() => setEditing(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["employee-targets", userId ?? null, profileId ?? null] })} />
      )}
    </div>
  );
}

const inputCls = "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function EditField({
  label, name, type = "number", min, max, step, form, errors, setForm,
}: {
  label: string;
  name: keyof ReturnType<typeof defaultForm>;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  form: ReturnType<typeof defaultForm>;
  errors: Record<string, string>;
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof defaultForm>>>;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={form[name] as any}
        onChange={(e) => setForm((f) => ({ ...f, [name]: type === "number" ? Number(e.target.value) : e.target.value }))}
        className={inputCls}
      />
      {errors[name as string] && <span className="mt-1 block text-[11px] font-semibold text-rose-600">{errors[name as string]}</span>}
    </label>
  );
}

function defaultForm(initial: ProfileTargets) {
  return {
    start_date: initial.start_date ?? "",
    annual_target: Number(initial.annual_target ?? 0),
    q1_target: Number(initial.q1_target ?? 0),
    q2_target: Number(initial.q2_target ?? 0),
    q3_target: Number(initial.q3_target ?? 0),
    q4_target: Number(initial.q4_target ?? 0),
    weekly_meetings_target: Number(initial.weekly_meetings_target ?? 0),
  };
}

function EditTargetsModal({
  profileId, initial, onClose, onSaved,
}: {
  profileId: string;
  initial: ProfileTargets;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => defaultForm(initial));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    // Start date: must parse to a valid date, not in the far future
    if (form.start_date) {
      const d = new Date(form.start_date);
      if (Number.isNaN(d.getTime())) e.start_date = "Invalid date";
      else {
        const maxFuture = new Date(); maxFuture.setFullYear(maxFuture.getFullYear() + 1);
        if (d.getTime() > maxFuture.getTime()) e.start_date = "Start date too far in the future";
        const minPast = new Date("1970-01-01");
        if (d.getTime() < minPast.getTime()) e.start_date = "Start date too far in the past";
      }
    }
    const numField = (key: keyof typeof form, label: string, max: number) => {
      const v = Number((form as any)[key]);
      if (!Number.isFinite(v)) e[key as string] = `${label} must be a number`;
      else if (v < 0) e[key as string] = `${label} cannot be negative`;
      else if (v > max) e[key as string] = `${label} exceeds ${max.toLocaleString()}`;
    };
    numField("annual_target", "Annual target", 1_000_000_000_000);
    numField("q1_target", "Q1 target", 1_000_000_000_000);
    numField("q2_target", "Q2 target", 1_000_000_000_000);
    numField("q3_target", "Q3 target", 1_000_000_000_000);
    numField("q4_target", "Q4 target", 1_000_000_000_000);
    const wm = Number(form.weekly_meetings_target);
    if (!Number.isInteger(wm)) e.weekly_meetings_target = "Must be a whole number";
    else if (wm < 0 || wm > 100) e.weekly_meetings_target = "Must be 0–100";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          start_date: form.start_date || null,
          annual_target: form.annual_target,
          q1_target: form.q1_target,
          q2_target: form.q2_target,
          q3_target: form.q3_target,
          q4_target: form.q4_target,
          weekly_meetings_target: form.weekly_meetings_target,
        })
        .eq("id", profileId);
      if (error) throw error;
      toast.success("Targets updated");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">Edit employment & targets</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <EditField label="Employment start date" name="start_date" type="date" form={form} errors={errors} setForm={setForm} />
          <EditField label="Weekly meetings target" name="weekly_meetings_target" type="number" min={0} max={100} step={1} form={form} errors={errors} setForm={setForm} />
          <EditField label="Annual target" name="annual_target" type="number" min={0} step={100} form={form} errors={errors} setForm={setForm} />
          <div />
          <EditField label="Q1 target" name="q1_target" type="number" min={0} step={100} form={form} errors={errors} setForm={setForm} />
          <EditField label="Q2 target" name="q2_target" type="number" min={0} step={100} form={form} errors={errors} setForm={setForm} />
          <EditField label="Q3 target" name="q3_target" type="number" min={0} step={100} form={form} errors={errors} setForm={setForm} />
          <EditField label="Q4 target" name="q4_target" type="number" min={0} step={100} form={form} errors={errors} setForm={setForm} />
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent">Cancel</button>
          <button disabled={busy} onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
