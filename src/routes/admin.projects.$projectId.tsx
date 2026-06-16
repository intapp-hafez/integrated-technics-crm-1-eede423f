import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { shortId } from "@/lib/utils";
import { CopyIdButton } from "@/components/CopyIdButton";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState } from "@/lib/store";
import { actions } from "@/lib/store";
import { LocationPicker } from "@/components/LocationPicker";
import { useRole } from "@/lib/role";
import { ArrowLeft, Briefcase, Users2, DollarSign, Activity as ActivityIcon, History as HistoryIcon, Mail, Phone, Building2, MapPin, Calendar } from "lucide-react";

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

function ProjectDetailsPage() {
  const { projectId } = Route.useParams();
  const { t } = useI18n();
  const router = useRouter();
  const { activities, history, projects, leads: storeLeads, employees } = useStoreState();
  const { settings, projectLocations } = useStoreState();
  const project = projects.find((p) => p.id === projectId);
  const { role } = useRole();
  const panel = role;
  const user = { name: "hafez Rahim", role: t(role as any), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" };

  if (!project) {
    return (
      <AppShell panel={panel} user={user} pageTitle="Account">
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">Account <span className="font-mono">{projectId}</span> not found.</p>
          <Link to="/admin/projects" className="mt-3 inline-block text-sm font-semibold text-primary">Back to accounts</Link>
        </div>
      </AppShell>
    );
  }

  const projectActivities = activities.filter((a) => a.projectId === projectId);
  const projectHistory = history.filter((h) => h.target.includes(projectId) || h.target === project.name);

  // Related leads from the same client
  const relatedLeads = storeLeads.filter((l) => l.company === project.client);
  const clientLead = relatedLeads[0];
  // Team members from project_members (synced into project.teamMembers); fall back to first N employees
  const memberNames = (project as any).teamMembers as string[] | undefined;
  const members = memberNames && memberNames.length
    ? employees.filter((e) => memberNames.includes(e.name))
    : employees.slice(0, project.team);
  // Prefer real client contact info from store
  const clientEmail = (project as any).clientEmail;
  const clientPhone = (project as any).clientPhone;
  const projectLoc = projectLocations[projectId];
  const clientCity = projectLoc?.city || clientLead?.city || "";
  const clientDistrict = projectLoc?.district || "";

  return (
    <AppShell panel={panel} user={user} pageTitle={project.name}>
      <button onClick={() => router.history.back()} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </button>

      <div className="mb-6 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Briefcase className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-extrabold text-foreground">{project.name}</h2>
              <StatusBadge status={project.status} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-mono text-xs">{shortId(project.id)}<CopyIdButton value={project.id} /></span>
              <span>Client: <b className="text-foreground">{project.client}</b></span>
              <span className="inline-flex items-center gap-1.5"><Users2 className="h-3.5 w-3.5" /> {project.team} members</span>
              <span className="inline-flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> {fmtMoney(project.budget)}</span>
              {(project as any).startDate && (
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Start: <b className="text-foreground">{(project as any).startDate}</b></span>
              )}
              {(project as any).endDate && (
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> End: <b className="text-foreground">{(project as any).endDate}</b></span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-mono font-bold text-foreground">{project.progress}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Client Contact Info</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company</div>
              <div className="mt-1 font-semibold text-foreground">{project.client}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Primary Contact</div>
              <div className="mt-1 font-semibold text-foreground">{clientLead?.contact ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1"><Mail className="h-3 w-3" /> Email</div>
              {clientEmail ? (
                <a href={`mailto:${clientEmail}`} className="mt-1 block truncate font-mono text-sm text-primary hover:underline">{clientEmail}</a>
              ) : (
                <div className="mt-1 font-semibold text-muted-foreground">—</div>
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</div>
              {clientPhone ? (
                <a href={`tel:${clientPhone.replace(/\s+/g, "")}`} className="mt-1 block font-mono text-sm text-primary hover:underline">{clientPhone}</a>
              ) : (
                <div className="mt-1 font-semibold text-muted-foreground">—</div>
              )}
            </div>
            {(project as any).accountType && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account Type</div>
                <div className="mt-1 font-semibold text-foreground">
                  {(project as any).accountType}
                  {(project as any).accountType === "Other" && (project as any).otherAccountType ? ` (${(project as any).otherAccountType})` : ""}
                </div>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" /> Location</div>
              {(clientCity || clientDistrict || (project as any).street) ? (
                <div className="text-sm font-semibold text-foreground">
                  {[(project as any).street, clientDistrict, clientCity].filter(Boolean).join(", ")}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
              <div className="mt-2">
                <LocationPicker
                  cities={settings.locations}
                  city={clientCity}
                  district={clientDistrict}
                  onChange={(city, district) => actions.setProjectLocation(projectId, city, district)}
                  label="Change site location"
                />
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const contacts: Array<{ name: string; title: string; phone: string }> =
            (project as any).extraContacts ?? [];
          if (!contacts.length) return null;
          return (
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="mb-4 flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Extra Contacts</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {contacts.map((c, i) => (
                  <div key={i} className="rounded-xl border border-border p-3">
                    <div className="font-semibold text-foreground">{c.name}</div>
                    {c.title && <div className="text-xs text-muted-foreground">{c.title}</div>}
                    {c.phone && <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="mt-1 block font-mono text-xs text-primary hover:underline">{c.phone}</a>}
                  </div>
                ))}
              </div>
            </div>
          );
        })()} 

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <Users2 className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Related Leads ({relatedLeads.length})</h3>
          </div>
          {relatedLeads.length === 0 && <p className="text-sm text-muted-foreground">No leads linked to this client.</p>}
          <div className="divide-y divide-border">
            {relatedLeads.map((l) => (
              <Link key={l.id} to="/admin/leads/$leadId" params={{ leadId: l.id }} className="flex items-center gap-3 py-3 hover:bg-primary/5">
                <span className="font-mono text-xs text-muted-foreground w-20">{shortId(l.id)}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{l.contact}</div>
                  <div className="text-xs text-muted-foreground">{l.industry} · {l.owner}</div>
                </div>
                <StatusBadge status={l.status} label={t(l.status as any)} />
                <span className="ml-3 font-mono text-sm font-bold text-foreground">{fmtMoney(l.value)}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">Team Members ({members.length})</h3>
            </div>
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.currentTarget.nextElementSibling?.classList.toggle('hidden');
                }} 
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20"
              >
                + Assign Employee
              </button>
              <div className="absolute right-0 top-full z-10 mt-1 hidden w-48 max-h-60 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
                {employees.map((emp) => {
                  const checked = memberNames?.includes(emp.name);
                  return (
                    <label key={emp.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                      <input 
                        type="checkbox" 
                        checked={checked} 
                        onChange={(e) => {
                          const newMembers = e.target.checked 
                            ? [...(memberNames || []), emp.name]
                            : (memberNames || []).filter(n => n !== emp.name);
                          actions.updateProject(projectId, { teamMembers: newMembers, team: newMembers.length });
                        }} 
                        className="h-4 w-4" 
                      />
                      <span className="font-medium text-foreground">{emp.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {members.map((m) => (
              <Link key={m.id} to="/admin/employees/$employeeId" params={{ employeeId: m.id }} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary hover:bg-primary/5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 text-xs font-bold text-primary-foreground">{m.avatar}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">{m.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.role}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <ActivityIcon className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{t("relatedActivities")}</h3>
          </div>
          {projectActivities.length === 0 && <p className="text-sm text-muted-foreground">No activities linked to this project.</p>}
          <div className="space-y-2">
            {projectActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{a.type}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.dueDate} {a.time} · {a.owner}</div>
                </div>
                <span className="text-xs font-semibold capitalize text-muted-foreground">{a.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">{t("timeline")}</h3>
          </div>
          <ol className="relative ms-3 border-s border-border ps-5">
            {projectHistory.length === 0 && <li className="text-sm text-muted-foreground">No history yet.</li>}
            {projectHistory.map((h) => (
              <li key={h.id} className="relative pb-5 last:pb-0">
                <span className="absolute -start-[27px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <div className="text-xs text-muted-foreground">{fmtTime(h.ts)} · <span className="font-semibold text-foreground">{h.actor}</span></div>
                <div className="text-sm font-semibold text-foreground">{h.action}</div>
                {h.details && <div className="text-xs text-muted-foreground">{h.details}</div>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </AppShell>
  );
}