// QA checks for Africa/Cairo attendance helpers.
// Run with: bun scripts/qa-cairo-attendance.ts
import {
  cairoIsoDate,
  cairoTime,
  cairoWeekday,
  isEgyptWeekend,
  cairoYearMonth,
  cairoMonthDates,
  lastNCairoDates,
} from "../src/lib/cairoTime";

let failed = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(
    `${ok ? "✓" : "✗"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`,
  );
  if (!ok) failed++;
};

// 1) Late-night UTC instant still on the same Cairo day.
// 2026-06-04 22:30 UTC = 2026-06-05 01:30 Cairo (DST, UTC+3) → date must roll to 06-05
const lateUtc = new Date(Date.UTC(2026, 5, 4, 22, 30, 0));
eq("Cairo date after midnight Cairo", cairoIsoDate(lateUtc), "2026-06-05");
eq("Cairo time after midnight Cairo", cairoTime(lateUtc), "01:30");

// 3) Early Cairo morning (still previous UTC day, must not shift backwards)
// 2026-06-03 23:15 UTC = 2026-06-04 02:15 Cairo
const earlyCairo = new Date(Date.UTC(2026, 5, 3, 23, 15, 0));
eq("Cairo date before sunrise", cairoIsoDate(earlyCairo), "2026-06-04");
eq("Cairo time before sunrise", cairoTime(earlyCairo), "02:15");

// 4) Egyptian weekend: 2026-06-05 = Friday, 2026-06-06 = Saturday, 2026-06-07 = Sunday
eq("Fri is weekend", isEgyptWeekend("2026-06-05"), true);
eq("Sat is weekend", isEgyptWeekend("2026-06-06"), true);
eq("Sun is NOT weekend", isEgyptWeekend("2026-06-07"), false);
eq("Thu is NOT weekend", isEgyptWeekend("2026-06-04"), false);

// 5) Weekday labels match Cairo wall calendar
eq("Weekday Mon", cairoWeekday(new Date(Date.UTC(2026, 5, 1, 12))), "Mon");
eq("Weekday Fri", cairoWeekday(new Date(Date.UTC(2026, 5, 5, 12))), "Fri");

// 6) Month dates cover the right number of days (June 2026 = 30)
const june = cairoMonthDates(2026, 5);
eq("June length", june.length, 30);
eq("June first", june[0], "2026-06-01");
eq("June last", june[29], "2026-06-30");

// 7) Last 7 days returns 7 consecutive ascending Cairo dates ending today
const last7 = lastNCairoDates(7, new Date(Date.UTC(2026, 5, 4, 22, 30))); // Cairo 2026-06-05
eq("last7 length", last7.length, 7);
eq("last7 ends today (Cairo)", last7[6], "2026-06-05");
eq("last7 starts 6 days back", last7[0], "2026-05-30");

// 8) cairoYearMonth returns 0-indexed month consistent with Cairo wall date
const ym = cairoYearMonth(lateUtc);
eq("cairoYearMonth", ym, { year: 2026, month0: 5 });

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll Cairo attendance checks passed ✓");
