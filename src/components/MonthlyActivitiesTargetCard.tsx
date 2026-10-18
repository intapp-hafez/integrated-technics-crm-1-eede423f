import { useState, useMemo, useEffect } from "react";
import {
  Target,
  Pencil,
  Repeat,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Phone,
  Users2,
  Mail,
  Compass,
  FileCheck2,
  CalendarDays,
  Flame,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { cairoIsoDate, cairoYearMonth, CAIRO_TZ } from "@/lib/cairoTime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sbUpdateActivitiesTarget } from "@/lib/supabaseWrites";

export interface MonthlyActivitiesTargetConfig {
  monthlyTarget: number;
  week1Target: number;
  week2Target: number;
  week3Target: number;
  week4Target: number;
  repeatMonthly: boolean;
  activityTypes: string[]; // ["all"] or specific types
  updatedAt?: string;
}

export interface MonthlyActivitiesTargetCardProps {
  employeeId: string;
  employeeName?: string;
  activities: Array<{
    id?: string;
    type?: string;
    status?: string;
    dueDate?: string;
    createdAt?: string;
    title?: string;
    notes?: string;
  }>;
  canEdit?: boolean;
  onSelectWeekRange?: (startIso: string, endIso: string) => void;
  className?: string;
}

const STORAGE_KEY = (id: string) => `int-crm:emp-activities-target:${id}`;

const DEFAULT_CONFIG: MonthlyActivitiesTargetConfig = {
  monthlyTarget: 80,
  week1Target: 20,
  week2Target: 20,
  week3Target: 20,
  week4Target: 20,
  repeatMonthly: true,
  activityTypes: ["all"],
};

function loadStoredConfig(employeeId: string): MonthlyActivitiesTargetConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY(employeeId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
      };
    }
  } catch (e) {
    console.error("Failed to load activities target from localStorage", e);
  }
  return DEFAULT_CONFIG;
}

function saveStoredConfig(employeeId: string, cfg: MonthlyActivitiesTargetConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY(employeeId), JSON.stringify(cfg));
  } catch (e) {
    console.error("Failed to save activities target to localStorage", e);
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

export function MonthlyActivitiesTargetCard({
  employeeId,
  employeeName,
  activities,
  canEdit = true,
  onSelectWeekRange,
  className = "",
}: MonthlyActivitiesTargetCardProps) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [config, setConfig] = useState<MonthlyActivitiesTargetConfig>(() =>
    loadStoredConfig(employeeId),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const queryClient = useQueryClient();

  // Query database profile for activities target
  const targetQuery = useQuery({
    enabled: !!employeeId,
    queryKey: ["monthly-activities-target", employeeId],
    refetchInterval: 30_000,
    queryFn: async () => {
      try {
        let q = supabase
          .from("profiles")
          .select(
            "id,user_id,monthly_activities_target,activities_week1_target,activities_week2_target,activities_week3_target,activities_week4_target,activities_target_recurring,activities_target_types",
          );
        q = q.or(`id.eq.${employeeId},user_id.eq.${employeeId}`);
        const { data, error } = await q.maybeSingle();
        if (error) {
          console.warn("[supabase] fetch activities target error", error);
          return null;
        }
        return data as any;
      } catch (e) {
        console.warn("[supabase] target query catch", e);
        return null;
      }
    },
  });

  // Hydrate config from DB when available
  useEffect(() => {
    if (
      targetQuery.data &&
      (targetQuery.data.monthly_activities_target !== null ||
        targetQuery.data.activities_week1_target !== null)
    ) {
      const fromDb: MonthlyActivitiesTargetConfig = {
        monthlyTarget: Number(targetQuery.data.monthly_activities_target ?? 80),
        week1Target: Number(targetQuery.data.activities_week1_target ?? 20),
        week2Target: Number(targetQuery.data.activities_week2_target ?? 20),
        week3Target: Number(targetQuery.data.activities_week3_target ?? 20),
        week4Target: Number(targetQuery.data.activities_week4_target ?? 20),
        repeatMonthly: targetQuery.data.activities_target_recurring !== false,
        activityTypes: targetQuery.data.activities_target_types ?? ["all"],
      };
      setConfig(fromDb);
      saveStoredConfig(employeeId, fromDb);
    }
  }, [targetQuery.data, employeeId]);

  // Real-time Postgres changes listener
  useEffect(() => {
    if (!employeeId) return;
    const channel = supabase
      .channel(`emp-act-target-rt-${employeeId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${employeeId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["monthly-activities-target", employeeId],
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [employeeId, queryClient]);

  // Sync local state if employeeId changes
  useEffect(() => {
    setConfig(loadStoredConfig(employeeId));
  }, [employeeId]);

  // Cairo calendar calculation for current & selected month
  const todayIso = cairoIsoDate();
  const { year: currentYear, month0: currentMonth0 } = cairoYearMonth();

  const selectedDate = useMemo(() => {
    const d = new Date(Date.UTC(currentYear, currentMonth0 + monthOffset, 1, 12, 0, 0));
    return {
      year: d.getUTCFullYear(),
      month0: d.getUTCMonth(),
    };
  }, [currentYear, currentMonth0, monthOffset]);

  const { year, month0 } = selectedDate;
  const isCurrentMonth = monthOffset === 0;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const monthLabel = useMemo(() => {
    const d = new Date(Date.UTC(year, month0, 1, 12, 0, 0));
    return d.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
      month: "long",
      year: "numeric",
      timeZone: CAIRO_TZ,
    });
  }, [year, month0, isAr]);

  // Define 4 weeks boundaries for the month:
  // Week 1: 1–7
  // Week 2: 8–14
  // Week 3: 15–21
  // Week 4: 22–End of month (28..31)
  const mStr = pad(month0 + 1);
  const weekRanges = useMemo(() => {
    return [
      {
        weekNum: 1,
        startDay: 1,
        endDay: 7,
        startIso: `${year}-${mStr}-01`,
        endIso: `${year}-${mStr}-07`,
        target: config.week1Target,
      },
      {
        weekNum: 2,
        startDay: 8,
        endDay: 14,
        startIso: `${year}-${mStr}-08`,
        endIso: `${year}-${mStr}-14`,
        target: config.week2Target,
      },
      {
        weekNum: 3,
        startDay: 15,
        endDay: 21,
        startIso: `${year}-${mStr}-15`,
        endIso: `${year}-${mStr}-21`,
        target: config.week3Target,
      },
      {
        weekNum: 4,
        startDay: 22,
        endDay: daysInMonth,
        startIso: `${year}-${mStr}-22`,
        endIso: `${year}-${mStr}-${pad(daysInMonth)}`,
        target: config.week4Target,
      },
    ];
  }, [year, mStr, daysInMonth, config]);

  // Filter activities for this month
  const monthStartIso = `${year}-${mStr}-01`;
  const monthEndIso = `${year}-${mStr}-${pad(daysInMonth)}`;

  // Filter by activity type scope if configured
  const scopedActivities = useMemo(() => {
    const hasAll = config.activityTypes.includes("all") || config.activityTypes.length === 0;
    return activities.filter((a) => {
      if (hasAll) return true;
      const type = (a.type || "").toLowerCase();
      return config.activityTypes.some((t) => t.toLowerCase() === type);
    });
  }, [activities, config.activityTypes]);

  // Compute stats for each week
  const weekStats = useMemo(() => {
    return weekRanges.map((wk) => {
      const wkActs = scopedActivities.filter((a) => {
        const rawDate = a.dueDate || a.createdAt;
        if (!rawDate) return false;
        const actIso = rawDate.slice(0, 10);
        return actIso >= wk.startIso && actIso <= wk.endIso;
      });

      const completedActs = wkActs.filter((a) => a.status === "done");
      const inProgressActs = wkActs.filter((a) => a.status === "in_progress" || a.status === "pending");

      // Count by type
      const typeCounts: Record<string, number> = {};
      completedActs.forEach((a) => {
        const t = a.type || "Other";
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });

      // Week status
      let weekStatus: "completed" | "current" | "upcoming" | "past";
      if (!isCurrentMonth) {
        weekStatus = monthOffset < 0 ? "past" : "upcoming";
      } else {
        if (todayIso > wk.endIso) {
          weekStatus = "past";
        } else if (todayIso >= wk.startIso && todayIso <= wk.endIso) {
          weekStatus = "current";
        } else {
          weekStatus = "upcoming";
        }
      }

      const achieved = completedActs.length;
      const pct = wk.target > 0 ? Math.min(100, Math.round((achieved / wk.target) * 100)) : achieved > 0 ? 100 : 0;
      const isMet = wk.target > 0 ? achieved >= wk.target : achieved > 0;

      return {
        ...wk,
        allCount: wkActs.length,
        completedCount: achieved,
        inProgressCount: inProgressActs.length,
        pct,
        isMet,
        weekStatus,
        typeCounts,
      };
    });
  }, [weekRanges, scopedActivities, isCurrentMonth, monthOffset, todayIso]);

  // Overall monthly stats
  const totalCompletedInMonth = useMemo(() => {
    return weekStats.reduce((acc, w) => acc + w.completedCount, 0);
  }, [weekStats]);

  const totalMonthlyTarget = config.monthlyTarget;
  const monthlyPct =
    totalMonthlyTarget > 0
      ? Math.min(100, Math.round((totalCompletedInMonth / totalMonthlyTarget) * 100))
      : 0;

  // Month pacing (expected percentage based on current day of month)
  const currentDay = isCurrentMonth ? Number(todayIso.slice(8, 10)) : daysInMonth;
  const expectedPacePct = Math.round((currentDay / daysInMonth) * 100);
  const isPaceGood = monthlyPct >= expectedPacePct - 5;

  const handleSaveConfig = async (newConfig: MonthlyActivitiesTargetConfig) => {
    setConfig(newConfig);
    saveStoredConfig(employeeId, newConfig);
    setIsEditing(false);

    try {
      await sbUpdateActivitiesTarget(employeeId, newConfig);
      void queryClient.invalidateQueries({
        queryKey: ["monthly-activities-target", employeeId],
      });
      toast.success(
        isAr
          ? "تم حفظ هدف الأنشطة الشهري وتكراره بنجاح ومزامنته"
          : "Monthly activities target saved & synced to database!",
      );
    } catch (e: any) {
      console.warn("Backend update error, saved locally:", e);
      toast.success(
        isAr
          ? "تم حفظ هدف الأنشطة الشهري وتكراره بنجاح"
          : "Monthly activities target saved successfully!",
      );
    }
  };

  return (
    <div
      className={`rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                  {isAr ? "هدف الأنشطة الشهري (مقسم 4 أسابيع)" : "Monthly Activities Target"}
                </h3>
                {config.repeatMonthly && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary"
                    title={
                      isAr
                        ? "يتكرر هذا الهدف تلقائياً كل شهر"
                        : "This target repeats automatically every month"
                    }
                  >
                    <Repeat className="h-3 w-3" />
                    {isAr ? "يتكرر شهرياً" : "Repeats Monthly"}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr
                  ? "متابعة أداء الموظف أسبوعياً على مدار الشهر بناءً على الهدف المحدد"
                  : "Track weekly activity milestones across 4 weeks with monthly recurrence"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Month Navigation */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
            <button
              onClick={() => setMonthOffset((m) => m - 1)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition"
              title={isAr ? "الشهر السابق" : "Previous Month"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[110px] text-center text-xs font-bold text-foreground px-1">
              {monthLabel}
            </span>
            <button
              onClick={() => setMonthOffset((m) => m + 1)}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition"
              title={isAr ? "الشهر القادم" : "Next Month"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {monthOffset !== 0 && (
              <button
                onClick={() => setMonthOffset(0)}
                className="rounded px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10 transition"
              >
                {isAr ? "الحالي" : "Today"}
              </button>
            )}
          </div>

          {/* Edit Button for Admin */}
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" />
              <span>{isAr ? "تعديل الهدف" : "Edit Target"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Monthly Summary Banner */}
      <div className="mt-5 rounded-xl bg-gradient-to-br from-secondary/40 via-secondary/20 to-secondary/10 border border-border/80 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {isAr ? `إجمالي شهر ${monthLabel}` : `Total for ${monthLabel}`}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-foreground tracking-tight" dir="ltr">
                {totalCompletedInMonth}
                <span className="text-muted-foreground text-xl font-medium">
                  {" "}/ {totalMonthlyTarget}
                </span>
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  monthlyPct >= 100
                    ? "bg-emerald-500/15 text-emerald-600"
                    : monthlyPct >= 75
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-primary/15 text-primary"
                }`}
              >
                {monthlyPct >= 100 && <Sparkles className="h-3 w-3" />}
                {monthlyPct}% {isAr ? "مكتمل" : "Achieved"}
              </span>
            </div>
          </div>

          {/* Pacing Info */}
          <div className="flex items-center gap-4 text-xs">
            {isCurrentMonth ? (
              <div className="rounded-lg bg-background/80 border border-border px-3 py-2 flex items-center gap-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    {isAr ? "سرعة الإنجاز" : "Pacing Status"}
                  </div>
                  <div
                    className={`font-semibold flex items-center gap-1 ${
                      isPaceGood ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {isPaceGood ? (
                      <>
                        <TrendingUp className="h-3.5 w-3.5" />
                        {isAr ? "على المسار الصحيح" : "On Track"}
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5" />
                        {isAr ? "بحاجة لتسريع الأنشطة" : "Needs Acceleration"}
                      </>
                    )}
                  </div>
                </div>
                <div className="border-s border-border ps-3 space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    {isAr ? "اليوم من الشهر" : "Month Day"}
                  </div>
                  <div className="font-bold text-foreground">
                    {currentDay} / {daysInMonth}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-background/80 border border-border px-3 py-2 text-muted-foreground text-xs font-medium">
                {monthOffset < 0
                  ? isAr
                    ? "شهر سابق (مؤرشف)"
                    : "Archived Past Month"
                  : isAr
                    ? "شهر مستقبلي (مخطط له)"
                    : "Future Planned Month"}
              </div>
            )}
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-muted-foreground">
              {isAr ? "نسبة إنجاز الهدف الشهري" : "Monthly Target Progress"}
            </span>
            <span className="text-foreground font-mono">
              {totalCompletedInMonth} / {totalMonthlyTarget} (
              {Math.max(0, totalMonthlyTarget - totalCompletedInMonth)}{" "}
              {isAr ? "متبقي" : "remaining"})
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-secondary/80 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                monthlyPct >= 100
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : monthlyPct >= 70
                    ? "bg-gradient-to-r from-primary to-primary/80"
                    : "bg-gradient-to-r from-amber-500 to-amber-400"
              }`}
              style={{ width: `${Math.min(100, monthlyPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Weeks Breakdown Grid */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            {isAr ? "تفصيل الأسابيع الأربعة" : "4-Week Breakdown"}
          </h4>
          <span className="text-xs text-muted-foreground">
            {isAr ? "الأسبوع = 7 أيام" : "Divided into 4 consecutive weekly milestones"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {weekStats.map((wk) => {
            const isCurrent = wk.weekStatus === "current";
            const isCompleted = wk.pct >= 100;
            const weekTitle = isAr ? `الأسبوع ${wk.weekNum}` : `Week ${wk.weekNum}`;
            const dateRangeText = `${wk.startDay} – ${wk.endDay} ${monthLabel.split(" ")[0]}`;

            return (
              <div
                key={wk.weekNum}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${
                  isCurrent
                    ? "bg-card border-primary ring-2 ring-primary/20 shadow-md -translate-y-0.5"
                    : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
                }`}
              >
                {/* Badge for Current Week */}
                {isCurrent && (
                  <div className="absolute -top-2.5 end-3 z-10">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow">
                      <Flame className="h-2.5 w-2.5 fill-current" />
                      {isAr ? "الأسبوع الحالي" : "Current Week"}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-display text-sm font-bold text-foreground">
                        {weekTitle}
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground" dir="ltr">
                        {dateRangeText}
                      </div>
                    </div>
                    {isCompleted ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary animate-pulse">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-muted-foreground uppercase bg-secondary/50 px-1.5 py-0.5 rounded">
                        {isAr ? `هدف: ${wk.target}` : `Target: ${wk.target}`}
                      </div>
                    )}
                  </div>

                  {/* Numbers */}
                  <div className="my-3">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-2xl font-black text-foreground tracking-tight" dir="ltr">
                        {wk.completedCount}
                        <span className="text-muted-foreground text-base font-semibold">
                          {" "}/ {wk.target}
                        </span>
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          wk.pct >= 100
                            ? "text-emerald-600"
                            : wk.pct >= 60
                              ? "text-primary"
                              : "text-rose-500"
                        }`}
                        dir="ltr"
                      >
                        {wk.pct}%
                      </span>
                    </div>

                    {/* Week Progress Bar */}
                    <div className="mt-2 h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          wk.pct >= 100
                            ? "bg-emerald-500"
                            : wk.pct >= 60
                              ? "bg-primary"
                              : isCurrent
                                ? "bg-amber-500"
                                : "bg-muted-foreground/30"
                        }`}
                        style={{ width: `${Math.min(100, wk.pct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Activity Types breakdown in this week */}
                  <div className="mt-3 space-y-1 pt-2 border-t border-border/60">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
                      {isAr ? "الأنشطة المكتملة:" : "Completed by Type:"}
                    </div>
                    {Object.keys(wk.typeCounts).length === 0 ? (
                      <span className="text-[11px] text-muted-foreground italic">
                        {isAr ? "لا توجد أنشطة مكتملة" : "No completed activities"}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(wk.typeCounts).map(([type, count]) => (
                          <span
                            key={type}
                            className="inline-flex items-center gap-1 rounded bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold text-foreground"
                          >
                            {renderTypeIcon(type)}
                            <span>{type}:</span>
                            <span className="font-bold">{count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Week Footer Action */}
                <div className="mt-4 pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {wk.inProgressCount > 0
                      ? `${wk.inProgressCount} ${isAr ? "قيد التنفيذ" : "in progress"}`
                      : wk.isMet
                        ? isAr
                          ? "تم تحقيق الهدف ✓"
                          : "Goal reached ✓"
                        : `${Math.max(0, wk.target - wk.completedCount)} ${isAr ? "متبقي" : "needed"}`}
                  </span>
                  {onSelectWeekRange && (
                    <button
                      onClick={() => onSelectWeekRange(wk.startIso, wk.endIso)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <span>{isAr ? "عرض" : "View"}</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recurrence Explainer Footer */}
      <div className="mt-5 rounded-lg bg-secondary/30 p-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary shrink-0" />
          <span>
            {config.repeatMonthly
              ? isAr
                ? "ميزة التكرار الشهري مفعّلة: يتكرر هذا الهدف أسبوعياً كل شهر تلقائياً."
                : "Monthly recurrence is active: this 4-week target automatically applies to each month."
              : isAr
                ? "التكرار الشهري غير مفعّل: الهدف مخصص لهذا الشهر فقط."
                : "Recurrence is off: target applies only to this specific month."}
          </span>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-primary font-semibold hover:underline shrink-0"
          >
            {isAr ? "تغيير الإعدادات" : "Change settings"}
          </button>
        )}
      </div>

      {/* Edit Target Modal */}
      {isEditing && (
        <EditMonthlyActivitiesTargetModal
          initialConfig={config}
          employeeName={employeeName}
          onClose={() => setIsEditing(false)}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}

function renderTypeIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("call")) return <Phone className="h-2.5 w-2.5 text-blue-500" />;
  if (t.includes("meet")) return <Users2 className="h-2.5 w-2.5 text-emerald-500" />;
  if (t.includes("email") || t.includes("mail")) return <Mail className="h-2.5 w-2.5 text-purple-500" />;
  if (t.includes("visit") || t.includes("site")) return <Compass className="h-2.5 w-2.5 text-amber-500" />;
  return <FileCheck2 className="h-2.5 w-2.5 text-primary" />;
}

// -------------------------------------------------------------------------------------------------
// Modal to configure the monthly activities target and 4-week division
// -------------------------------------------------------------------------------------------------

interface EditMonthlyActivitiesTargetModalProps {
  initialConfig: MonthlyActivitiesTargetConfig;
  employeeName?: string;
  onClose: () => void;
  onSave: (config: MonthlyActivitiesTargetConfig) => void;
}

export function EditMonthlyActivitiesTargetModal({
  initialConfig,
  employeeName,
  onClose,
  onSave,
}: EditMonthlyActivitiesTargetModalProps) {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [monthlyTarget, setMonthlyTarget] = useState<number>(initialConfig.monthlyTarget || 80);
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [week1, setWeek1] = useState<number>(initialConfig.week1Target ?? 20);
  const [week2, setWeek2] = useState<number>(initialConfig.week2Target ?? 20);
  const [week3, setWeek3] = useState<number>(initialConfig.week3Target ?? 20);
  const [week4, setWeek4] = useState<number>(initialConfig.week4Target ?? 20);
  const [repeatMonthly, setRepeatMonthly] = useState<boolean>(
    initialConfig.repeatMonthly !== false,
  );
  const [activityScope, setActivityScope] = useState<"all" | "custom">(
    initialConfig.activityTypes.includes("all") ? "all" : "custom",
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    initialConfig.activityTypes.includes("all")
      ? ["Call", "Meeting", "Email", "Site Visit"]
      : initialConfig.activityTypes,
  );

  // When monthly target changes in equal split mode, distribute equally
  const handleMonthlyChange = (val: number) => {
    const num = Math.max(0, val);
    setMonthlyTarget(num);
    if (splitMode === "equal") {
      const q = Math.floor(num / 4);
      const rem = num % 4;
      setWeek1(q);
      setWeek2(q);
      setWeek3(q);
      setWeek4(q + rem); // put remainder into week 4
    }
  };

  const handleEqualize = () => {
    const q = Math.floor(monthlyTarget / 4);
    const rem = monthlyTarget % 4;
    setWeek1(q);
    setWeek2(q);
    setWeek3(q);
    setWeek4(q + rem);
    setSplitMode("equal");
  };

  const currentTotalWeeks = week1 + week2 + week3 + week4;
  const isMatch = currentTotalWeeks === monthlyTarget;

  const handlePreset = (presetMonthly: number) => {
    setMonthlyTarget(presetMonthly);
    const q = Math.floor(presetMonthly / 4);
    setWeek1(q);
    setWeek2(q);
    setWeek3(q);
    setWeek4(q);
    setSplitMode("equal");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (monthlyTarget <= 0) {
      toast.error(isAr ? "يرجى تحديد هدف شهري أكبر من صفر" : "Please set a target greater than 0");
      return;
    }

    const finalConfig: MonthlyActivitiesTargetConfig = {
      monthlyTarget,
      week1Target: week1,
      week2Target: week2,
      week3Target: week3,
      week4Target: week4,
      repeatMonthly,
      activityTypes: activityScope === "all" ? ["all"] : selectedTypes,
      updatedAt: new Date().toISOString(),
    };

    onSave(finalConfig);
  };

  const allActivityTypes = ["Call", "Meeting", "Site Visit", "Email", "Follow-up", "Inspection"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {isAr ? "تحديد هدف الأنشطة الشهري" : "Set Monthly Activities Target"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {employeeName ? `${employeeName} · ` : ""}
                {isAr ? "تقسيم 4 أسابيع مع التكرار التلقائي" : "Divided into 4 weeks with monthly recurrence"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* 1. Monthly Total Target */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              {isAr ? "1. هدف الأنشطة الإجمالي للشهر:" : "1. Total Monthly Activities Target:"}
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={monthlyTarget}
                  onChange={(e) => handleMonthlyChange(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-base font-bold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  placeholder="e.g. 80"
                  required
                />
                <span className="absolute end-3 top-2.5 text-xs text-muted-foreground pointer-events-none">
                  {isAr ? "نشاط / شهر" : "activities / mo"}
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground me-1">
                {isAr ? "نماذج سريعة:" : "Quick presets:"}
              </span>
              {[40, 60, 80, 100, 120].map((num) => (
                <button
                  type="button"
                  key={num}
                  onClick={() => handlePreset(num)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    monthlyTarget === num
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {num} ({num / 4}/wk)
                </button>
              ))}
            </div>
          </div>

          {/* 2. 4 Weeks Division */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                {isAr ? "2. تقسيم الهدف على 4 أسابيع:" : "2. 4-Week Target Division:"}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEqualize}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {isAr ? "توزيع متساوي (25% لكل أسبوع)" : "Split Equally (25% each)"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Week 1 */}
              <div className="rounded-xl border border-border bg-secondary/20 p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  {isAr ? "الأسبوع 1 (1–7)" : "Week 1 (1–7)"}
                </span>
                <input
                  type="number"
                  min={0}
                  value={week1}
                  onChange={(e) => {
                    setWeek1(Number(e.target.value));
                    setSplitMode("custom");
                  }}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm font-bold font-mono focus:border-primary focus:outline-none"
                  required
                />
              </div>

              {/* Week 2 */}
              <div className="rounded-xl border border-border bg-secondary/20 p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  {isAr ? "الأسبوع 2 (8–14)" : "Week 2 (8–14)"}
                </span>
                <input
                  type="number"
                  min={0}
                  value={week2}
                  onChange={(e) => {
                    setWeek2(Number(e.target.value));
                    setSplitMode("custom");
                  }}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm font-bold font-mono focus:border-primary focus:outline-none"
                  required
                />
              </div>

              {/* Week 3 */}
              <div className="rounded-xl border border-border bg-secondary/20 p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  {isAr ? "الأسبوع 3 (15–21)" : "Week 3 (15–21)"}
                </span>
                <input
                  type="number"
                  min={0}
                  value={week3}
                  onChange={(e) => {
                    setWeek3(Number(e.target.value));
                    setSplitMode("custom");
                  }}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm font-bold font-mono focus:border-primary focus:outline-none"
                  required
                />
              </div>

              {/* Week 4 */}
              <div className="rounded-xl border border-border bg-secondary/20 p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  {isAr ? "الأسبوع 4 (22–31)" : "Week 4 (22–31)"}
                </span>
                <input
                  type="number"
                  min={0}
                  value={week4}
                  onChange={(e) => {
                    setWeek4(Number(e.target.value));
                    setSplitMode("custom");
                  }}
                  className="h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm font-bold font-mono focus:border-primary focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Sum Indicator */}
            <div
              className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${
                isMatch
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
              }`}
            >
              <span>
                {isAr ? "مجموع الأسابيع: " : "Weeks Total: "}
                <strong className="font-mono">{currentTotalWeeks}</strong> / {monthlyTarget}
              </span>
              <span>
                {isMatch
                  ? isAr
                    ? "✓ متطابق 100%"
                    : "✓ 100% matched"
                  : isAr
                    ? `فارق (${currentTotalWeeks - monthlyTarget > 0 ? "+" : ""}${currentTotalWeeks - monthlyTarget})`
                    : `Difference: (${currentTotalWeeks - monthlyTarget > 0 ? "+" : ""}${currentTotalWeeks - monthlyTarget})`}
              </span>
            </div>
          </div>

          {/* 3. Monthly Recurrence Toggle */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={repeatMonthly}
                onChange={(e) => setRepeatMonthly(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Repeat className="h-4 w-4 text-primary" />
                  {isAr
                    ? "تكرار هذا الهدف تلقائياً كل شهر"
                    : "Repeat this target automatically each month"}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr
                    ? "عند تفعيل هذا الخيار، سيتم تطبيق نفس الهدف وتقسيم الـ 4 أسابيع على جميع الشهور القادمة تلقائياً دون الحاجة لإعادة إدخاله كل شهر."
                    : "When enabled, this 4-week activities plan will automatically apply to every subsequent month without needing monthly setup."}
                </p>
              </div>
            </label>
          </div>

          {/* 4. Activity Types Scope */}
          <div className="space-y-2.5 pt-2 border-t border-border">
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
              {isAr ? "4. أنواع الأنشطة المشمولة:" : "4. Included Activity Types:"}
            </label>
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="activityScope"
                  checked={activityScope === "all"}
                  onChange={() => setActivityScope("all")}
                  className="text-primary focus:ring-primary"
                />
                <span>{isAr ? "جميع الأنشطة (مكالمات، اجتماعات، زيارات، إلخ)" : "All Activity Types"}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="activityScope"
                  checked={activityScope === "custom"}
                  onChange={() => setActivityScope("custom")}
                  className="text-primary focus:ring-primary"
                />
                <span>{isAr ? "أنواع محددة فقط" : "Specific Types Only"}</span>
              </label>
            </div>

            {activityScope === "custom" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {allActivityTypes.map((type) => {
                  const isSelected = selectedTypes.includes(type);
                  return (
                    <button
                      type="button"
                      key={type}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTypes(selectedTypes.filter((t) => t !== type));
                        } else {
                          setSelectedTypes([...selectedTypes, type]);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {renderTypeIcon(type)}
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent transition"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition"
            >
              {isAr ? "حفظ الهدف" : "Save Target"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
