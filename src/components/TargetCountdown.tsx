import { useEffect, useState } from "react";
import { Clock, RefreshCw, Target, TrendingUp } from "lucide-react";
import { fmtMoney } from "@/lib/mock-data";

interface Props {
  achieved: number;
  target: number;
  /** Optional deadline ISO date. Defaults to end of current year. */
  deadline?: string;
  /** Optional period start ISO date. Defaults to start of current year. */
  periodStart?: string;
  /** Custom deadline subtitle (e.g. "Quarter ends · Sep 30, 2026"). */
  deadlineLabel?: string;
  /** Compact variant for embedding into details pages */
  compact?: boolean;
  label?: string;
  isRefreshing?: boolean;
  lastUpdatedAt?: number;
  refreshIntervalMs?: number;
}

type Tone = "green" | "yellow" | "red";

function toneClasses(tone: Tone) {
  switch (tone) {
    case "green":
      return {
        accent: "bg-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
        chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
        statusText: "On Track",
        indicatorBar: "bg-emerald-500",
      };
    case "yellow":
      return {
        accent: "bg-amber-500",
        text: "text-amber-600 dark:text-amber-400",
        chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
        statusText: "Watch Pacing",
        indicatorBar: "bg-amber-500",
      };
    case "red":
      return {
        accent: "bg-rose-500",
        text: "text-rose-600 dark:text-rose-400",
        chip: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25",
        statusText: "Action Needed",
        indicatorBar: "bg-rose-500",
      };
  }
}

function computeTone(achievePct: number, elapsedPct: number, daysLeft: number): Tone {
  const delta = achievePct - elapsedPct;
  if (achievePct >= 100) return "green";
  if (daysLeft <= 7 && achievePct < 90) return "red";
  if (delta >= -5) return "green";
  if (delta >= -15) return "yellow";
  return "red";
}

export function TargetRefreshIndicator({
  isRefreshing,
  lastUpdatedAt,
  refreshIntervalMs = 30_000,
  className = "",
}: {
  isRefreshing?: boolean;
  lastUpdatedAt?: number;
  refreshIntervalMs?: number;
  className?: string;
}) {
  const [now, setNow] = useState(() => lastUpdatedAt ?? 0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const hasUpdate = mounted && typeof lastUpdatedAt === "number" && lastUpdatedAt > 0;
  const elapsedMs = hasUpdate ? Math.max(0, now - lastUpdatedAt) : 0;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const nextSec = hasUpdate
    ? Math.max(0, Math.ceil((refreshIntervalMs - elapsedMs) / 1000))
    : Math.ceil(refreshIntervalMs / 1000);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      <RefreshCw
        className={`h-3 w-3 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`}
      />
      {isRefreshing
        ? "Refreshing…"
        : hasUpdate
          ? `Updated ${elapsedSec}s ago · next ${nextSec}s`
          : `Syncs every ${Math.ceil(refreshIntervalMs / 1000)}s`}
    </span>
  );
}

export function TargetCountdown({
  achieved,
  target,
  deadline,
  periodStart,
  deadlineLabel,
  compact,
  label,
  isRefreshing,
  lastUpdatedAt,
  refreshIntervalMs = 30_000,
}: Props) {
  const endIso = deadline ?? `${new Date().getFullYear()}-12-31T23:59:59`;
  const startIso = periodStart ?? `${new Date().getFullYear()}-01-01T00:00:00`;
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  const [now, setNow] = useState<number>(() => endMs);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, endMs - now);
  const totalMs = Math.max(1, endMs - startMs);
  const elapsedPct = Math.min(100, Math.max(0, ((now - startMs) / totalMs) * 100));

  const sec = Math.floor(remainingMs / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const achievePct = target > 0 ? Math.min(999, (achieved / target) * 100) : 0;
  const tone = computeTone(achievePct, elapsedPct, days);
  const c = toneClasses(tone);
  const remaining = Math.max(0, target - achieved);

  const Cell = ({ v, l, isFirst }: { v: number; l: string; isFirst?: boolean }) => (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900 dark:bg-slate-800 text-white px-3 py-2.5 sm:px-4 sm:py-3 min-w-[62px] sm:min-w-[72px] shadow-sm border border-slate-800 dark:border-slate-700/60 transition-transform hover:scale-105">
      <span
        className={`font-mono text-2xl sm:text-3xl font-black tabular-nums tracking-tight ${
          isFirst ? "text-amber-400" : "text-slate-100"
        }`}
      >
        {mounted ? String(v).padStart(2, "0") : "--"}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
        {l}
      </span>
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)] hover:shadow-md transition-shadow">
      {/* Accent left indicator line */}
      <div className={`absolute inset-y-0 start-0 w-1.5 ${c.indicatorBar}`} />

      <div className="space-y-5">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  {label ?? "Annual Sales Target"}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${c.chip}`}
                >
                  <Clock className="h-3 w-3" />
                  {c.statusText}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {deadlineLabel ??
                  `Deadline · ${new Date(endIso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TargetRefreshIndicator
              isRefreshing={isRefreshing}
              lastUpdatedAt={lastUpdatedAt}
              refreshIntervalMs={refreshIntervalMs}
            />
          </div>
        </div>

        {/* Countdown Ticker & Key Financials */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center pt-1">
          {/* Countdown Clock Tiles (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-wrap items-center justify-start sm:justify-center gap-2 sm:gap-2.5">
            <Cell v={days} l="Days" isFirst />
            <span className="hidden sm:inline text-2xl font-black text-muted-foreground/40">:</span>
            <Cell v={hours} l="Hours" />
            <span className="hidden sm:inline text-2xl font-black text-muted-foreground/40">:</span>
            <Cell v={minutes} l="Mins" />
            <span className="hidden sm:inline text-2xl font-black text-muted-foreground/40">:</span>
            <Cell v={seconds} l="Secs" />
          </div>

          {/* Financial summary metrics (5 cols on lg) */}
          {!compact && (
            <div className="lg:col-span-5 grid grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-s border-border/70 pt-4 lg:pt-0 lg:ps-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Achieved
                </div>
                <div className="font-mono text-base sm:text-lg font-black text-foreground mt-0.5">
                  {fmtMoney(achieved)}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {achievePct.toFixed(1)}% achieved
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Remaining
                </div>
                <div className={`font-mono text-base sm:text-lg font-black mt-0.5 ${c.text}`}>
                  {fmtMoney(remaining)}
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">To hit target</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Target Goal
                </div>
                <div className="font-mono text-base sm:text-lg font-black text-foreground mt-0.5">
                  {fmtMoney(target)}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-primary font-bold">
                  <TrendingUp className="h-3 w-3" /> Period
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dual Pacing Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-muted-foreground">
              Achievement Progress ({achievePct.toFixed(1)}%)
            </span>
            <span className="text-foreground font-mono text-xs">
              Time Elapsed: <strong className="text-foreground">{elapsedPct.toFixed(0)}%</strong> (
              {days}d left)
            </span>
          </div>

          <div className="relative h-2.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${c.accent} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, achievePct)}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-1 bg-foreground rounded-full shadow-xs"
              style={{ left: `${Math.min(100, elapsedPct)}%` }}
              title={`Time elapsed: ${elapsedPct.toFixed(0)}%`}
            />
          </div>

          <div className="flex justify-between text-[10px] text-muted-foreground font-medium pt-0.5">
            <span>0% achieved</span>
            <span className="hidden sm:inline">Indicator line marks calendar timeline ({elapsedPct.toFixed(0)}%)</span>
            <span>100% target</span>
          </div>
        </div>
      </div>
    </div>
  );
}
