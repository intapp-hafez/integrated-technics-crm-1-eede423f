// Shared target period math (Cairo timezone) used by both employee & admin views
// so the Target Countdown is computed identically everywhere.

export type TargetType = "yearly" | "quarterly" | "monthly";

const TZ = "Africa/Cairo";

function localIso(y: number, m: number, d: number, hh = 0, mm = 0, ss = 0) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function fmtCairo(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d, 12)).toLocaleDateString("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface TargetPeriod {
  targetType: TargetType;
  periodName: "Year" | "Quarter" | "Month";
  psY: number;
  psM: number;
  psD: number;
  peY: number;
  peM: number;
  peD: number;
  periodStartIso: string;
  periodEndIso: string;
  periodStartMs: number;
  periodEndMs: number;
  deadlineLabel: string;
  countdownLabel: string;
}

export function computeTargetPeriod(targetType: TargetType): TargetPeriod {
  const nowParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>(
      (acc, p) => (p.type !== "literal" ? { ...acc, [p.type]: p.value } : acc),
      {},
    );
  const year = Number(nowParts.year);
  const month = Number(nowParts.month) - 1;

  let psY = year,
    psM = 0,
    psD = 1;
  let peY = year,
    peM = 11,
    peD = 31;
  let periodName: "Year" | "Quarter" | "Month" = "Year";

  if (targetType === "monthly") {
    psY = year;
    psM = month;
    psD = 1;
    peY = year;
    peM = month;
    peD = daysInMonth(year, month);
    periodName = "Month";
  } else if (targetType === "quarterly") {
    const qStart = Math.floor(month / 3) * 3;
    psY = year;
    psM = qStart;
    psD = 1;
    peY = year;
    peM = qStart + 2;
    peD = daysInMonth(year, qStart + 2);
    periodName = "Quarter";
  }

  const periodStartIso = localIso(psY, psM, psD, 0, 0, 0);
  const periodEndIso = localIso(peY, peM, peD, 23, 59, 59);

  return {
    targetType,
    periodName,
    psY,
    psM,
    psD,
    peY,
    peM,
    peD,
    periodStartIso,
    periodEndIso,
    periodStartMs: new Date(periodStartIso).getTime(),
    periodEndMs: new Date(periodEndIso).getTime(),
    deadlineLabel: `${periodName} · ${fmtCairo(psY, psM, psD)} → ${fmtCairo(peY, peM, peD)}`,
    countdownLabel: `${targetType[0].toUpperCase()}${targetType.slice(1)} Target Countdown`,
  };
}

export function fmtCairoDate(y: number, m: number, d: number) {
  return fmtCairo(y, m, d);
}

/** Sum value of won leads whose updatedAt falls inside the period. */
export function sumWonInPeriod(
  leads: Array<{
    status?: string;
    value?: number | null;
    updatedAt?: string | null;
    updatedAtIso?: string | null;
  }>,
  period: { periodStartMs: number; periodEndMs: number },
): number {
  return leads
    .filter((l) => {
      if (l.status !== "won") return false;
      const updatedAt = l.updatedAtIso ?? l.updatedAt;
      if (!updatedAt) return true;
      const t = new Date(updatedAt).getTime();
      if (!Number.isFinite(t)) return true;
      return t >= period.periodStartMs && t <= period.periodEndMs;
    })
    .reduce((s, l) => s + Number(l.value ?? 0), 0);
}
