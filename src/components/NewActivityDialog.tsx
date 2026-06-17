import { useMemo, useState, useEffect } from "react";
import { X, Briefcase, Building2, UserCircle2, Calendar, Clock, Timer, FileText, CheckCircle2, Lock } from "lucide-react";
import { actions, useStoreState, type ActivityType } from "@/lib/store";
import { employees as employeesData } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/role";
import { useMyTeam } from "@/lib/useMyTeam";
import { shortId } from "@/lib/utils";

const ACT_I18N: Record<string, any> = {
  Call: "actCall", Meeting: "actMeeting", "Site Visit": "actSiteVisit",
  "Follow-up": "actFollowUp", Inspection: "actInspection", Email: "actEmail",
};

interface Props {
  onClose: () => void;
}

export function NewActivityDialog({ onClose }: Props) {
  const { t, dir } = useI18n();
  const { leads, projects, settings, profile } = useStoreState();
  const { teamEmployees } = useMyTeam();
  const { isAdmin, isManager } = useRole();
  const canAssignOthers = isAdmin || isManager;
  const myName = profile?.name && profile.name !== "—" ? profile.name : "";

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [leadId, setLeadId] = useState<string>("");
  const [owner, setOwner] = useState<string>(canAssignOthers ? "" : myName);
  const [form, setForm] = useState({
    type: settings.activityTypes[0] as ActivityType,
    title: "",
    dueDate: new Date().toISOString().slice(0, 10),
    time: "10:00",
    notes: "",
    estMinutes: 30,
  });

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  // Leads "related to project" = leads whose company matches project's client
  const projectLeads = useMemo(
    () => (project ? leads.filter((l) => l.company === project.client) : []),
    [leads, project],
  );
  const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
  // Suggested employees: the lead's owner first, then the employee on this project's account
  const suggestedOwners = useMemo(() => {
    const names = new Set<string>();
    if (lead?.owner) names.add(lead.owner);
    // also surface anyone owning a lead at the same client
    projectLeads.forEach((l) => l.owner && names.add(l.owner));
    return Array.from(names);
  }, [lead, projectLeads]);

  // Use real DB-synced team employees only; fall back to mock data only when DB is empty.
  const allEmployees = useMemo(() => {
    const real = (teamEmployees as any[]).filter((e) => e?.name);
    if (real.length > 0) return real;
    return employeesData;
  }, [teamEmployees]);

  // Keep employee assignee locked to self
  useEffect(() => { if (!canAssignOthers && myName && owner !== myName) setOwner(myName); }, [canAssignOthers, myName, owner]);

  const canNext1 = !!projectId;
  const canNext2 = step === 2; // lead optional (general project activity)
  const canNext3 = !!owner;
  const canSave = !!form.title.trim() && !!form.dueDate && !!form.time;

  const submit = () => {
    if (!canSave) return;
    actions.addActivity({
      type: form.type,
      title: form.title,
      leadId: leadId || undefined,
      projectId: projectId || undefined,
      dueDate: form.dueDate,
      time: form.time,
      owner: owner || "Unassigned",
      notes: form.notes || undefined,
      estMinutes: Number(form.estMinutes) || undefined,
    } as any);
    onClose();
  };

  const stepMeta = [
    { n: 1, label: dir === "rtl" ? "الحساب" : "Account", icon: Briefcase },
    { n: 2, label: dir === "rtl" ? "العميل" : "Lead", icon: Building2 },
    { n: 3, label: dir === "rtl" ? "الموظف" : "Assignee", icon: UserCircle2 },
    { n: 4, label: dir === "rtl" ? "التفاصيل" : "Details", icon: FileText },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header + stepper */}
        <div className="border-b border-border bg-gradient-to-r from-primary/10 via-card to-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{dir === "rtl" ? "نشاط جديد" : "New Activity"}</div>
              <h3 className="font-display text-lg font-bold text-foreground">
                {dir === "rtl" ? "ابدأ بالحساب، ثم العميل، ثم الموظف" : "Start with the account, then the lead, then the assignee"}
              </h3>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {stepMeta.map((s, i) => {
              const active = step === s.n;
              const done = step > s.n;
              const Icon = s.icon;
              return (
                <div key={s.n} className="flex items-center gap-2">
                  <button
                    onClick={() => { if (done) setStep(s.n as any); }}
                    className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold ring-1 transition ${
                      active
                        ? "bg-primary text-primary-foreground ring-primary"
                        : done
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-secondary text-muted-foreground ring-border"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    {s.label}
                  </button>
                  {i < stepMeta.length - 1 && <div className={`h-px w-6 ${done ? "bg-emerald-300" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step === 1 && (
            <div>
              <div className="mb-3 text-xs font-semibold text-muted-foreground">
                {dir === "rtl" ? "اختر الحساب المرتبط بهذا النشاط" : "Pick the account this activity belongs to"}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-[300px] overflow-y-auto pr-1">
                {projects.map((p) => {
                  const active = projectId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setProjectId(p.id); setLeadId(""); setOwner(""); }}
                      className={`text-start rounded-xl border p-3 transition hover:border-primary ${
                        active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Briefcase className="h-4 w-4" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">{p.name}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{p.client} · {shortId(p.id)}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{p.status}</span>
                        <span>{p.progress}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && project && (
            <div>
              <div className="mb-3 rounded-lg bg-secondary/60 p-3 text-xs">
                <div className="font-semibold text-foreground inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-primary" /> {project.name}
                </div>
                <div className="text-muted-foreground">{dir === "rtl" ? "العميل:" : "Client:"} {project.client}</div>
              </div>
              <div className="mb-3 text-xs font-semibold text-muted-foreground">
                {dir === "rtl" ? "اختر العميل المحتمل المرتبط" : "Pick a related lead (or skip for a general project activity)"}
              </div>
              {projectLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  {dir === "rtl" ? "لا توجد عملاء محتملون مرتبطون بهذا المشروع" : "No leads found for this project's client."}
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  <button
                    onClick={() => setLeadId("")}
                    className={`w-full text-start rounded-lg border p-3 transition hover:border-primary ${
                      leadId === "" ? "border-primary bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    <div className="text-sm font-semibold text-foreground">— {dir === "rtl" ? "بدون عميل محدد" : "No specific lead"} —</div>
                    <div className="text-[11px] text-muted-foreground">{dir === "rtl" ? "نشاط عام على مستوى المشروع" : "General project-level activity"}</div>
                  </button>
                  {projectLeads.map((l) => {
                    const active = leadId === l.id;
                    return (
                      <button
                        key={l.id}
                        onClick={() => { setLeadId(l.id); setOwner(l.owner || ""); }}
                        className={`w-full text-start rounded-lg border p-3 transition hover:border-primary ${
                          active ? "border-primary bg-primary/5" : "border-border bg-background"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-foreground">{l.contact}</div>
                            <div className="text-[11px] text-muted-foreground">{l.industry} · {l.city} · {shortId(l.id)}</div>
                          </div>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{l.status}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && !canAssignOthers && (
            <div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                <Lock className="h-3 w-3" />
                {dir === "rtl"
                  ? "سيتم تعيين هذا النشاط لك بانتظار اعتماد المدير"
                  : "This activity will be assigned to you, pending manager approval"}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={myName} className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/30" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {myName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-foreground">{myName || (dir === "rtl" ? "أنت" : "You")}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{profile?.title || (dir === "rtl" ? "موظف" : "Employee")}</div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          )}
          {step === 3 && canAssignOthers && (
            <div>
              <div className="mb-3 text-xs font-semibold text-muted-foreground">
                {dir === "rtl" ? "الموظفون المقترحون لهذا الحساب/العميل" : "Suggested assignees based on this account & lead"}
              </div>
              {suggestedOwners.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">{dir === "rtl" ? "مقترحون" : "Suggested"}</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {suggestedOwners.map((name) => {
                      const emp = allEmployees.find((e) => e.name === name);
                      const active = owner === name;
                      return (
                        <button
                          key={name}
                          onClick={() => setOwner(name)}
                          aria-pressed={active}
                          className={`flex items-center gap-3 rounded-lg border p-2.5 text-start transition hover:border-primary ${
                            active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-emerald-200 bg-emerald-50/50"
                          }`}
                        >
                          {emp?.photo ? (
                            <img src={emp.photo} alt={name} className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30" />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{name.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-foreground">{name}</div>
                            <div className="truncate text-[11px] text-muted-foreground">{emp?.role ?? (dir === "rtl" ? "مالك العميل" : "Lead owner")}</div>
                          </div>
                          {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{dir === "rtl" ? "كل الموظفين" : "All employees"}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-h-[220px] overflow-y-auto pr-1">
                  {allEmployees.map((emp) => {
                    const active = owner === emp.name;
                    return (
                      <button
                        key={emp.id}
                        onClick={() => setOwner(emp.name)}
                        aria-pressed={active}
                        className={`flex items-center gap-3 rounded-lg border p-2.5 text-start transition hover:border-primary ${
                          active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-background"
                        }`}
                      >
                        {emp.photo ? (
                          <img src={emp.photo} alt={emp.name} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-foreground">{emp.avatar}</div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-foreground">{emp.name}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{emp.role} · {emp.department}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              {/* Summary chip */}
              <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 font-semibold text-foreground ring-1 ring-border"><Briefcase className="h-3 w-3 text-primary" /> {project?.name}</span>
                  {lead && <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 font-semibold text-foreground ring-1 ring-border"><Building2 className="h-3 w-3 text-primary" /> {lead.contact}</span>}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 font-semibold text-foreground ring-1 ring-border"><UserCircle2 className="h-3 w-3 text-primary" /> {owner}</span>
                </div>
              </div>

              <Field label={dir === "rtl" ? "النوع" : "Type"} icon={Timer}>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ActivityType })} className="input">
                  {settings.activityTypes.map((tp) => <option key={tp} value={tp}>{ACT_I18N[tp] ? t(ACT_I18N[tp]) : tp}</option>)}
                </select>
              </Field>
              <Field label={dir === "rtl" ? "العنوان" : "Title"} icon={FileText}>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input"
                  placeholder={dir === "rtl" ? "مثال: مكالمة استكشافية — Aramco" : "e.g. Discovery call — Aramco"}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={dir === "rtl" ? "التاريخ" : "Due date"} icon={Calendar}>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input" />
                </Field>
                <Field label={dir === "rtl" ? "الوقت" : "Time"} icon={Clock}>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input" />
                </Field>
              </div>
              <Field label={dir === "rtl" ? "الوقت المقدّر (دقيقة)" : "Estimated time (minutes)"} icon={Timer}>
                <input type="number" min={0} step={5} value={form.estMinutes} onChange={(e) => setForm({ ...form, estMinutes: Number(e.target.value) })} className="input" />
              </Field>
              <Field label={dir === "rtl" ? "ملاحظات" : "Notes"} icon={FileText}>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[70px]" />
              </Field>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/30 px-6 py-3">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent">
            {dir === "rtl" ? "إلغاء" : "Cancel"}
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={() => setStep((s) => (s - 1) as any)} className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent">
                {dir === "rtl" ? "السابق" : "Back"}
              </button>
            )}
            {step < 4 && (
              <button
                onClick={() => setStep((s) => (s + 1) as any)}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2) || (step === 3 && !canNext3)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90 disabled:opacity-50"
              >
                {dir === "rtl" ? "التالي" : "Next"}
              </button>
            )}
            {step === 4 && (
              <button
                onClick={submit}
                disabled={!canSave}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90 disabled:opacity-50"
              >
                {dir === "rtl" ? "حفظ النشاط" : "Save activity"}
              </button>
            )}
          </div>
        </div>

        <style>{`
          .input{ width:100%; height:38px; padding:0 10px; border-radius:8px; border:1px solid var(--border); background:var(--background); font-size:14px; color:var(--foreground); }
          .input:focus{ outline:none; border-color:var(--primary); box-shadow:0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent); }
          textarea.input{height:auto; padding:8px 10px;}
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, icon: I, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {I && <I className="h-3 w-3" />} {label}
      </div>
      {children}
    </label>
  );
}
