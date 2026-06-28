import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { CopyIdButton } from "@/components/CopyIdButton";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState, actions } from "@/lib/store";
import { LocationPicker } from "@/components/LocationPicker";
import { useRole } from "@/lib/role";
import {
  ArrowLeft,
  Briefcase,
  Users2,
  DollarSign,
  Activity as ActivityIcon,
  History as HistoryIcon,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  Clock,
  Tag,
  Check,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin/projects/$projectId")({
  component: ProjectDetailsPage,
  head: ({ params }) => ({ meta: [{ title: `${params.projectId} · INT-CRM` }] }),
});

function fmtTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleString();
}

const STATUS_COLORS: Record<string, string> = {
  "On Track": "from-emerald-500 to-green-400",
  "At Risk": "from-amber-500 to-yellow-400",
  Delayed: "from-red-500 to-rose-400",
  Completed: "from-blue-500 to-cyan-400",
};

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 truncate font-display text-base font-extrabold text-foreground">
          {value}
        </div>
        {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
      <span className="w-28 flex-shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground pt-0.5">
        {label}
      </span>
      <div className="flex-1 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function ProjectDetailsPage() {
  const { projectId } = Route.useParams();
  const { t } = useI18n();
  const router = useRouter();
  const {
    activities,
    history,
    projects,
    leads: storeLeads,
    employees,
    settings,
    projectLocations,
  } = useStoreState();
  const project = projects.find((p) => p.id === projectId);
  const { role } = useRole();
  const panel = role;
  const user = {
    name: "hafez Rahim",
    role: t(role as any),
    initials: "HR",
    photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };

  if (!project) {
    return (
      <AppShell panel={panel} user={user} pageTitle="Account">
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Account <span className="font-mono">{projectId}</span> not found.
          </p>
          <Link
            to="/admin/projects"
            className="mt-3 inline-block text-sm font-semibold text-primary"
          >
            Back to accounts
          </Link>
        </div>
      </AppShell>
    );
  }

  const projectActivities = activities.filter((a) => a.projectId === projectId);
  const projectHistory = history.filter(
    (h) => h.target.includes(projectId) || h.target === project.name,
  );
  const relatedLeads = storeLeads.filter((l) => l.company === project.client);
  const clientLead = relatedLeads[0];
  const memberNames = (project as any).teamMembers as string[] | undefined;
  const members =
    memberNames && memberNames.length
      ? employees.filter((e) => memberNames.includes(e.name))
      : employees.slice(0, project.team);
  const clientEmail = (project as any).clientEmail;
  const clientPhone = (project as any).clientPhone;
  const projectLoc = projectLocations[projectId];
  const clientCity = projectLoc?.city || clientLead?.city || (project as any).city || "";
  const clientDistrict = projectLoc?.district || (project as any).district || "";
  const street = (project as any).street || "";
  const extraContacts: Array<{ name: string; title: string; phone: string; email: string }> =
    (project as any).extraContacts ?? [];
  const gradientClass = STATUS_COLORS[project.status] ?? "from-primary to-orange-500";

  const progressColor =
    project.progress >= 75
      ? "bg-emerald-500"
      : project.progress >= 40
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <AppShell panel={panel} user={user} pageTitle={project.name}>
      {/* Back nav */}
      <button
        onClick={() => router.history.back()}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Accounts
      </button>

      {/* ── Hero Banner ── */}
      <div className={`mb-6 rounded-2xl bg-gradient-to-r ${gradientClass} p-px shadow-lg`}>
        <div className="rounded-2xl bg-card/95 p-6 backdrop-blur-sm">
          <div className="flex flex-wrap items-start gap-5">
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradientClass} text-white shadow-md`}
            >
              <Briefcase className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-extrabold text-foreground">
                  {project.name}
                </h1>
                <StatusBadge status={project.status} />
                {(project as any).accountType && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    {(project as any).accountType}
                    {(project as any).accountType === "Other" && (project as any).otherAccountType
                      ? ` · ${(project as any).otherAccountType}`
                      : ""}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 font-mono text-xs">
                  {shortId(project.id)}
                  <CopyIdButton value={project.id} />
                </span>
                {project.client && (
                  <span>
                    Client: <b className="text-foreground">{project.client}</b>
                  </span>
                )}
                {(project as any).startDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {(project as any).startDate}
                  </span>
                )}
                {(project as any).endDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> → {(project as any).endDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Overall Progress</span>
              <span
                className={`font-mono font-extrabold ${project.progress >= 75 ? "text-emerald-500" : project.progress >= 40 ? "text-amber-500" : "text-primary"}`}
              >
                {project.progress}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-700 ${progressColor}`}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users2 className="h-5 w-5" />}
          label="Team"
          value={`${members.length} member${members.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          icon={<ActivityIcon className="h-5 w-5" />}
          label="Activities"
          value={`${projectActivities.length}`}
          sub={`${projectActivities.filter((a) => a.status === "done").length} done`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Contact Info */}
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5 bg-secondary/30">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Client Contact
              </h2>
            </div>
            <div className="p-5 space-y-0.5">
              <InfoRow label="Company">
                {project.client || <span className="text-muted-foreground">—</span>}
              </InfoRow>
              {clientLead?.contact && <InfoRow label="Contact">{clientLead.contact}</InfoRow>}
              <InfoRow label="Email">
                {clientEmail ? (
                  <a
                    href={`mailto:${clientEmail}`}
                    className="text-primary hover:underline font-mono"
                  >
                    {clientEmail}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </InfoRow>
              <InfoRow label="Phone">
                {clientPhone ? (
                  <a
                    href={`tel:${clientPhone.replace(/\s+/g, "")}`}
                    className="text-primary hover:underline font-mono"
                  >
                    {clientPhone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </InfoRow>
              <InfoRow label="Location">
                {street || clientDistrict || clientCity ? (
                  <span>{[street, clientDistrict, clientCity].filter(Boolean).join(", ")}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </InfoRow>
              <div className="pt-2">
                <LocationPicker
                  cities={settings.locations}
                  city={clientCity}
                  district={clientDistrict}
                  onChange={(city, district) =>
                    actions.setProjectLocation(projectId, city, district)
                  }
                  label="Change site location"
                />
              </div>
            </div>
          </div>

          {/* Extra Contacts — always visible */}
          <ExtraContactsCard
            contacts={extraContacts}
            onAdd={(c) =>
              actions.updateProject(projectId, { extraContacts: [...extraContacts, c] } as any)
            }
            onRemove={(i) =>
              actions.updateProject(projectId, {
                extraContacts: extraContacts.filter((_, idx) => idx !== i),
              } as any)
            }
          />

          {/* Related Leads */}
          {relatedLeads.length > 0 && (
            <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3.5 bg-secondary/30">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                  Related Leads
                </h2>
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {relatedLeads.length}
                </span>
              </div>
              <div className="divide-y divide-border">
                {relatedLeads.map((l) => (
                  <Link
                    key={l.id}
                    to="/admin/leads/$leadId"
                    params={{ leadId: l.id }}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-primary/5 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground">{l.contact}</div>
                      <div className="text-xs text-muted-foreground">
                        {l.industry} · {l.owner}
                      </div>
                    </div>
                    <StatusBadge status={l.status} label={t(l.status as any)} />
                    <span className="ml-2 font-mono text-sm font-bold text-foreground">
                      {fmtMoney(l.value)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Activities */}
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5 bg-secondary/30">
              <ActivityIcon className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {t("relatedActivities")}
              </h2>
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {projectActivities.length}
              </span>
            </div>
            {projectActivities.length === 0 ? (
              <p className="px-5 py-6 text-sm text-center text-muted-foreground">
                No activities linked to this project.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {projectActivities.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase ${a.status === "done" ? "bg-emerald-500/10 text-emerald-600" : "bg-secondary text-muted-foreground"}`}
                    >
                      {a.status === "done" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Clock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground">{a.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.dueDate} {a.time !== "—" ? `· ${a.time}` : ""} · {a.owner}
                      </div>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {a.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">
          {/* Team Members */}
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5 bg-secondary/30 rounded-t-2xl">
              <Users2 className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Team
              </h2>
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {members.length}
              </span>
              {/* Assign dropdown */}
              {role !== "employee" && (
                <div className="relative ml-1">
                  <button
                    onClick={(e) => e.currentTarget.nextElementSibling?.classList.toggle("hidden")}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <UserPlus className="h-3 w-3" /> Assign
                  </button>
                  <div className="absolute right-0 top-full z-20 mt-1 hidden w-64 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-2xl [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
                    {employees.map((emp) => {
                      const checked = memberNames?.includes(emp.name) ?? false;
                      return (
                        <label
                          key={emp.id}
                          className={`group flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-all duration-200 ${checked ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-accent"}`}
                        >
                          <div
                            className={`relative flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-transparent group-hover:border-primary/50"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const newMembers = e.target.checked
                                  ? [...(memberNames || []), emp.name]
                                  : (memberNames || []).filter((n) => n !== emp.name);
                                actions.updateProject(projectId, {
                                  teamMembers: newMembers,
                                  team: newMembers.length,
                                });
                              }}
                              className="absolute opacity-0 cursor-pointer w-full h-full m-0"
                            />
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20">
                            {emp.avatar}
                          </div>
                          <span
                            className={`flex-1 font-medium truncate ${checked ? "text-primary" : "text-foreground"}`}
                          >
                            {emp.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="rounded-b-2xl overflow-hidden">
              {members.length === 0 ? (
                <p className="px-5 py-6 text-sm text-center text-muted-foreground">
                  No team members assigned.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {members.map((m) => (
                    <Link
                      key={m.id}
                      to="/admin/employees/$employeeId"
                      params={{ employeeId: m.id }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors group"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-xs font-bold text-white shadow-sm">
                        {m.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-foreground">
                            {m.name}
                          </div>
                          {project.createdByName === m.name && (
                            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{m.role}</div>
                      </div>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3.5 bg-secondary/30">
              <HistoryIcon className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {t("timeline")}
              </h2>
            </div>
            <div className="px-5 py-4">
              {projectHistory.length === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">No history yet.</p>
              ) : (
                <ol className="relative ms-3 border-s-2 border-border ps-5 space-y-5">
                  {projectHistory.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -start-[25px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                      <div className="text-[11px] text-muted-foreground">
                        {fmtTime(h.ts)} ·{" "}
                        <span className="font-semibold text-foreground">{h.actor}</span>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-foreground">{h.action}</div>
                      {h.details && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{h.details}</div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

type ExtraContact = { name: string; title: string; phone: string; email: string };

function ExtraContactsCard({
  contacts,
  onAdd,
  onRemove,
}: {
  contacts: ExtraContact[];
  onAdd: (c: ExtraContact) => void;
  onRemove: (i: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), title: title.trim(), phone: phone.trim(), email: email.trim() });
    setName("");
    setTitle("");
    setPhone("");
    setEmail("");
    setShowForm(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5 bg-secondary/30">
        <Phone className="h-4 w-4 text-primary" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
          Extra Contacts
        </h2>
        {contacts.length > 0 && (
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {contacts.length}
          </span>
        )}
        <button
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {/* Inline Add Form */}
      {showForm && (
        <div className="border-b border-border bg-secondary/20 px-5 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name *"
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title / Role"
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              type="email"
              dir="ltr"
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Save contact
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-8 text-center">
          <Phone className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No extra contacts yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-1 text-xs font-semibold text-primary hover:underline"
          >
            + Add a contact
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {contacts.map((c, i) => (
            <div key={i} className="group flex items-center gap-4 px-5 py-3.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-orange-500/20 text-xs font-extrabold text-primary">
                {c.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">{c.name}</div>
                {c.title && <div className="text-xs text-muted-foreground">{c.title}</div>}
              </div>
              {c.phone && (
                <a
                  href={`tel:${c.phone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                >
                  <Phone className="h-3 w-3" /> {c.phone}
                </a>
              )}
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                >
                  <Mail className="h-3 w-3" /> {c.email}
                </a>
              )}
              <button
                onClick={() => onRemove(i)}
                className="ml-1 hidden rounded-md p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 group-hover:flex transition-colors"
                title="Remove contact"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
