import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { CheckCircle2, AlertTriangle, XCircle, MapPin, Clock4 } from "lucide-react";
import { cairoIsoDate } from "@/lib/cairoTime";
import { useMemo } from "react";

export const Route = createFileRoute("/admin/attendance")({
  component: AttendancePage,
  head: () => ({ meta: [{ title: "Attendance · INT-CRM" }] }),
});

function AttendancePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { attendance, employees } = useStoreState();
  const user = {
    name: "",
    role: t("admin"),
    initials: "HR",
    photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };

  const today = cairoIsoDate();
  const todays = useMemo(() => attendance.filter((r) => r.date === today), [attendance, today]);
  const parseHours = (h: string): number => {
    if (!h || h === "—") return 0;
    const hm = h.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
    if (hm) return Number(hm[1]) + Number(hm[2] || 0) / 60;
    const n = parseFloat(h);
    return Number.isFinite(n) ? n : 0;
  };
  const fmtHours = (n: number) => {
    const h = Math.floor(n);
    const m = Math.round((n - h) * 60);
    if (!h && !m) return "0h";
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  const summary = useMemo(() => {
    let present = 0,
      late = 0,
      absent = 0,
      totalHours = 0;
    for (const r of todays) {
      if (!r.checkIn) absent += 1;
      else if (r.checkIn > "08:15") late += 1;
      else present += 1;
      totalHours += parseHours(r.hours);
    }
    const total = Math.max(todays.length, employees.length);
    const missing = Math.max(0, employees.length - todays.length);
    const checkedIn = todays.filter((r) => r.checkIn).length;
    const avgHours = checkedIn ? totalHours / checkedIn : 0;
    return { present, late, absent: absent + missing, total, totalHours, avgHours };
  }, [todays, employees]);

  const records = useMemo(() => {
    return attendance.map((r) => {
      const isLate = r.checkIn && r.checkIn > "08:15";
      return {
        id: r.id,
        name: r.owner,
        date: r.date,
        in: r.checkIn || "—",
        out: r.checkOut || "—",
        status: (r.checkIn ? (isLate ? "late" : "present") : "absent") as
          | "present"
          | "late"
          | "absent",
        hours: r.hours || "—",
        hoursNum: parseHours(r.hours),
        location: r.location || "—",
      };
    });
  }, [attendance]);

  const totalAllHours = useMemo(() => records.reduce((s, r) => s + r.hoursNum, 0), [records]);

  const stats = [
    {
      label: t("presentToday"),
      v: String(summary.present),
      total: String(summary.total),
      Icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: t("late"),
      v: String(summary.late),
      total: String(summary.total),
      Icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: t("absent"),
      v: String(summary.absent),
      total: String(summary.total),
      Icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      label: "Total hours today",
      v: fmtHours(summary.totalHours),
      total: `${fmtHours(summary.avgHours)} avg`,
      Icon: Clock4,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <AppShell panel="admin" user={user} pageTitle={t("attendance")}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg} ${s.color}`}
              >
                <s.Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-foreground">{s.v}</span>
              <span className="text-sm text-muted-foreground">
                {s.total.includes("avg") ? s.total : `/ ${s.total}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h3 className="font-display text-base font-bold text-foreground">
            {t("todaysRecordsTitle")}
          </h3>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Clock4 className="h-3.5 w-3.5" /> Total: {fmtHours(totalAllHours)} · {records.length}{" "}
            {records.length === 1 ? "entry" : "entries"}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("name")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("date")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("checkIn")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("checkOut")}
                </th>
                <th className="px-4 py-3 text-end text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Hours
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("locationGPS")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("status")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((r) => {
                const emp = employees.find((e) => e.name === r.name);
                return (
                  <tr
                    key={r.id}
                    onClick={() =>
                      emp &&
                      navigate({
                        to: "/admin/employees/$employeeId",
                        params: { employeeId: emp.id },
                      })
                    }
                    className={`${emp ? "cursor-pointer" : ""} hover:bg-primary/5`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {emp?.photo ? (
                          <img
                            src={emp.photo}
                            alt={r.name}
                            loading="lazy"
                            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-primary/30"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-[10px] font-bold text-primary-foreground">
                            {emp?.avatar ??
                              r.name
                                .split(" ")
                                .map((w: string) => w[0])
                                .join("")
                                .slice(0, 2)}
                          </div>
                        )}
                        <span className="font-semibold text-foreground">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.in}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{r.out}</td>
                    <td className="px-4 py-3 text-end font-mono font-semibold text-foreground">
                      {r.hoursNum > 0 ? fmtHours(r.hoursNum) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {r.location}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} label={t(r.status as any)} />
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No records
                  </td>
                </tr>
              )}
            </tbody>
            {records.length > 0 && (
              <tfoot className="bg-secondary/40">
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-end text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Total hours
                  </td>
                  <td className="px-4 py-3 text-end font-mono text-sm font-bold text-foreground">
                    {fmtHours(totalAllHours)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </AppShell>
  );
}
