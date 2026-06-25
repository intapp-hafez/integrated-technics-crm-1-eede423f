import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { Users, CalendarCheck, Briefcase, LogIn, LogOut, MapPin, Award, Plus, Clock4, FileBadge, Loader2, Check } from "lucide-react";
import { employees, fmtMoney } from "@/lib/mock-data";
import { actions, useStoreState } from "@/lib/store";
import { TargetCountdown, TargetRefreshIndicator } from "@/components/TargetCountdown";
import { computeTargetPeriod, fmtCairoDate, sumWonInPeriod } from "@/lib/targetPeriod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useEffect, useMemo, useState } from "react";
import { isLeadRelatedToEmployee } from "@/lib/employeeTargets";
import { filterMyProjects } from "@/lib/employeeProjects";
import { EmployeeTargetsCard } from "@/components/EmployeeTargetsCard";

export const Route = createFileRoute("/employee/")({
  component: EmployeeDashboard,
  head: () => ({ meta: [{ title: "My Dashboard · INT-CRM" }] }),
});

function EmployeeDashboard() {
  const { t } = useI18n();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const { leads, activities, projects, attendance, profile } = useStoreState();
  const user = { name: profile.name, role: t("employee"), initials: profile.name.split(" ").map(w => w[0]).join("") };

  const myIdentity = { profileId: profile.profileId, userId: profile.userId ?? authUser?.id, name: profile.name };
  const myLeads = leads.filter((l: any) => isLeadRelatedToEmployee(l, myIdentity));
  const myActivities = activities.filter((a) => a.owner === profile.name);
  const myProjects = filterMyProjects(projects as any, { profileId: profile.profileId, userId: profile.userId ?? authUser?.id, name: profile.name });

  // Fetch real target from profiles table (the profiles_directory view used by sync omits target fields)
  const targetQuery = useQuery({
    enabled: !!authUser?.id,
    queryKey: ["employee-dashboard-target", authUser?.id],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("target_value,target_type,annual_target")
        .eq("user_id", authUser!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Realtime: refresh target the moment an admin updates this user's profile.
  useEffect(() => {
    if (!authUser?.id) return;
    const channel = supabase
      .channel(`profile-target-${authUser.id}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${authUser.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["employee-dashboard-target", authUser.id] });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [authUser?.id, queryClient]);

  // Real target from profile + real achieved from this user's won leads in period.
  // Period math is centralized in lib/targetPeriod.ts so admin & employee views agree.
  const targetType = ((targetQuery.data?.target_type ?? profile.targetType ?? "yearly") as "yearly" | "quarterly" | "monthly");
  const annualTarget = Number((targetQuery.data as any)?.annual_target ?? targetQuery.data?.target_value ?? profile.targetValue ?? 0);
  const period = useMemo(() => computeTargetPeriod(targetType), [targetType]);
  const { periodName, psY, psM, psD, peY, peM, peD, periodStartIso, periodEndIso, deadlineLabel, countdownLabel } = period;

  const achievedTarget = sumWonInPeriod(myLeads as any, period);


  // -------- Real attendance for "today" --------
  const todayIso = new Date().toISOString().slice(0, 10);
  const myAttendance = useMemo(
    () => attendance.filter((a) => a.owner === profile.name),
    [attendance, profile.name],
  );
  const todayRec = myAttendance.find((a) => a.date === todayIso);

  // live tick so "working hours" updates each minute while checked in
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!todayRec || todayRec.checkOut) return;
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [todayRec?.id, todayRec?.checkOut]);

  const fmtTime12 = (hhmm: string) => {
    if (!hhmm) return { time: "—:—", suffix: "" };
    const [h, m] = hhmm.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    const hr = ((h + 11) % 12) + 1;
    return { time: `${String(hr).padStart(2, "0")}:${String(m).padStart(2, "0")}`, suffix };
  };
  const elapsedFrom = (checkIn: string, checkOut?: string) => {
    if (!checkIn) return "—";
    const [ih, im] = checkIn.split(":").map(Number);
    const start = new Date(); start.setHours(ih, im, 0, 0);
    const end = checkOut
      ? (() => { const [oh, om] = checkOut.split(":").map(Number); const d = new Date(); d.setHours(oh, om, 0, 0); return d; })()
      : new Date(nowTick);
    const mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
  };
  const inDisplay = fmtTime12(todayRec?.checkIn || "");
  const punctuality = (() => {
    if (!todayRec?.checkIn) return null;
    const [h, m] = todayRec.checkIn.split(":").map(Number);
    const mins = h * 60 + m;
    return mins <= 9 * 60 ? "On time" : "Late";
  })();

  const [attLoading, setAttLoading] = useState(false);
  async function getPos(): Promise<{ lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
      );
    });
  }

  async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`, {
        headers: { Accept: "application/json" },
      });
      if (!r.ok) return null;
      const j = await r.json();
      const a = j.address ?? {};
      return [a.suburb || a.neighbourhood || a.village, a.city || a.town || a.county, a.country].filter(Boolean).join(", ") || j.display_name || null;
    } catch {
      return null;
    }
  }

  function deviceSummary(): string {
    if (typeof navigator === "undefined") return "Unknown device";
    const ua = navigator.userAgent;
    const browser = /Edg\/|OPR\//.test(ua)
      ? (/Edg\//.test(ua) ? "Edge" : "Opera")
      : (/Firefox\//.test(ua) ? "Firefox"
        : /Chrome\//.test(ua) ? "Chrome"
        : /Safari\//.test(ua) ? "Safari" : "Browser");
    const os = /iPhone|iPad/.test(ua) ? "iOS"
      : /Android/.test(ua) ? "Android"
      : /Mac OS X/.test(ua) ? "macOS"
      : /Windows/.test(ua) ? "Windows"
      : /Linux/.test(ua) ? "Linux" : "Device";
    return `${browser} · ${os}`;
  }

  function withDevice(loc: string): string {
    const dev = deviceSummary();
    if (!loc) return `📱 ${dev}`;
    return loc.includes("📱") ? loc : `${loc} · 📱 ${dev}`;
  }
  const handleCheckIn = async () => {
    setAttLoading(true);
    const now = new Date().toTimeString().slice(0, 5);
    const pos = await getPos();
    const baseLoc = pos ? (await reverseGeocode(pos.lat, pos.lng)) || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}` : profile.location;
    const locName = withDevice(baseLoc || "");
    
    actions.addAttendance({
      date: todayIso, checkIn: now, checkOut: "", hours: "—",
      location: locName,
      owner: profile.name,
      lat: pos?.lat ?? null, lng: pos?.lng ?? null,
    });
    setAttLoading(false);
  };
  const handleCheckOut = async () => {
    if (!todayRec) return;
    setAttLoading(true);
    const now = new Date().toTimeString().slice(0, 5);
    const pos = await getPos();
    const [ih, im] = todayRec.checkIn.split(":").map(Number);
    const [oh, om] = now.split(":").map(Number);
    const mins = Math.max(0, oh * 60 + om - (ih * 60 + im));
    
    const patch: any = { 
      checkOut: now, 
      hours: `${(mins / 60).toFixed(1)}h`
    };
    
    if (pos) {
      const baseLoc = (await reverseGeocode(pos.lat, pos.lng)) || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
      patch.lat = pos.lat;
      patch.lng = pos.lng;
      patch.location = withDevice(baseLoc);
    } else {
      patch.location = withDevice(todayRec.location || "");
    }
    
    actions.updateAttendance(todayRec.id, patch);
    setAttLoading(false);
  };

  // -------- KPI Calculations --------
  // Present days this month (real)
  const nowLocal = new Date();
  const curYear = nowLocal.getFullYear();
  const curMonth = nowLocal.getMonth();
  const monthStart = new Date(curYear, curMonth, 1);
  const presentDays = myAttendance.filter((r) => new Date(r.date) >= monthStart).length;
  // working days = weekdays so far this month (Sun-Thu work week — Cairo default)
  const todayDay = nowLocal.getDate();
  let workingDays = 0;
  for (let d = 1; d <= todayDay; d++) {
    const wd = new Date(curYear, curMonth, d).getDay(); // 0=Sun..6=Sat
    if (wd !== 5 && wd !== 6) workingDays++; // exclude Fri/Sat
  }
  const attendanceRate = workingDays > 0 ? Math.min(100, (presentDays / workingDays) * 100) : 0;


  const totalActs = myActivities.length;
  const completedActs = myActivities.filter((a) => a.status === "done").length;
  const activityScore = totalActs > 0 ? (completedActs / totalActs) * 100 : 0;

  const achieveRate = annualTarget > 0 ? (achievedTarget / annualTarget) * 100 : 0;
  const targetScore = Math.min(100, achieveRate);

  const overallKpi = Math.round(targetScore * 0.5 + activityScore * 0.5);

  return (
    <AppShell panel="employee" user={user} pageTitle={`${t("welcome")}, ${(profile.name || "there").split(" ")[0]} 👋`}>
      {/* Check-in card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        {/* Accent: full-width strip on mobile, right-half on md+ */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 md:inset-y-0 md:h-auto md:w-1/2 md:opacity-90"
          style={{ insetInlineEnd: 0, background: "var(--gradient-brand)" }}
        />

        <div className="relative grid grid-cols-1 gap-5 p-5 md:grid-cols-3 md:items-center md:gap-4 md:p-6">
          {/* Status + meta */}
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              {todayRec ? (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  todayRec.checkOut
                    ? "bg-foreground/10 text-foreground"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}>
                  <span className="relative flex h-1.5 w-1.5">
                    {!todayRec.checkOut && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />}
                    <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${todayRec.checkOut ? "bg-foreground/60" : "bg-emerald-500"}`} />
                  </span>
                  {todayRec.checkOut ? "Checked out" : "Checked in"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Not checked in
                </span>
              )}
              <span className="text-[11px] font-medium uppercase tracking-widest text-foreground/80">
                {t("today")}{todayRec?.location ? ` · ${todayRec.location}` : profile.location ? ` · ${profile.location}` : ""}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <h2 className="font-display text-3xl font-bold leading-none tracking-tight text-foreground md:text-4xl">
                {inDisplay.time}
              </h2>
              {inDisplay.suffix && <span className="text-sm font-semibold text-foreground/80">{inDisplay.suffix}</span>}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/80">
              <span className="font-semibold text-foreground">{todayRec?.checkIn ? elapsedFrom(todayRec.checkIn, todayRec.checkOut) : "—"}</span>
              <span aria-hidden>•</span>
              <span>{t("workingHours")}</span>
              {punctuality && (
                <>
                  <span aria-hidden>•</span>
                  <span className={`font-semibold ${punctuality === "On time" ? "text-emerald-900 dark:text-emerald-300" : "text-[#cee3f8]"}`}>{punctuality}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="relative z-10 flex flex-col gap-2 md:items-end">
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur md:self-end">
              <MapPin className="h-3 w-3" />
              {todayRec?.lat != null ? "GPS Verified" : "GPS Pending"}
            </div>
            {!todayRec ? (
              <button
                type="button"
                disabled={attLoading}
                onClick={handleCheckIn}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background shadow-md transition active:scale-[0.98] hover:bg-foreground/90 disabled:opacity-60 md:w-auto"
              >
                {attLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {t("checkIn")}
              </button>
            ) : !todayRec.checkOut ? (
              <button
                type="button"
                disabled={attLoading}
                onClick={handleCheckOut}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background shadow-md transition active:scale-[0.98] hover:bg-foreground/90 disabled:opacity-60 md:w-auto"
              >
                {attLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                {t("checkOut")}
              </button>
            ) : (
              <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white md:w-auto">
                <Check className="h-4 w-4" /> Done for today
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile quick actions — horizontally scrollable on phones, hidden on md+ */}
      <div className="mt-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { to: "/employee/leads", label: "Add lead", icon: Plus, tone: "bg-primary text-primary-foreground" },
          { to: "/employee/attendance", label: "Attendance", icon: Clock4, tone: "bg-secondary text-foreground" },
          { to: "/employee/activities", label: "Activities", icon: CalendarCheck, tone: "bg-secondary text-foreground" },
          { to: "/employee/offers", label: "Offers", icon: FileBadge, tone: "bg-secondary text-foreground" },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.to + a.label}
              to={a.to}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold shadow-sm transition active:scale-[0.97] ${a.tone}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {a.label}
            </Link>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:mt-6 md:gap-4 xl:grid-cols-4">
        <KpiCard label={t("myLeads")} value={String(myLeads.length)} icon={Users} accent="primary" />
        <KpiCard label={t("myActivities")} value={String(myActivities.length)} icon={CalendarCheck} accent="info" />
        <KpiCard label={t("myProjects")} value={String(myProjects.length)} icon={Briefcase} accent="success" />
        <KpiCard label="Overall Score" value={`${overallKpi}%`} icon={Award} accent="warning" />
      </div>


      {/* Target Countdown */}
      <div className="mt-6">
        <TargetCountdown
          achieved={achievedTarget}
          target={annualTarget}
          periodStart={periodStartIso}
          deadline={periodEndIso}
          deadlineLabel={deadlineLabel}
          label={countdownLabel}
          isRefreshing={targetQuery.isFetching}
          lastUpdatedAt={targetQuery.dataUpdatedAt}
        />
      </div>

      {/* Employment & Targets (start date, annual, quarterly, weekly meetings) */}
      <div className="mt-6">
        <EmployeeTargetsCard
          userId={authUser?.id}
          profileId={profile.profileId}
          leads={myLeads as any}
          activities={myActivities as any}
        />
      </div>


      {/* Target & KPI Monitoring */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-base font-bold text-foreground mb-4">🎯 Target & KPI Monitoring</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Target Card */}
          <div className="rounded-lg bg-secondary/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{periodName}ly Sales Target</div>
              <TargetRefreshIndicator isRefreshing={targetQuery.isFetching} lastUpdatedAt={targetQuery.dataUpdatedAt} />
              <span className="text-[10px] font-semibold text-muted-foreground">{fmtCairoDate(psY, psM, psD)} → {fmtCairoDate(peY, peM, peD)}</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{periodName} Target:</span>
                <span className="font-bold text-foreground">{fmtMoney(annualTarget)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Achieved ({periodName.toLowerCase()}):</span>
                <span className="font-bold text-foreground">{fmtMoney(achievedTarget)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-bold text-foreground">{fmtMoney(Math.max(0, annualTarget - achievedTarget))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Achievement %:</span>
                <span className={`font-bold ${
                  achieveRate >= 100 ? "text-emerald-600" : achieveRate >= 75 ? "text-amber-600" : "text-rose-600"
                }`}>{achieveRate.toFixed(1)}%</span>
              </div>
            </div>
            {/* Achievement Bar */}
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full ${
                    achieveRate >= 100 ? "bg-emerald-500" : achieveRate >= 75 ? "bg-amber-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.min(100, achieveRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI Weightage & Breakdown */}
          <div className="rounded-lg bg-secondary/30 p-4 col-span-1 md:col-span-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Overall Performance Index</div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Overall KPI Gauge */}
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4" style={{ borderColor: overallKpi >= 100 ? '#10b981' : overallKpi >= 75 ? '#f59e0b' : '#ef4444' }}>
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-foreground">{overallKpi}%</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Score</div>
                </div>
              </div>
              {/* Score Breakdown List */}
              <div className="flex-1 w-full space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-muted-foreground">Target Achievement KPI (Weight: 50%)</span>
                    <span className="text-foreground">{Math.min(100, achieveRate).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, achieveRate)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-muted-foreground">Activity Performance (Weight: 50%)</span>
                    <span className="text-foreground">{activityScore.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary">
                    <div className="h-full bg-sky-500" style={{ width: `${activityScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* My leads */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{t("myLeads")}</h3>
            <button className="text-xs font-semibold text-primary hover:underline">{t("viewAll")}</button>
          </div>
          <div className="mt-4 divide-y divide-border">
            {myLeads.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {l.company.split(" ").slice(0, 2).map((w: string) => w[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-foreground">{l.company}</div>
                  <div className="text-xs text-muted-foreground">{l.contact} · {l.updatedAt}</div>
                </div>
                <span className="hidden font-mono text-sm font-bold text-foreground sm:inline">{fmtMoney(l.value)}</span>
                <StatusBadge status={l.status} label={t(l.status as any)} />
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming tasks — real personal data */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-foreground">{t("upcomingTasks")}</h3>
            <Link to="/employee/activities" className="text-[11px] font-semibold text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-4 space-y-3">
            {(() => {
              const today = new Date().toISOString().slice(0, 10);
              const upcoming = myActivities
                .filter((a) => a.status !== "done" && a.status !== "cancelled" && a.dueDate >= today)
                .sort((a, b) => (a.dueDate + (a.time || "")).localeCompare(b.dueDate + (b.time || "")))
                .slice(0, 4);
              if (upcoming.length === 0) {
                return (
                  <div className="rounded-lg bg-secondary/40 px-3 py-6 text-center text-xs text-muted-foreground">
                    No upcoming tasks
                  </div>
                );
              }
              const fmtDay = (iso: string) => {
                const d = new Date(iso);
                return { day: String(d.getDate()).padStart(2, "0"), mon: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase() };
              };
              return upcoming.map((a) => {
                const { day, mon } = fmtDay(a.dueDate);
                return (
                  <Link key={a.id} to="/employee/activities/$activityId" params={{ activityId: a.id }} className="flex items-start gap-3 rounded-lg bg-secondary/40 p-3 transition hover:bg-secondary/70">
                    <div className="flex h-10 w-11 flex-col items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                      <span className="text-sm leading-none">{day}</span>
                      <span className="opacity-80">{mon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{a.title}</div>
                      <div className="text-[11px] text-muted-foreground">{a.type}{a.time ? ` · ${a.time}` : ""}</div>
                    </div>
                  </Link>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </AppShell>
  );
}