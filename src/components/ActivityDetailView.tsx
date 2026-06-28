import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { shortId } from "@/lib/utils";
import { CopyIdButton } from "@/components/CopyIdButton";
import { actions, useStoreState, type ActivityStatus } from "@/lib/store";
import {
  ArrowLeft,
  Phone,
  Mail,
  Users2,
  MapPin,
  ClipboardCheck,
  RefreshCw,
  Circle,
  PlayCircle,
  CheckCircle2,
  X,
  Timer,
  Calendar,
  User as UserIcon,
  Briefcase,
  Building2,
} from "lucide-react";

const ICONS: Record<string, any> = {
  Call: Phone,
  Email: Mail,
  Meeting: Users2,
  "Site Visit": MapPin,
  "Follow-up": RefreshCw,
  Inspection: ClipboardCheck,
};
const STATUS_META: Record<ActivityStatus, { icon: any; tone: string; label: string }> = {
  pending: { icon: Circle, tone: "text-muted-foreground bg-secondary", label: "Pending" },
  in_progress: {
    icon: PlayCircle,
    tone: "text-amber-700 bg-amber-50 ring-amber-200",
    label: "In progress",
  },
  done: {
    icon: CheckCircle2,
    tone: "text-emerald-700 bg-emerald-50 ring-emerald-200",
    label: "Done",
  },
  cancelled: { icon: X, tone: "text-rose-700 bg-rose-50 ring-rose-200", label: "Cancelled" },
  delayed: { icon: Circle, tone: "text-sky-700 bg-sky-50 ring-sky-200", label: "Delayed" },
};

const fmtH = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
};

export function ActivityDetailView({
  activityId,
  panel,
}: {
  activityId: string;
  panel: "admin" | "employee" | "manager" | "finance";
}) {
  const { t } = useI18n();
  const { activities, leads, history } = useStoreState();
  const a = activities.find((x) => x.id === activityId);
  const backTo =
    panel === "admin"
      ? "/admin/activities"
      : panel === "manager"
        ? "/manager/activities"
        : "/employee/activities";
  const user = { name: "hafez Rahim", role: t(panel as any), initials: "HR" };

  if (!a) {
    return (
      <AppShell panel={panel} user={user} pageTitle="Activity">
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Activity <span className="font-mono">{activityId}</span> not found.
          </p>
          <Link to={backTo} className="mt-3 inline-block text-sm font-semibold text-primary">
            ← Back
          </Link>
        </div>
      </AppShell>
    );
  }

  const Icon = ICONS[a.type] ?? Circle;
  const lead = a.leadId ? leads.find((l) => l.id === a.leadId) : undefined;
  const meta = STATUS_META[a.status];
  const SIcon = meta.icon;
  const related = history
    .filter((h) => h.target === a.title || (lead && h.target === lead.company))
    .slice(0, 12);

  return (
    <AppShell panel={panel} user={user} pageTitle={a.title}>
      <Link
        to={backTo}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to activities
      </Link>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1">
                    {shortId(a.id)} · {a.type}
                    <CopyIdButton value={a.id} />
                  </div>
                  <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">
                    {a.title}
                  </h1>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Created {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${meta.tone}`}
              >
                <SIcon className="h-4 w-4" /> {meta.label}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat icon={Calendar} label="Due date" value={a.dueDate} />
              <Stat
                icon={Timer}
                label="Time"
                value={`${a.time}${a.estMinutes ? ` · ${fmtH(a.estMinutes)}` : ""}`}
              />
              <Stat
                icon={UserIcon}
                label="Assignee"
                value={
                  (a as any).createdByName ??
                  (a.owner && a.owner !== "Unassigned" ? a.owner : "Unassigned")
                }
                photo={(a as any).createdByPhoto}
              />
              <Stat
                icon={lead ? Building2 : Briefcase}
                label={lead ? "Lead" : "Account"}
                value={lead?.company ?? a.projectId ?? "—"}
              />
            </div>

            {a.notes && (
              <div className="mt-5 rounded-xl bg-secondary/50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Notes
                </div>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{a.notes}</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {(["pending", "in_progress", "done", "cancelled"] as ActivityStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => actions.setActivityStatus(a.id, s)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                    a.status === s
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-card text-foreground ring-border hover:bg-accent"
                  }`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </div>

          {lead && (
            <Link
              to="/admin/leads/$leadId"
              params={{ leadId: lead.id }}
              className="block rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:border-primary hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Related lead
                  </div>
                  <div className="mt-1 font-display text-base font-bold text-foreground">
                    {lead.company}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lead.contact} · {lead.industry}
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">Open →</span>
              </div>
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            Activity log
          </h3>
          <ul className="mt-3 space-y-3">
            {related.length === 0 && (
              <li className="text-xs text-muted-foreground">No related history entries yet.</li>
            )}
            {related.map((h) => (
              <li key={h.id} className="border-l-2 border-primary/40 ps-3">
                <div className="text-xs font-semibold text-foreground">{h.action}</div>
                {h.details && <div className="text-[11px] text-muted-foreground">{h.details}</div>}
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {new Date(h.ts).toLocaleString()} · {h.actor}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  icon: I,
  label,
  value,
  photo,
}: {
  icon: any;
  label: string;
  value: string;
  photo?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <I className="h-3 w-3" aria-hidden="true" /> {label}
      </div>
      <div className="mt-1 flex items-center gap-2 truncate text-sm font-semibold text-foreground">
        {photo && (
          <img src={photo} alt={`${value} avatar`} className="h-5 w-5 rounded-full object-cover" />
        )}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}
