import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Target, CheckSquare, CalendarCheck, Info, TrendingUp } from "lucide-react";

interface PerformanceGuideModalProps {
  open: boolean;
  onClose: () => void;
  /** Live data – pass the employee's actual KPI values for a personalised example */
  liveData?: {
    targetScore: number;
    activityScore: number;
    attendanceRate: number;
    overallKpi: number;
    tW: number;   // target weight %
    acW: number;  // activity weight %
    atW: number;  // attendance weight %
  };
  /** When true, adapts the text to "The employee's" instead of "Your". */
  isManagerView?: boolean;
}

export function PerformanceGuideModal({ open, onClose, liveData, isManagerView }: PerformanceGuideModalProps) {
  const tW = liveData?.tW ?? 75;
  const acW = liveData?.acW ?? 15;
  const atW = liveData?.atW ?? 10;

  const pillars = [
    {
      icon: Target,
      label: "Sales Achievement",
      tag: "Target KPI",
      color: "text-primary",
      bg: "bg-primary/10",
      bar: "bg-primary",
      weight: tW,
      score: liveData?.targetScore,
      description:
        "Measures how much of an Employee sales target has been achieved in the current period (monthly, quarterly, or yearly). Capped at 100%.",
      formula: `Won Revenue ÷ Period Target × 100`,
    },
    {
      icon: CheckSquare,
      label: "Activity Completion",
      tag: "Activity KPI",
      color: "text-sky-600",
      bg: "bg-sky-100",
      bar: "bg-sky-500",
      weight: acW,
      score: liveData?.activityScore,
      description: isManagerView
        ? "Measures how many of the scheduled activities the employee completed. If they have no activities, they get full marks."
        : "Measures how many of your scheduled activities you completed. If you have no activities, you get full marks.",
      formula: `Done Activities ÷ Total Activities × 100`,
    },
    {
      icon: CalendarCheck,
      label: "Attendance Rate",
      tag: "Attendance KPI",
      color: "text-emerald-600",
      bg: "bg-emerald-100",
      bar: "bg-emerald-500",
      weight: atW,
      score: liveData?.attendanceRate,
      description:
        "Measures how consistently an Employee has been logged attendance on working days (Mon–Thu) in the current period.",
      formula: `Present Days ÷ Working Days × 100`,
    },
  ];

  const overallKpi = liveData?.overallKpi ?? Math.round(
    (liveData?.targetScore ?? 0) * (tW / 100) +
    (liveData?.activityScore ?? 0) * (acW / 100) +
    (liveData?.attendanceRate ?? 0) * (atW / 100)
  );

  const scoreColor =
    overallKpi >= 100 ? "text-emerald-600" :
      overallKpi >= 75 ? "text-amber-500" :
        "text-rose-500";

  const scoreRing =
    overallKpi >= 100 ? "#10b981" :
      overallKpi >= 75 ? "#f59e0b" :
        "#ef4444";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* ── HEADER ── */}
        <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-br from-primary to-orange-500 px-6 pt-6 pb-10">
          {/* decorative circles */}
          <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-white/10" />

          <DialogHeader className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
              <Info className="h-3.5 w-3.5" />
              How It Works
            </div>
            <DialogTitle className="text-2xl font-extrabold text-white">
              📊 Performance Guide
            </DialogTitle>
            <p className="mt-1 text-sm text-white/80">
              Overall performance score is a <strong className="text-white">weighted composite</strong> of
              three KPI pillars. Each pillar has a configurable weight set by the admin.
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── LIVE SCORE (if data provided) ── */}
          {liveData && (
            <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/40 p-4">
              <div
                className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4"
                style={{ borderColor: scoreRing }}
              >
                <div className="text-center">
                  <div className={`font-mono text-xl font-extrabold ${scoreColor}`}>{overallKpi}%</div>
                  <div className="text-[9px] uppercase text-muted-foreground">Score</div>
                </div>
              </div>
              <div>
                <div className="font-semibold text-foreground text-sm">Current Overall Score</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Calculated from live target, activity, and attendance data for the current period.
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {overallKpi >= 100 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">🎉 Target Met</span>
                  )}
                  {overallKpi >= 75 && overallKpi < 100 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">⚠️ Near Target</span>
                  )}
                  {overallKpi < 75 && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">🔴 Needs Improvement</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── 3 PILLARS ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              The 3 KPI Pillars
            </h3>
            {pillars.map((p) => (
              <div
                key={p.tag}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${p.bg} ${p.color}`}>
                    <p.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-foreground text-sm">{p.label}</span>
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.bg} ${p.color}`}>{p.tag}</span>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 font-mono text-xs font-bold text-foreground">
                        Weight: {p.weight}%
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">{p.description}</p>

                    {/* Formula */}
                    <div className="mt-2 rounded-lg bg-secondary/60 px-3 py-1.5 font-mono text-[11px] text-foreground">
                      {p.formula}
                    </div>

                    {/* Live score bar */}
                    {p.score !== undefined && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${p.bar}`}
                            style={{ width: `${Math.min(p.score, 100)}%` }}
                          />
                        </div>
                        <span className={`shrink-0 font-mono text-xs font-bold ${p.color}`}>
                          {p.score}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── FORMULA ── */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              Overall Score Formula
            </div>
            <div className="rounded-lg bg-card border border-border px-4 py-3 font-mono text-xs text-foreground space-y-1">
              <div className="text-muted-foreground">// Each pillar score × its weight, summed together:</div>
              <div>
                <span className="text-primary">Overall</span>{" "}
                = (Sales × {tW}%) + (Activities × {acW}%) + (Attendance × {atW}%)
              </div>
              {liveData && (
                <div className="mt-1 border-t border-border pt-1 text-muted-foreground">
                  {"= "}({liveData.targetScore} × {(tW / 100).toFixed(2)}) + ({liveData.activityScore} × {(acW / 100).toFixed(2)}) + ({liveData.attendanceRate} × {(atW / 100).toFixed(2)})
                  {" = "}
                  <span className={`font-bold ${scoreColor}`}>{overallKpi}%</span>
                </div>
              )}
            </div>
          </div>

          {/* ── SCORE LEGEND ── */}
          <div>
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Score Legend
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Excellent", range: "≥ 100%", color: "bg-emerald-100 text-emerald-700 border-emerald-200", emoji: "🟢" },
                { label: "Good", range: "75 – 99%", color: "bg-amber-100 text-amber-700 border-amber-200", emoji: "🟡" },
                { label: "Needs Work", range: "< 75%", color: "bg-rose-100 text-rose-700 border-rose-200", emoji: "🔴" },
              ].map((s) => (
                <div key={s.label} className={`rounded-lg border p-3 text-center ${s.color}`}>
                  <div className="text-base">{s.emoji}</div>
                  <div className="mt-1 text-xs font-bold">{s.label}</div>
                  <div className="text-[11px] font-mono opacity-80">{s.range}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── TIPS ── */}
          <div className="rounded-xl bg-secondary/40 border border-border p-4 text-xs text-muted-foreground space-y-1.5">
            <div className="font-bold text-foreground text-sm mb-2">
              💡 Tips to Improve {isManagerView ? "the Employee's" : "Your"} Score
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Close more leads to push {isManagerView ? "the employee's" : "your"} <strong className="text-foreground">Sales score</strong> up — it has the highest weight.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
              <span>Mark {isManagerView ? "the" : "your"} activities as <strong className="text-foreground">Done</strong> to improve {isManagerView ? "the" : "your"} Activity Completion score.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <span>Log attendance every working day to keep {isManagerView ? "the" : "your"} <strong className="text-foreground">Attendance Rate</strong> at 100%.</span>
            </div>
          </div>

          {/* close button */}
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition hover:bg-primary/90"
          >
            Got it!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
