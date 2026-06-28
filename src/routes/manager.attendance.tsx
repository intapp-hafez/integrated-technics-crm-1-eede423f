import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CheckCircle2, AlertTriangle, XCircle, MapPin } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/manager/attendance")({
  component: ManagerAttendancePage,
  head: () => ({ meta: [{ title: "Attendance · Manager" }] }),
});

function ManagerAttendancePage() {
  const { t } = useI18n();
  const { attendance } = useStoreState();
  const { teamEmployees: employees, includesOwner } = useMyTeam();
  const today = new Date().toISOString().slice(0, 10);

  const todayRecords = useMemo(
    () => attendance.filter((r) => r.date === today && includesOwner(r.owner)),
    [attendance, today, includesOwner],
  );

  const computeStatus = (r: (typeof todayRecords)[number]) => {
    if (!r.checkIn) return "absent";
    const [h, m] = r.checkIn.split(":").map(Number);
    return h * 60 + m > 9 * 60 + 15 ? "late" : "present";
  };

  const total = employees.length || todayRecords.length;
  const present = todayRecords.filter((r) => computeStatus(r) === "present").length;
  const late = todayRecords.filter((r) => computeStatus(r) === "late").length;
  const absent = Math.max(total - present - late, 0);

  const stats = [
    {
      label: t("presentToday"),
      v: present,
      total,
      Icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: t("late"),
      v: late,
      total,
      Icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: t("absent"),
      v: absent,
      total,
      Icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
  ];

  return (
    <AppShell
      panel="manager"
      user={{
        name: "hafez Rahim",
        role: t("manager"),
        initials: "HR",
        photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
      }}
      pageTitle={t("attendance")}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              <span className="text-sm text-muted-foreground">/ {s.total}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-display text-base font-bold text-foreground">
            {t("todaysRecordsTitle")}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("name")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("role")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("checkIn")}
                </th>
                <th className="px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("checkOut")}
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
              {todayRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    —
                  </td>
                </tr>
              )}
              {todayRecords.map((r) => {
                const emp = employees.find((e) => e.name === r.owner);
                const status = computeStatus(r);
                return (
                  <tr key={r.id} className="hover:bg-primary/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {emp?.photo ? (
                          <img
                            src={emp.photo}
                            alt={r.owner}
                            loading="lazy"
                            className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-primary/30"
                          />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-[10px] font-bold text-primary-foreground">
                            {emp?.avatar ??
                              r.owner
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2)}
                          </div>
                        )}
                        <span className="font-semibold text-foreground">{r.owner}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{emp?.role ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{r.checkIn || "—"}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {r.checkOut || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> {r.location}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} label={t(status as any)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
