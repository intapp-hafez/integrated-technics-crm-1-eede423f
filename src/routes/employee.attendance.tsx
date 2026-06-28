import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState } from "@/lib/store";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { LogIn, LogOut, MapPin, Clock, Check, Loader2 } from "lucide-react";
import { cairoIsoDate, cairoTime } from "@/lib/cairoTime";

export const Route = createFileRoute("/employee/attendance")({
  component: AttendancePage,
});

type AttendanceMapProps = {
  center: [number, number];
  title?: string;
  subtitle?: string;
  accuracy?: number | null;
};

function useAttendanceMap() {
  const [Comp, setComp] = useState<ComponentType<AttendanceMapProps> | null>(null);
  useEffect(() => {
    let mounted = true;
    import("@/components/AttendanceMap").then((m) => {
      if (mounted) setComp(() => m.AttendanceMap);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return Comp;
}

function computeHours(checkIn: string, checkOut: string): string {
  if (!checkIn || !checkOut) return "—";
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  const mins = oh * 60 + om - (ih * 60 + im);
  if (mins <= 0) return "—";
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: { Accept: "application/json" },
      },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const a = j.address ?? {};
    return (
      [a.suburb || a.neighbourhood || a.village, a.city || a.town || a.county, a.country]
        .filter(Boolean)
        .join(", ") ||
      j.display_name ||
      null
    );
  } catch {
    return null;
  }
}

function deviceSummary(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const browser = /Edg\/|OPR\//.test(ua)
    ? /Edg\//.test(ua)
      ? "Edge"
      : "Opera"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "Device";
  return `${browser} · ${os}`;
}

function withDevice(loc: string): string {
  const dev = deviceSummary();
  if (!loc) return `📱 ${dev}`;
  return loc.includes("📱") ? loc : `${loc} · 📱 ${dev}`;
}

function AttendancePage() {
  const { t } = useI18n();
  const { attendance, profile } = useStoreState();
  const today = cairoIsoDate();
  const mine = useMemo(
    () =>
      attendance
        .filter((a) => a.owner === profile.name)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [attendance, profile.name],
  );
  const todayRec = mine.find((a) => a.date === today);

  const [locating, setLocating] = useState(false);

  const handleCheckIn = async () => {
    setLocating(true);
    const now = cairoTime();
    const pos = await getCurrentPosition();
    const baseLoc = pos
      ? (await reverseGeocode(pos.lat, pos.lng)) || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`
      : profile.location;
    const locName = withDevice(baseLoc);
    actions.addAttendance({
      date: today,
      checkIn: now,
      checkOut: "",
      hours: "—",
      location: locName,
      owner: profile.name,
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      accuracy: pos?.accuracy ?? null,
    });
    setLocating(false);
  };

  const handleCheckOut = async () => {
    if (!todayRec) return;
    setLocating(true);
    const now = cairoTime();
    const pos = await getCurrentPosition();
    const patch: Record<string, any> = {
      checkOut: now,
      hours: computeHours(todayRec.checkIn, now),
    };
    if (pos) {
      const baseLoc =
        (await reverseGeocode(pos.lat, pos.lng)) || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
      patch.lat = pos.lat;
      patch.lng = pos.lng;
      patch.accuracy = pos.accuracy;
      patch.location = withDevice(baseLoc);
    } else {
      patch.location = withDevice(todayRec.location || "");
    }
    actions.updateAttendance(todayRec.id, patch);
    setLocating(false);
  };

  const mapCenter: [number, number] | null =
    todayRec?.lat != null && todayRec?.lng != null ? [todayRec.lat, todayRec.lng] : null;

  const AttendanceMap = useAttendanceMap();

  return (
    <AppShell
      panel="employee"
      user={{
        name: profile.name,
        role: t("employee"),
        initials: profile.name
          .split(" ")
          .map((s) => s[0])
          .join("")
          .slice(0, 2),
      }}
      pageTitle={t("attendance")}
    >
      <div
        className="rounded-2xl border border-border p-6 shadow-[var(--shadow-soft)]"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="flex flex-col items-center gap-4 text-center text-white">
          <Clock className="h-10 w-10" />
          <div>
            <div className="text-xs uppercase tracking-widest text-white/70">
              {t("today")} · {todayRec?.location || profile.location}
            </div>
            <div className="font-display text-4xl font-bold">
              {todayRec ? todayRec.checkIn : "—:—"}
            </div>
            <div className="mt-1 text-sm text-white/80">
              {t("workingHours")}:{" "}
              {todayRec
                ? todayRec.hours !== "—"
                  ? todayRec.hours
                  : computeHours(todayRec.checkIn, cairoTime())
                : "—"}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold text-white">
              <MapPin className="h-4 w-4" /> {mapCenter ? "GPS Verified" : "GPS Pending"}
            </span>
            {!todayRec ? (
              <button
                disabled={locating}
                onClick={handleCheckIn}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-white/90 disabled:opacity-60"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}{" "}
                {t("checkIn")}
              </button>
            ) : !todayRec.checkOut ? (
              <button
                disabled={locating}
                onClick={handleCheckOut}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}{" "}
                {t("checkOut")}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
                <Check className="h-4 w-4" /> Done for today
              </span>
            )}
          </div>
        </div>
      </div>

      {mapCenter && (
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <MapPin className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">Today's location</h3>
            <span className="ms-auto font-mono text-xs text-muted-foreground">
              {mapCenter[0].toFixed(5)}, {mapCenter[1].toFixed(5)}
            </span>
          </div>
          <div className="h-64 w-full">
            {AttendanceMap ? (
              <AttendanceMap
                center={mapCenter}
                title={todayRec?.location}
                subtitle={`${todayRec?.checkIn || "—"} → ${todayRec?.checkOut || "—"}`}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                Loading map…
              </div>
            )}
          </div>
        </div>
      )}

      <AttendanceHistory records={mine} loading={false} MapComponent={AttendanceMap} />
    </AppShell>
  );
}

type AttRecord = {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  location: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
};

function AttendanceHistory({
  records,
  loading,
  MapComponent,
}: {
  records: AttRecord[];
  loading: boolean;
  MapComponent: ComponentType<AttendanceMapProps> | null;
}) {
  const AttendanceMap = MapComponent;

  const { t } = useI18n();
  const [filter, setFilter] = useState<"all" | "week" | "month">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));
  const accLabel = (a?: number | null) => {
    if (a == null) return null;
    if (a <= 20)
      return {
        txt: `±${Math.round(a)}m · High`,
        cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      };
    if (a <= 50)
      return {
        txt: `±${Math.round(a)}m · Medium`,
        cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      };
    return {
      txt: `±${Math.round(a)}m · Low`,
      cls: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    };
  };

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = records.filter((r) => {
    const d = new Date(r.date);
    if (filter === "week") return d >= startOfWeek;
    if (filter === "month") return d >= startOfMonth;
    return true;
  });

  // Group by month label, e.g. "May 2026"
  const groups = filtered.reduce<Record<string, AttRecord[]>>((acc, r) => {
    const d = new Date(r.date);
    const key = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    (acc[key] ||= []).push(r);
    return acc;
  }, {});

  const fmtDay = (iso: string) => {
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString(undefined, { day: "2-digit" }),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    };
  };

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5 md:py-4">
        <h3 className="font-display text-base font-bold text-foreground">My logs</h3>
        <div className="flex gap-1.5">
          {(["all", "week", "month"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "week" ? "This week" : "This month"}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-lg bg-secondary/50 p-3"
            >
              <div className="h-12 w-12 rounded-lg bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-secondary" />
                <div className="h-3 w-2/3 rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/70">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="font-display text-sm font-bold text-foreground">No attendance yet</div>
          <p className="max-w-xs text-xs text-muted-foreground">
            Your check-ins will appear here grouped by month. Check in above to log your first day.
          </p>
        </div>
      )}

      {/* Mobile: grouped cards | Desktop: keep table feel via list */}
      {!loading && filtered.length > 0 && (
        <div className="divide-y divide-border">
          {Object.entries(groups).map(([month, rows]) => (
            <section key={month}>
              <div className="sticky top-16 z-[1] flex items-center justify-between bg-secondary/70 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur md:px-5">
                <span>{month}</span>
                <span>
                  {rows.length} {rows.length === 1 ? "day" : "days"}
                </span>
              </div>
              <ul>
                {rows.map((w) => {
                  const { day, weekday } = fmtDay(w.date);
                  const complete = !!w.checkOut;
                  const hasGps = w.lat != null && w.lng != null;
                  const acc = accLabel(w.accuracy);
                  const isOpen = !!expanded[w.id];
                  return (
                    <li key={w.id} className="px-4 py-3 md:px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <span className="font-display text-base font-bold leading-none">
                            {day}
                          </span>
                          <span className="mt-0.5 text-[10px] font-semibold uppercase">
                            {weekday}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {w.checkIn || "—"}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span
                              className={`font-mono text-sm ${complete ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                            >
                              {w.checkOut || "—"}
                            </span>
                            <span
                              className={`ms-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                complete
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              }`}
                            >
                              {complete ? "Done" : "Open"}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0 text-primary" />
                            <span className="truncate max-w-[14rem] md:max-w-sm">
                              {w.location || "—"}
                            </span>
                            <span aria-hidden>·</span>
                            <span className="font-mono font-semibold text-foreground">
                              {w.hours}
                            </span>
                            {hasGps ? (
                              acc ? (
                                <span
                                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${acc.cls}`}
                                >
                                  {acc.txt}
                                </span>
                              ) : (
                                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                  GPS
                                </span>
                              )
                            ) : (
                              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                No GPS
                              </span>
                            )}
                            {hasGps && (
                              <button
                                onClick={() => toggle(w.id)}
                                className="ms-auto rounded-md px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10"
                              >
                                {isOpen ? "Hide map" : "Show map"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {hasGps && isOpen && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-border">
                          <div className="h-44 w-full">
                            {AttendanceMap ? (
                              <AttendanceMap
                                center={[w.lat as number, w.lng as number]}
                                title={w.location}
                                subtitle={`${w.checkIn || "—"} → ${w.checkOut || "—"}`}
                                accuracy={w.accuracy ?? null}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                                Loading map…
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between bg-secondary/40 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                            <span>
                              {(w.lat as number).toFixed(5)}, {(w.lng as number).toFixed(5)}
                            </span>
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${w.lat}&mlon=${w.lng}#map=17/${w.lat}/${w.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-primary hover:underline"
                            >
                              Open in OSM ↗
                            </a>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
