import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ProjectRequestsPanel } from "@/components/ProjectRequestsPanel";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { actions, useStoreState } from "@/lib/store";
import { useMyTeam } from "@/lib/useMyTeam";
import type { Project } from "@/lib/store";
import { useRole } from "@/lib/role";
import { Plus, Users2, Pencil, Trash2, X, LayoutGrid, Table as TableIcon } from "lucide-react";
import { useState } from "react";
import { PhoneInput } from "@/components/PhoneInput";

export const Route = createFileRoute("/manager/projects")({
  component: ProjectsPage,
  head: () => ({ meta: [{ title: "Projects · INT-CRM" }] }),
});

function ProjectsPage() {
  const { t } = useI18n();
  const { projects } = useStoreState();
  const { role, isAdmin, isManager } = useRole();
  const canManage = isAdmin || isManager;

  const user = { name: "hafez Rahim", role: t(role as any), initials: "HR", photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg" };
  const isDetailRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith("/manager/projects/"),
  });
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [view, setView] = useState<"table" | "grid">("table");

  if (isDetailRoute) {
    return <Outlet />;
  }

  return (
    <AppShell panel={role} user={user} pageTitle={t("projects")}>
      <div className="mb-4"><ProjectRequestsPanel mode="approver" /></div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
          <button
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${view === "table" ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" : "text-muted-foreground hover:text-foreground"}`}
          >
            <TableIcon className="h-4 w-4" /> {t("tableView")}
          </button>
          <button
            onClick={() => setView("grid")}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-semibold transition ${view === "grid" ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" /> {t("gridView")}
          </button>
        </div>
        {canManage && (
          <button onClick={() => setEditing("new")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90">
            <Plus className="h-4 w-4" /> {t("addProject")}
          </button>
        )}

      </div>

      {view === "table" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-start text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-3 text-start">ID</th>
                  <th className="px-3 py-3 text-start">{t("name")}</th>
                  <th className="px-3 py-3 text-start">{t("client")}</th>
                  <th className="px-3 py-3 text-start">{t("status")}</th>
                  <th className="px-3 py-3 text-start">{t("progress")}</th>
                  <th className="px-3 py-3 text-start">{t("team")}</th>
                  <th className="px-3 py-3 text-end">{t("budget")}</th>
                  <th className="px-3 py-3 text-end">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-primary/5">
                    <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                      <Link to="/manager/projects/$projectId" params={{ projectId: p.id }} className="hover:text-primary">{shortId(p.id)}</Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to="/manager/projects/$projectId" params={{ projectId: p.id }} className="font-semibold text-foreground hover:text-primary">{p.name}</Link>
                      {p.category && <div className="text-[11px] text-muted-foreground">{p.category}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{p.client}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.progress}%`,
                              background: p.status === "Delayed" ? "oklch(0.62 0.22 27)" : p.status === "At Risk" ? "oklch(0.78 0.15 80)" : "oklch(0.706 0.181 49.5)",
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users2 className="h-3 w-3" />{p.team}</span>
                    </td>
                    <td className="px-3 py-2.5 text-end font-mono font-semibold text-primary">{fmtMoney(p.budget)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(p)} aria-label={t("edit")} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (confirm(`${t("confirmDelete")} (${p.name})`)) actions.removeProject(p.id); }} aria-label={t("delete")} className="rounded-md p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">—</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <div key={p.id} className="group relative rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg">
            <Link to="/manager/projects/$projectId" params={{ projectId: p.id }} className="block">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{shortId(p.id)} {p.category && `· ${p.category}`}</div>
                  <h3 className="mt-1 font-display text-base font-bold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.client}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>

              {p.competitors && p.competitors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.competitors.map(c => (
                    <span key={c} className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-600 ring-1 ring-inset ring-rose-200">
                      VS {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("progress")}</span>
                  <span className="font-mono font-bold text-foreground">{p.progress}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${p.progress}%`,
                      background:
                        p.status === "Delayed"
                          ? "oklch(0.62 0.22 27)"
                          : p.status === "At Risk"
                            ? "oklch(0.78 0.15 80)"
                            : "oklch(0.706 0.181 49.5)",
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users2 className="h-3.5 w-3.5" />
                  <span>{p.team} {t("members")}</span>
                </div>
                <div className="text-end">
                  <div className="font-mono font-bold text-primary">{fmtMoney(p.budget)}</div>
                  {p.offeredValue && <div className="text-[9px] text-muted-foreground uppercase">{t("offeredValue")}: {fmtMoney(p.offeredValue)}</div>}
                </div>
              </div>
            </Link>
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <button onClick={() => setEditing(p)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-secondary px-2 py-1.5 text-xs font-semibold hover:bg-accent">
                <Pencil className="h-3 w-3" /> {t("edit")}
              </button>
              <button onClick={() => { if (confirm(`${t("confirmDelete")} (${p.name})`)) actions.removeProject(p.id); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100">
                <Trash2 className="h-3 w-3" /> {t("delete")}
              </button>
            </div>
          </div>
        ))}
        </div>
      )}


      {editing && (
        <ProjectFormModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </AppShell>
  );
}

const PROJECT_TYPES = [
  "Fit-out",
  "Renovation",
  "MEP",
  "Construction",
  "Interior Design",
  "Maintenance",
  "Consultancy",
  "Architecture",
  "Landscaping",
  "Civil Works",
  "Structural",
  "HVAC",
  "Electrical",
  "Plumbing",
  "Finishing",
  "Joinery & Carpentry",
  "Facade & Cladding",
  "Flooring",
  "Painting",
  "Smart Home / IoT",
  "Security Systems",
  "Solar / Renewables",
  "Demolition",
  "Project Management",
  "Feasibility Study",
  "Other",
];

function ProjectFormModal({ initial, onClose }: { initial: Project | null; onClose: () => void }) {
  const { t } = useI18n();
  const { settings } = useStoreState();
  const { teamEmployees: employees } = useMyTeam();


  const [name, setName] = useState(initial?.name ?? "");
  const [projectType, setProjectType] = useState(initial?.projectType ?? "");
  const [budget, setBudget] = useState(initial?.budget ?? 0);

  const [clientName, setClientName] = useState(initial?.client ?? "");
  const [clientEmail, setClientEmail] = useState(initial?.clientEmail ?? "");
  const [clientPhone, setClientPhone] = useState(initial?.clientPhone ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [street, setStreet] = useState(initial?.street ?? "");
  const [accountType, setAccountType] = useState(initial?.accountType ?? "");
  const [otherAccountType, setOtherAccountType] = useState(initial?.otherAccountType ?? "");
  const [extraContacts, setExtraContacts] = useState<Array<{ name: string; title: string; phone: string }>>(
    initial?.extraContacts ?? []
  );
  const addExtraContact = () => setExtraContacts(prev => [...prev, { name: "", title: "", phone: "" }]);
  const removeExtraContact = (i: number) => setExtraContacts(prev => prev.filter((_, idx) => idx !== i));
  const updateExtraContact = (i: number, field: "name" | "title" | "phone", val: string) =>
    setExtraContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

  const [teamMembers, setTeamMembers] = useState<string[]>(initial?.teamMembers ?? []);
  const [memberOpen, setMemberOpen] = useState(false);

  const districts = settings.locations.find((c) => c.name === city)?.districts ?? [];

  const toggleMember = (idVal: string) => {
    setTeamMembers((prev) => (prev.includes(idVal) ? prev.filter((m) => m !== idVal) : [...prev, idVal]));
  };

  const submit = () => {
    if (!name.trim() || !clientName.trim()) return;
    const payload = {
      name,
      client: clientName,
      clientEmail,
      clientPhone,
      city,
      district,
      street,
      projectType,
      budget,
      team: teamMembers.length || 1,
      teamMembers,
      accountType,
      otherAccountType: accountType === "Other" ? otherAccountType : undefined,
      extraContacts: extraContacts.filter(c => c.name.trim()),
    };
    if (initial) {
      actions.updateProject(initial.id, payload);
    } else {
      actions.addProject({
        ...payload,
        progress: 0,
        status: "On Track",
        offeredValue: 0,
        competitors: [],
        category: projectType,
        lastUpdate: new Date().toISOString().slice(0, 10),
      });
    }
    onClose();
  };

  const memberLabel = teamMembers.length === 0
    ? t("selectTeamMembers")
    : employees.filter((e) => teamMembers.includes(e.id)).map((e) => e.name).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{initial ? `${t("edit")} ${t("projects")}` : t("addProject")}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">{t("projects")}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("name")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Account Type</span>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">—</option>
              <option value="End User">End User</option>
              <option value="Contractor">Contractor</option>
              <option value="System Integrator">System Integrator</option>
              <option value="Other">Other</option>
            </select>
          </label>
          {accountType === "Other" && (
            <label className="block sm:col-span-2 mt-[-4px]">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Specify Account Type</span>
              <input value={otherAccountType} onChange={(e) => setOtherAccountType(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="Please specify..." />
            </label>
          )}
          <div className="hidden">
            <input type="number" min={0} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </div>
        </div>

        <div className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">{t("clientInfo")}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("fullName")}</span>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("email")}</span>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <div className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("phone")}</span>
            <PhoneInput value={clientPhone || "+20"} onChange={(val) => setClientPhone(val)} />
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("city")}</span>
            <select value={city} onChange={(e) => { setCity(e.target.value); setDistrict(""); }} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">{t("selectCity")}</option>
              {settings.locations.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("district")}</span>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!city} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-50">
              <option value="">{t("selectDistrict")}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("street")}</span>
            <input value={street} onChange={(e) => setStreet(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
        </div>

        <div className="mt-5 mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Extra Contacts</span>
          <button type="button" onClick={addExtraContact} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/20">
            <Plus className="h-3 w-3" /> Add Contact
          </button>
        </div>
        {extraContacts.length === 0 && (
          <p className="text-xs text-muted-foreground mb-3">No extra contacts yet. Click "Add Contact" to add one.</p>
        )}
        <div className="space-y-3 mb-4">
          {extraContacts.map((c, i) => (
            <div key={i} className="rounded-lg border border-border p-3 relative">
              <button type="button" onClick={() => removeExtraContact(i)} className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pr-8">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</span>
                  <input value={c.name} onChange={e => updateExtraContact(i, "name", e.target.value)} placeholder="Full name" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</span>
                  <input value={c.title} onChange={e => updateExtraContact(i, "title", e.target.value)} placeholder="Job title" className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
                </label>
                <div className="block sm:col-span-2">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone</span>
                  <PhoneInput value={c.phone || "+20"} onChange={val => updateExtraContact(i, "phone", val)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-wider text-primary">{t("teamMembers")}</div>
        <div className="relative">
          <button type="button" onClick={() => setMemberOpen((o) => !o)} className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-start text-sm">
            <span className={teamMembers.length === 0 ? "text-muted-foreground" : "text-foreground truncate"}>{memberLabel}</span>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </button>
          {memberOpen && (
            <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
              {employees.map((emp) => {
                const checked = teamMembers.includes(emp.id);
                return (
                  <label key={emp.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                    <input type="checkbox" checked={checked} onChange={() => toggleMember(emp.id)} className="h-4 w-4" />
                    <span className="font-medium text-foreground">{emp.name}</span>
                    <span className="text-xs text-muted-foreground">· {emp.role}</span>
                  </label>
                );
              })}
            </div>
          )}
          {teamMembers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {employees.filter((e) => teamMembers.includes(e.id)).map((e) => (
                <span key={e.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {e.name}
                  <button onClick={() => toggleMember(e.id)} className="text-primary/70 hover:text-primary"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent">{t("cancel")}</button>
          <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{initial ? t("save") : t("create")}</button>
        </div>
      </div>
    </div>
  );
}
