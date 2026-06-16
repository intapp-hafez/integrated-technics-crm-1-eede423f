// Africa/Cairo timezone helpers.
// All attendance dates, times, weekends and ranges must go through here
// so the UI never shifts by the viewer's local UTC offset.

export const CAIRO_TZ = "Africa/Cairo";

const pad = (n: number) => String(n).padStart(2, "0");

function partsOf(date: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  // "24" can leak through Intl when it's midnight; normalize to "00".
  const hh = get("hour") === "24" ? "00" : get("hour");
  return {
    y: Number(get("year")),
    m: Number(get("month")), // 1-12
    d: Number(get("day")),
    hh,
    mm: get("minute"),
    ss: get("second"),
    wd: get("weekday"), // "Mon".."Sun"
  };
}

/** "YYYY-MM-DD" in Cairo for the given (or current) instant. */
export function cairoIsoDate(date: Date = new Date()): string {
  const { y, m, d } = partsOf(date);
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** "HH:mm" in Cairo (24h) for the given (or current) instant. */
export function cairoTime(date: Date = new Date()): string {
  const { hh, mm } = partsOf(date);
  return `${hh}:${mm}`;
}

/** Short weekday label ("Mon"..."Sun") in Cairo. */
export function cairoWeekday(date: Date = new Date()): string {
  return partsOf(date).wd;
}

/** True for Friday/Saturday — the Egyptian weekend. Accepts Date or "YYYY-MM-DD". */
export function isEgyptWeekend(input: Date | string): boolean {
  const wd =
    typeof input === "string"
      ? cairoWeekday(new Date(`${input}T12:00:00Z`))
      : cairoWeekday(input);
  return wd === "Fri" || wd === "Sat";
}

/** Cairo year/month (0-indexed) for the current instant. */
export function cairoYearMonth(date: Date = new Date()): { year: number; month0: number } {
  const { y, m } = partsOf(date);
  return { year: y, month0: m - 1 };
}

/** Inclusive list of Cairo ISO dates ending today, length `n` (default 7). */
export function lastNCairoDates(n = 7, now: Date = new Date()): string[] {
  const todayIso = cairoIsoDate(now);
  const [y, m, d] = todayIso.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    // Build the Cairo date by walking days on a UTC noon anchor — Cairo never
    // crosses the DST boundary at noon so this stays stable.
    const anchor = new Date(Date.UTC(y, m - 1, d - i, 12, 0, 0));
    out.push(cairoIsoDate(anchor));
  }
  return out;
}

/** All Cairo ISO dates in the month identified by year + 0-indexed month. */
export function cairoMonthDates(year: number, month0: number): string[] {
  const days = new Date(year, month0 + 1, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= days; d++) {
    out.push(`${year}-${pad(month0 + 1)}-${pad(d)}`);
  }
  return out;
}
