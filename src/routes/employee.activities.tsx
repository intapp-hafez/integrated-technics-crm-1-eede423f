import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isAssignedToEmployee } from "@/lib/activityFilters";
import { useEffect, useMemo, useState } from "react";
import { Phone, Mail, Users2, MapPin, ClipboardCheck, RefreshCw, Plus, Check, Circle, Bookmark, Clock4, List, CalendarDays, ChevronLeft, ChevronRight, Pencil, Trash2, Download } from "lucide-react";
import { ExcelImportModal } from "@/components/ExcelImportModal";

export const Route = createFileRoute("/employee/activities")({
  component: MyActivitiesPage,
  head: () => ({ meta: [{ title: "My Activities · INT-CRM" }] }),
});

type Bucket = "past" | "today" | "top" | "later" | "all";

const ICONS: Record<string, any> = {
  Call: Phone, Email: Mail, Meeting: Users2, "Site Visit": MapPin, "Follow-up": RefreshCw, Inspection: ClipboardCheck,
};

function MyActivitiesPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const navigate = useNavigate();
  const { activities, leads, profile, users } = useStoreState();
  const { user } = useAuth();
  const me = useMemo(() => users.find((u) => u.id === user?.id), [users, user?.id]);
  const OWNER = profile?.name && profile.name !== "—" ? profile.name : (me?.name ?? "");
  const PROFILE_ID = me?.profileId;
  const [bucket, setBucket] = useState<Bucket>("today");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const BUCKET_LABELS: Record<Bucket, string> = {
    past: t("today") === "اليوم" ? "الماضي" : "past",
    today: t("today"),
    top: t("today") === "اليوم" ? "الأهم" : "top",
    later: t("today") === "اليوم" ? "لاحقًا" : "later",
    all: t("all"),
  };

  // Client-only date state to avoid SSR hydration mismatch (timezone/locale).
  const [today, setToday] = useState<string>("");
  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const mine = useMemo(() => {
    if (!PROFILE_ID && !OWNER) return [];
    return activities.filter((a) =>
      isAssignedToEmployee(a as any, { profileId: PROFILE_ID, userId: user?.id, name: OWNER })
    );
  }, [activities, PROFILE_ID, OWNER, user?.id]);

  const filtered = useMemo(() => {
    const isAfter = (d: string) => d > today;
    const isBefore = (d: string) => d < today;
    return mine
      .filter((a) => {
        if (bucket === "all") return true;
        if (bucket === "today") return a.dueDate === today;
        if (bucket === "past") return isBefore(a.dueDate);
        if (bucket === "later") return isAfter(a.dueDate);
        if (bucket === "top") return a.status !== "done" && (a.estMinutes ?? 0) >= 30;
        return true;
      })
      .sort((a, b) => (a.dueDate + a.time).localeCompare(b.dueDate + b.time));
  }, [mine, bucket, today]);

  const todayMins = mine.filter((a) => a.dueDate === today).reduce((s, a) => s + (a.estMinutes ?? 0), 0);
  const doneTodayMins = mine.filter((a) => a.dueDate === today && a.status === "done").reduce((s, a) => s + (a.estMinutes ?? 0), 0);
  const fmtH = (mins: number) => {
    const h = Math.floor(mins / 60); const m = mins % 60;
    return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
  };

  return (
    <AppShell panel="employee" user={{ name: OWNER || "—", role: t("employee"), initials: (OWNER || "?").split(/\s+/).map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?", photo: profile?.avatarUrl ?? "" }} pageTitle={t("myActivities")}>
      <div className="mx-auto w-full max-w-md md:max-w-6xl">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock4 className="h-3.5 w-3.5 text-primary" /> {t("today")}
            </span>
            <span className="font-mono text-sm font-bold text-foreground">{fmtH(doneTodayMins)} <span className="text-muted-foreground">/ {fmtH(todayMins)}</span></span>
          </div>
        </div>

        {/* Filter chips */}
        <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1">
          <div className="flex items-center gap-1 rounded-full bg-card p-0.5 ring-1 ring-border">
            <button onClick={() => setView("list")} aria-label="List view" className={`flex h-7 w-7 items-center justify-center rounded-full ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><List className="h-3.5 w-3.5" /></button>
            <button onClick={() => setView("calendar")} aria-label="Calendar view" className={`flex h-7 w-7 items-center justify-center rounded-full ${view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><CalendarDays className="h-3.5 w-3.5" /></button>
          </div>
          {(["past", "today", "top", "later", "all"] as Bucket[]).map((b) => {
            const active = bucket === b;
            return (
              <button
                key={b}
                onClick={() => setBucket(b)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold capitalize ring-1 transition ${active ? "bg-primary text-primary-foreground ring-primary shadow-[var(--shadow-brand)]" : "bg-card text-foreground ring-border hover:bg-accent"
                  }`}
              >
                {BUCKET_LABELS[b]}
              </button>
            );
          })}
          <div className="flex gap-2 ms-auto">
            <button
              disabled
              title={isAr ? "نعتذر — هذا الخيار غير متاح حالياً. شكراً لتفهمكم." : "We apologise — this option is currently not working. Thanks for your understanding."}
              className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground opacity-40"
            >
              <Download className="h-3.5 w-3.5 rotate-180" /> {t("importExcel")}
            </button>
          </div>
        </div>

        {view === "list" && <NewQuickActivity owner={OWNER} />}

        {view === "calendar" && <CalendarView activities={mine} onPick={(id) => navigate({ to: "/employee/activities/$activityId", params: { activityId: id } })} />}

        {/* Task list */}
        {view === "list" && <div className="mt-3 space-y-2.5 md:grid md:grid-cols-2 md:gap-2.5 md:space-y-0 xl:grid-cols-3">
          {filtered.map((a) => {
            const Icon = ICONS[a.type] ?? Bookmark;
            const lead = leads.find((l) => l.id === a.leadId);
            const done = a.status === "done";
            if (editId === a.id) {
              return <EditActivityCard key={a.id} activity={a} onClose={() => setEditId(null)} />;
            }
            return (
              <div
                key={a.id}
                onClick={() => navigate({ to: "/employee/activities/$activityId", params: { activityId: a.id } })}
                className={`group flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-[var(--shadow-soft)] transition cursor-pointer ${done ? "border-emerald-200" : "border-border hover:border-primary/40"
                  }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${done ? "bg-emerald-50 text-emerald-600" : "bg-primary/10 text-primary"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`truncate text-sm font-bold ${done ? "text-foreground" : "text-foreground"}`}>{a.title}</div>
                    {a.approvalStatus === "pending" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700">Pending approval</span>
                    )}
                    {a.approvalStatus === "rejected" && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700" title={a.rejectionReason}>Rejected</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {a.dueDate === today ? t("today").toUpperCase() : a.dueDate} · {a.time}{a.estMinutes ? ` · ${fmtH(a.estMinutes)}` : ""}
                    </div>
                    {a.presalesTeam && a.presalesTeam.length > 0 && (
                      <div className="flex -space-x-1" title={t("presalesTeam")}>
                        {a.presalesTeam.map((p) => (
                          <div key={p} className="flex h-4 w-4 items-center justify-center rounded-full border border-card bg-secondary text-[8px] font-bold text-foreground">
                            {p.split(" ").map(w => w[0]).join("").slice(0, 2)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditId(a.id); }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-primary"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`${t("confirmDelete")} "${a.title}"`)) actions.removeActivity(a.id); }}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {done ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow">
                    Attended <Check className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); actions.setActivityStatus(a.id, "done"); }}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary"
                    aria-label="Mark done"
                  >
                    <Circle className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              {t("nothingHere")}
            </div>
          )}
        </div>}
      </div>
      {showImport && <ExcelImportModal type="activities" onClose={() => setShowImport(false)} />}
    </AppShell>
  );
}

function EditActivityCard({ activity, onClose }: { activity: ReturnType<typeof useStoreState>["activities"][number]; onClose: () => void }) {
  const { t } = useI18n();
  const { settings, leads } = useStoreState();
  const [title, setTitle] = useState(activity.title);
  const [type, setType] = useState(activity.type);
  const [mins, setMins] = useState(activity.estMinutes ?? 0);
  const [leadId, setLeadId] = useState(activity.leadId ?? "");
  const [dueDate, setDueDate] = useState(activity.dueDate);
  const [time, setTime] = useState(activity.time);
  const save = () => {
    if (!title.trim()) return;
    actions.updateActivity(activity.id, { title, type, estMinutes: mins, leadId: leadId || undefined, dueDate, time });
    onClose();
  };
  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-card p-3 shadow-[var(--shadow-soft)]">
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs">
          {settings.activityTypes.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
        </select>
        <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs">
          <option value="">No lead</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.company}</option>)}
        </select>
        <input type="number" value={mins} onChange={(e) => setMins(Number(e.target.value))} className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs" />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent">{t("cancel")}</button>
        <button onClick={save} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">{t("save")}</button>
      </div>
    </div>
  );
}

function CalendarView({ activities, onPick }: { activities: ReturnType<typeof useStoreState>["activities"]; onPick: (id: string) => void }) {
  const { t } = useI18n();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(today.toISOString().slice(0, 10));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = first.getDay();
  const cells: Array<{ date: string; day: number } | null> = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({ date, day: d });
  }
  const minsByDate = new Map<string, number>();
  const countByDate = new Map<string, number>();
  for (const a of activities) {
    minsByDate.set(a.dueDate, (minsByDate.get(a.dueDate) ?? 0) + (a.estMinutes ?? 0));
    countByDate.set(a.dueDate, (countByDate.get(a.dueDate) ?? 0) + 1);
  }
  const dayActivities = activities.filter((a) => a.dueDate === selected).sort((a, b) => a.time.localeCompare(b.time));
  const fmtMonth = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const fmtH = (m: number) => { const h = Math.floor(m / 60); const mm = m % 60; return h ? `${h}h ${mm ? `${mm}m` : ""}`.trim() : `${mm}m`; };
  const totalSelected = (minsByDate.get(selected) ?? 0);

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
        <div className="font-display text-sm font-bold text-foreground">{fmtMonth}</div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="mx-auto w-full max-w-[44px] aspect-square" />;
          const isToday = c.date === today.toISOString().slice(0, 10);
          const isSelected = c.date === selected;
          const count = countByDate.get(c.date) ?? 0;
          return (
            <button
              key={i}
              onClick={() => setSelected(c.date)}
              className={`relative mx-auto w-full max-w-[44px] aspect-square rounded-lg text-sm font-semibold transition ${isSelected ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" :
                isToday ? "bg-primary/10 text-primary ring-1 ring-primary/30" :
                  "text-foreground hover:bg-accent"
                }`}
            >
              <span className={count > 0 ? "relative -top-2" : ""}>{c.day}</span>
              {count > 0 && (
                <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${isSelected ? "bg-primary-foreground text-primary" : "bg-emerald-100 text-emerald-700"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="text-xs font-semibold text-foreground">{selected}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{dayActivities.length} item(s) · {fmtH(totalSelected)}</div>
      </div>
      <div className="mt-2 space-y-1.5">
        {dayActivities.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{t("nothingScheduled")}</div>}
        {dayActivities.map((a) => {
          const Icon = ICONS[a.type] ?? Bookmark;
          return (
            <button key={a.id} onClick={() => onPick(a.id)} className="flex w-full items-center gap-2.5 rounded-xl bg-background p-2.5 text-start ring-1 ring-border hover:border-primary/40 hover:ring-primary/40">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-3.5 w-3.5" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-foreground">{a.title}</div>
                <div className="text-[10px] text-muted-foreground">{a.time}{a.estMinutes ? ` · ${fmtH(a.estMinutes)}` : ""} · {a.status.replace("_", " ")}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NewQuickActivity({ owner }: { owner: string }) {
  const { t } = useI18n();
  const { leads, settings } = useStoreState();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState(settings.activityTypes[0]);
  const [mins, setMins] = useState(30);
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");
  const submit = () => {
    if (!title.trim()) return;
    actions.addActivity({
      type, title, leadId: leadId || undefined,
      dueDate: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      owner, estMinutes: mins,
    });
    setTitle(""); setMins(30); setOpen(false);
  };
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-transparent px-4 py-3.5 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" /> new
      </button>
    );
  }
  return (
    <div className="mt-4 rounded-2xl border-2 border-primary/30 bg-card p-3 shadow-[var(--shadow-soft)]">
      <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("workingOn")} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none" />
      <div className="mt-2 grid grid-cols-3 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as any)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none">
          {settings.activityTypes.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
        </select>
        <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-xs focus:border-primary focus:outline-none">
          <option value="">{t("noLead")}</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.company}</option>)}
        </select>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-2 text-xs">
          <Clock4 className="h-3.5 w-3.5 text-muted-foreground" />
          <input type="number" min={0} step={5} value={mins} onChange={(e) => setMins(Number(e.target.value))} className="h-9 w-full bg-transparent text-xs focus:outline-none" />
          <span className="text-muted-foreground">{t("min")}</span>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent">{t("cancel")}</button>
        <button onClick={submit} className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">{t("add")}</button>
      </div>
    </div>
  );
}