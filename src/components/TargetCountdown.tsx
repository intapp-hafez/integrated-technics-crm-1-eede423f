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
        ring: "ring-emerald-300/60",
        bg: "from-emerald-500/10 via-emerald-400/5 to-transparent",
        text: "text-emerald-700",
        accent: "bg-emerald-500",
        chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        glow: "shadow-[0_10px_40px_-12px_rgba(16,185,129,0.45)]",
      };
    case "yellow":
      return {
        ring: "ring-amber-300/60",
        bg: "from-amber-500/10 via-amber-400/5 to-transparent",
        text: "text-amber-700",
        accent: "bg-amber-500",
        chip: "bg-amber-50 text-amber-700 ring-amber-200",
        glow: "shadow-[0_10px_40px_-12px_rgba(245,158,11,0.45)]",
      };
    case "red":
      return {
        ring: "ring-rose-300/60",
        bg: "from-rose-500/10 via-rose-400/5 to-transparent",
        text: "text-rose-700",
        accent: "bg-rose-500",
        chip: "bg-rose-50 text-rose-700 ring-rose-200",
        glow: "shadow-[0_10px_40px_-12px_rgba(244,63,94,0.45)]",
      };
  }
}

function computeTone(achievePct: number, elapsedPct: number, daysLeft: number): Tone {
  // Compare achievement % vs time-elapsed %.
  // Ahead or on track = green, slightly behind = yellow, badly behind / out of time = red.
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
  const nextSec = hasUpdate ? Math.max(0, Math.ceil((refreshIntervalMs - elapsedMs) / 1000)) : Math.ceil(refreshIntervalMs / 1000);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground ${className}`}>
      <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-primary" : "text-primary"}`} />
      {isRefreshing ? "Refreshing…" : hasUpdate ? `Updated ${elapsedSec}s ago · next ${nextSec}s` : `Updates every ${Math.ceil(refreshIntervalMs / 1000)}s`}
    </span>
  );
}

export function TargetCountdown({ achieved, target, deadline, periodStart, deadlineLabel, compact, label, isRefreshing, lastUpdatedAt, refreshIntervalMs = 30_000 }: Props) {
  // Deadline: end of current year by default
  const endIso = deadline ?? `${new Date().getFullYear()}-12-31T23:59:59`;
  const startIso = periodStart ?? `${new Date().getFullYear()}-01-01T00:00:00`;
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  const [now, setNow] = useState<number>(() => endMs); // SSR-safe: render "0" until mount
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

  const Cell = ({ v, l }: { v: number; l: string }) => (
    <div className={`flex flex-col items-center justify-center rounded-xl bg-card/80 px-3 py-2 ring-1 ${c.ring} backdrop-blur min-w-[64px]`}>
      <div className={`font-mono text-2xl font-extrabold tabular-nums ${c.text}`}>
        {mounted ? String(v).padStart(2, "0") : "--"}
      </div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{l}</div>
    </div>
  );

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 ${c.glow}`}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.bg}`} />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.accent} text-white shadow-md`}>
              <Target className="h-4 w-4" />
            </div>
            <div>
              <div className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {label ?? "Target Countdown"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {deadlineLabel ?? `Deadline · ${new Date(endIso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <TargetRefreshIndicator isRefreshing={isRefreshing} lastUpdatedAt={lastUpdatedAt} refreshIntervalMs={refreshIntervalMs} />
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${c.chip}`}>
              <Clock className="h-3 w-3" />
              {tone === "green" ? "On Track" : tone === "yellow" ? "Watch" : "At Risk"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <Cell v={days} l="Days" />
          <span className={`hidden text-2xl font-extrabold ${c.text} sm:inline`}>:</span>
          <Cell v={hours} l="Hours" />
          <span className={`hidden text-2xl font-extrabold ${c.text} sm:inline`}>:</span>
          <Cell v={minutes} l="Min" />
          <span className={`hidden text-2xl font-extrabold ${c.text} sm:inline`}>:</span>
          <Cell v={seconds} l="Sec" />
        </div>

        {!compact && (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Achieved</div>
              <div className="font-mono text-sm font-bold text-foreground">{fmtMoney(achieved)}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Remaining</div>
              <div className={`font-mono text-sm font-bold ${c.text}`}>{fmtMoney(remaining)}</div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Achievement</div>
              <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${c.text}`}>
                <TrendingUp className="h-3.5 w-3.5" /> {achievePct.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Achievement</span>
            <span>Time Elapsed {elapsedPct.toFixed(0)}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className={`h-full ${c.accent} transition-all`} style={{ width: `${Math.min(100, achievePct)}%` }} />
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground/70"
              style={{ left: `${Math.min(100, elapsedPct)}%` }}
              title="Time elapsed marker"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
