import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState } from "@/lib/store";
import { useRole } from "@/lib/role";
import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Workflow,
  Tag,
  CalendarCheck,
  Zap,
  MessageSquare,
  Plus,
  Check,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  X,
  Users as UsersIcon,
  Trash2,
  Building2,
  Briefcase,
  Download,
  Upload,
  Clock,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  UserCircle2,
  Search,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Pencil,
  ArrowRight,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import {
  APP_PAGES,
  USER_ROLES,
  type AppPage,
  type CrudOp,
  type UserRoleKey,
  type AppUser,
} from "@/lib/store";
import {
  adminCreateUser,
  adminAddDepartment,
  adminDeleteDepartment,
  adminAddPosition,
  adminDeletePosition,
} from "@/lib/admin-api";
import { SendEmailEditor } from "@/components/SendEmailEditor";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings · INT-CRM" }] }),
});

const TABS = [
  { key: "statuses", label: "Lead Statuses", icon: Tag },
  { key: "stages", label: "Pipeline Stages", icon: Workflow },
  { key: "activities", label: "Activity Types", icon: CalendarCheck },
  { key: "workday", label: "Workday Hours", icon: Clock },
  { key: "departments", label: "Departments", icon: Building2 },
  { key: "positions", label: "Positions", icon: Briefcase },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "users", label: "Users & Permissions", icon: UsersIcon },
  { key: "roles", label: "User Roles", icon: ShieldCheck },
  { key: "automations", label: "Automations", icon: Zap },
  { key: "templates", label: "Notification Templates", icon: MessageSquare },
  { key: "send", label: "Send Email", icon: Mail },
  { key: "smtp", label: "SMTP / Email", icon: Mail },
] as const;

function SettingsPage() {
  const { t, lang } = useI18n();
  const { isAdmin } = useRole();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("statuses");
  const { settings } = useStoreState();
  const [newType, setNewType] = useState("");

  if (!isAdmin) {
    return (
      <AppShell
        panel="admin"
        user={{ name: "Employee", role: t("employee"), initials: "EM" }}
        pageTitle={t("settings")}
      >
        <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {t("accessRestricted")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("accessRestrictedMsg")}</p>
          <Link
            to="/employee"
            className="mt-5 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("goToEmployeePanel")}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      panel="admin"
      user={{
        name: "",
        role: t("admin"),
        initials: "HR",
        photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
      }}
      pageTitle={t("settings")}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-2 shadow-[var(--shadow-soft)] lg:sticky lg:top-20 lg:self-start">
          {TABS.map((it) => {
            const Icon = it.icon;
            const active = tab === it.key;
            return (
              <button
                key={it.key}
                onClick={() => setTab(it.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(
                  it.key === "statuses"
                    ? "leadStatuses"
                    : it.key === "stages"
                      ? "pipelineStages"
                      : it.key === "activities"
                        ? "activityTypes"
                        : (it.key as any),
                ) ?? it.label}
              </button>
            );
          })}
        </aside>

        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          {tab === "statuses" && (
            <section>
              <Header title={t("leadStatuses")} hint={t("statusesDesc")} />
              <StatusesEditor />
            </section>
          )}

          {tab === "stages" && (
            <section>
              <Header
                title={t("pipelineStages")}
                hint={`${t("stagesDesc") ?? ""} Drag the handle to reorder — this controls the progression order in the Pipeline board.`}
              />
              <div className="space-y-2">
                {settings.stages.map((st, idx) => (
                  <StageRow
                    key={st.key}
                    stageKey={st.key}
                    label={st.label}
                    color={st.color}
                    index={idx}
                    total={settings.stages.length}
                  />
                ))}
              </div>
            </section>
          )}

          {tab === "activities" && (
            <section>
              <Header title={t("activityTypes")} hint={t("activityTypesDesc")} />
              <div className="mb-4 flex gap-2">
                <input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="e.g. Demo, Workshop"
                  className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  onClick={() => {
                    if (newType.trim()) {
                      actions.addActivityType(newType.trim());
                      setNewType("");
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.activityTypes.map((tp) => (
                  <span
                    key={tp}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-foreground ring-1 ring-border"
                  >
                    {tp}
                    <button
                      onClick={() => actions.removeActivityType(tp)}
                      className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${tp}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {settings.activityTypes.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No activity types yet. Add one above.
                  </span>
                )}
              </div>
            </section>
          )}

          {tab === "workday" && (
            <section>
              <Header
                title="Standard Workday Hours"
                hint="Used as the 100% baseline when calculating attendance percentages across admin and employee panels."
              />
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Hours per workday
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    step={0.5}
                    value={settings.workdayHours ?? 8}
                    onChange={(e) => actions.setWorkdayHours(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="rounded-lg bg-secondary px-4 py-2 text-sm">
                  <span className="text-muted-foreground">Current baseline:</span>{" "}
                  <span className="font-mono font-bold text-foreground">
                    {settings.workdayHours ?? 8}h
                  </span>{" "}
                  <span className="text-muted-foreground">= 100%</span>
                </div>
              </div>
            </section>
          )}

          {tab === "departments" && (
            <section>
              <Header title="Departments" hint="Bilingual departments used across user profiles." />
              <DepartmentsEditor />
            </section>
          )}

          {tab === "positions" && (
            <section>
              <Header title="Positions" hint="Job titles / positions used across user profiles." />
              <PositionsEditor />
            </section>
          )}

          {tab === "locations" && (
            <section>
              <Header title={t("locations")} hint={t("locationsDesc")} />
              <LocationsEditor cities={settings.locations} />
            </section>
          )}

          {tab === "users" && (
            <section>
              <Header
                title="Users & Permissions"
                hint="Manage users and configure allowed pages and CRUD operations per role."
              />
              <UsersEditor />
              <div className="mt-8">
                <h3 className="mb-3 font-display text-base font-bold text-foreground">
                  Role permissions
                </h3>
                <PermissionsMatrix />
              </div>
            </section>
          )}

          {tab === "roles" && (
            <section>
              <Header
                title={lang === "ar" ? "إدارة صلاحيات المستخدمين" : "User Roles Management"}
                hint={
                  lang === "ar"
                    ? "عيّن أو أزل الصلاحيات لكل مستخدم. يتم منع إزالة آخر مدير."
                    : "Assign or remove roles per user. The last admin cannot be removed."
                }
              />
              <UserRolesEditor />
            </section>
          )}

          {tab === "automations" && <AutomationsEditor />}

          {tab === "templates" && <TemplatesEditor />}
          {tab === "send" && <SendEmailEditor />}
          {tab === "smtp" && <SmtpEditor />}
        </div>
      </div>
    </AppShell>
  );
}

function Header({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-5 border-b border-border pb-4">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function UsersImportBar({
  existingEmails,
  onImportRow,
}: {
  existingEmails: string[];
  onImportRow: (row: any) => Promise<void>;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const headers = [
      "Name (EN)",
      "Name (AR)",
      "Email",
      "Password",
      "Phone",
      "Role",
      "Title (EN)",
      "Department (EN)",
      "Location (EN)",
      "Target Type",
      "Annual Target",
      "Q1 Target",
      "Q2 Target",
      "Q3 Target",
      "Q4 Target",
      "Weekly Meetings Target",
      "Skills",
      "Active",
    ];
    const sampleRows = [
      [
        "",
        "جون دو",
        "Hafez@example.com",
        "password123",
        "0100000000",
        "employee",
        "Sales Executive",
        "Sales",
        "Cairo",
        "yearly",
        "1000000",
        "250000",
        "250000",
        "250000",
        "250000",
        "15",
        "Sales, Negotiation",
        "Yes",
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "users-template.xlsx");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const seen = new Set(existingEmails.map((s) => s.trim().toLowerCase()));
      let ok = 0,
        fail = 0,
        dup = 0;
      for (const r of rows) {
        const get = (key: string) => String(r[key] ?? "").trim();
        const email = get("Email");
        const nameEn = get("Name (EN)");
        const password = get("Password");

        if (!email || !nameEn || !password) continue;
        const key = email.toLowerCase();
        if (seen.has(key)) {
          dup++;
          continue;
        }
        seen.add(key);

        try {
          await onImportRow({
            email,
            password,
            full_name_en: nameEn,
            full_name_ar: get("Name (AR)") || null,
            phone: get("Phone") || null,
            role: (get("Role").toLowerCase() as UserRoleKey) || "employee",
            title_en: get("Title (EN)") || null,
            department_en: get("Department (EN)") || null,
            location_en: get("Location (EN)") || null,
            target_type: get("Target Type").toLowerCase() || "yearly",
            annual_target: Number(get("Annual Target")) || 0,
            q1_target: Number(get("Q1 Target")) || 0,
            q2_target: Number(get("Q2 Target")) || 0,
            q3_target: Number(get("Q3 Target")) || 0,
            q4_target: Number(get("Q4 Target")) || 0,
            weekly_meetings_target: Number(get("Weekly Meetings Target")) || 0,
            skills: get("Skills")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            active: get("Active").toLowerCase() !== "no",
          });
          ok++;
        } catch {
          fail++;
        }
      }
      toast.success(
        `Imported ${ok} users${dup ? ` · ${dup} duplicate emails skipped` : ""}${fail ? ` · ${fail} failed` : ""}`,
      );
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-background p-3">
      <span className="text-xs font-semibold text-muted-foreground">Bulk import users:</span>
      <button
        onClick={downloadTemplate}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
      >
        <Download className="h-3.5 w-3.5" /> Download template
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" /> {busy ? "Importing…" : "Import from Excel"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}

function UsersEditor() {
  const { users, settings } = useStoreState();
  const qc = useQueryClient();
  const createUser = adminCreateUser;
  const empty = {
    name: "",
    nameAr: "",
    email: "",
    phone: "",
    role: "employee" as UserRoleKey,
    active: true,
    titleEn: "",
    titleAr: "",
    departmentEn: "",
    departmentAr: "",
    locationEn: "",
    locationAr: "",
    avatarUrl: "",
    targetType: "yearly" as const,
    skills: [] as string[],
    managerId: "",
    startDate: "",
    annualTarget: 0,
    q1Target: 0,
    q2Target: 0,
    q3Target: 0,
    q4Target: 0,
    weeklyMeetingsTarget: 0,
  };
  const [draft, setDraft] = useState<Omit<AppUser, "id">>(empty);
  const [password, setPassword] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const upd = (patch: Partial<typeof draft>) => setDraft((d) => ({ ...d, ...patch }));
  const departments = settings.departments ?? [];
  const positions = settings.positions ?? [];

  const onSelectDepartment = (id: string) => {
    const d = departments.find((x) => x.id === id);
    upd({ departmentEn: d?.nameEn ?? "", departmentAr: d?.nameAr ?? "" });
  };
  const onSelectPosition = (id: string) => {
    const p = positions.find((x) => x.id === id);
    upd({ titleEn: p?.nameEn ?? "", titleAr: p?.nameAr ?? "" });
  };
  const selectedDeptId = departments.find((d) => d.nameEn === draft.departmentEn)?.id ?? "";
  const selectedPosId = positions.find((p) => p.nameEn === draft.titleEn)?.id ?? "";
  const managers = users.filter((u) => u.role === "manager");

  const filteredUsers = users.filter(
    (u) =>
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.nameAr && u.nameAr.includes(searchQuery)),
  );

  const submit = async () => {
    if (!draft.name.trim() || !draft.email.trim() || password.length < 6) {
      toast.error("Name, email, and a password of 6+ chars are required");
      return;
    }
    setBusy(true);
    try {
      await createUser({
        email: draft.email.trim(),
        password,
        full_name_en: draft.name.trim(),
        full_name_ar: draft.nameAr || null,
        phone: draft.phone || null,
        role: draft.role,
        title_en: draft.titleEn || null,
        title_ar: draft.titleAr || null,
        department_en: draft.departmentEn || null,
        department_ar: draft.departmentAr || null,
        location_en: draft.locationEn || null,
        location_ar: draft.locationAr || null,
        avatar_url: draft.avatarUrl || null,
        target_type: draft.targetType ?? "yearly",
        target_value: Number((draft as any).annualTarget ?? 0),
        start_date: (draft as any).startDate || null,
        annual_target: Number((draft as any).annualTarget ?? 0),
        q1_target: Number((draft as any).q1Target ?? 0),
        q2_target: Number((draft as any).q2Target ?? 0),
        q3_target: Number((draft as any).q3Target ?? 0),
        q4_target: Number((draft as any).q4Target ?? 0),
        weekly_meetings_target: Number((draft as any).weeklyMeetingsTarget ?? 0),
        skills: draft.skills ?? [],
        active: draft.active,
        manager_id: draft.managerId || null,
      });
      toast.success("User created");
      setDraft(empty);
      setPassword("");
      setSkillsText("");
      qc.invalidateQueries({ queryKey: ["supabase-sync"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create user");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <UsersImportBar
        existingEmails={users.map((u) => u.email)}
        onImportRow={async (row) => {
          await createUser(row);
          qc.invalidateQueries({ queryKey: ["supabase-sync"] });
        }}
      />
      <div className="rounded-xl border border-border bg-background p-4">
        <button
          onClick={() => setIsAddUserOpen(!isAddUserOpen)}
          className="flex w-full items-center justify-between font-display text-sm font-bold text-foreground hover:opacity-80"
        >
          <span>Add new user</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isAddUserOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isAddUserOpen && (
          <div className="mt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name (EN)" required>
                <input
                  value={draft.name}
                  onChange={(e) => upd({ name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Full name (AR)">
                <input
                  value={draft.nameAr ?? ""}
                  onChange={(e) => upd({ nameAr: e.target.value })}
                  dir="rtl"
                  className={inputCls}
                />
              </Field>
              <Field label="Email" required>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => upd({ email: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Password" required>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="min 6 characters"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={draft.phone ?? ""}
                  onChange={(e) => upd({ phone: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Role">
                <select
                  value={draft.role}
                  onChange={(e) => upd({ role: e.target.value as UserRoleKey })}
                  className={`${inputCls} capitalize`}
                >
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Manager">
                <select
                  value={draft.managerId ?? ""}
                  onChange={(e) => upd({ managerId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">— Select manager —</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.profileId ?? m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Active">
                <select
                  value={draft.active ? "1" : "0"}
                  onChange={(e) => upd({ active: e.target.value === "1" })}
                  className={inputCls}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </Field>
              <Field label="Position">
                <select
                  value={selectedPosId}
                  onChange={(e) => onSelectPosition(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select position —</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn}
                      {p.nameAr ? ` · ${p.nameAr}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Department">
                <select
                  value={selectedDeptId}
                  onChange={(e) => onSelectDepartment(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select department —</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameEn}
                      {d.nameAr ? ` · ${d.nameAr}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Location (EN)">
                <input
                  value={draft.locationEn ?? ""}
                  onChange={(e) => upd({ locationEn: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Location (AR)">
                <input
                  value={draft.locationAr ?? ""}
                  onChange={(e) => upd({ locationAr: e.target.value })}
                  dir="rtl"
                  className={inputCls}
                />
              </Field>
              <Field label="Avatar URL">
                <input
                  value={draft.avatarUrl ?? ""}
                  onChange={(e) => upd({ avatarUrl: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="Target type">
                <select
                  value={draft.targetType ?? "yearly"}
                  onChange={(e) => upd({ targetType: e.target.value as any })}
                  className={inputCls}
                >
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>
              <Field label="Skills (comma-separated)">
                <input
                  value={skillsText}
                  onChange={(e) => {
                    setSkillsText(e.target.value);
                    upd({
                      skills: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    });
                  }}
                  className={inputCls}
                />
              </Field>
              <Field label="Employment start date">
                <input
                  type="date"
                  value={(draft as any).startDate ?? ""}
                  onChange={(e) => upd({ startDate: e.target.value } as any)}
                  className={inputCls}
                />
              </Field>
              <Field label="Annual target">
                <input
                  type="number"
                  min={0}
                  value={(draft as any).annualTarget ?? 0}
                  onChange={(e) => upd({ annualTarget: Number(e.target.value) } as any)}
                  className={inputCls}
                />
              </Field>
              <Field label="Q1 target">
                <input
                  type="number"
                  min={0}
                  value={(draft as any).q1Target ?? 0}
                  onChange={(e) => upd({ q1Target: Number(e.target.value) } as any)}
                  className={inputCls}
                />
              </Field>
              <Field label="Q2 target">
                <input
                  type="number"
                  min={0}
                  value={(draft as any).q2Target ?? 0}
                  onChange={(e) => upd({ q2Target: Number(e.target.value) } as any)}
                  className={inputCls}
                />
              </Field>
              <Field label="Q3 target">
                <input
                  type="number"
                  min={0}
                  value={(draft as any).q3Target ?? 0}
                  onChange={(e) => upd({ q3Target: Number(e.target.value) } as any)}
                  className={inputCls}
                />
              </Field>
              <Field label="Q4 target">
                <input
                  type="number"
                  min={0}
                  value={(draft as any).q4Target ?? 0}
                  onChange={(e) => upd({ q4Target: Number(e.target.value) } as any)}
                  className={inputCls}
                />
              </Field>
              <Field label="Meetings per week (target)">
                <input
                  type="number"
                  min={0}
                  value={(draft as any).weeklyMeetingsTarget ?? 0}
                  onChange={(e) => upd({ weeklyMeetingsTarget: Number(e.target.value) } as any)}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                disabled={busy}
                onClick={submit}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> {busy ? "Creating…" : "Add user"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-foreground">Users Directory</h3>
        <div className="relative w-64">
          <Search
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            style={{ insetInlineStart: "0.75rem" }}
          />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ paddingInlineStart: "2.25rem" }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">Name</th>
              <th className="px-3 py-2 text-start">Email</th>
              <th className="px-3 py-2 text-start">Role</th>
              <th className="px-3 py-2 text-start">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {Object.keys(settings.permissions).length} role profiles configured.
      </p>
    </div>
  );
}

function BilingualImportBar({
  label,
  templateName,
  sheetName,
  sampleRows,
  existingEn,
  onImportRow,
}: {
  label: string;
  templateName: string;
  sheetName: string;
  sampleRows: string[][];
  existingEn: string[];
  onImportRow: (row: { en: string; ar: string }) => Promise<void>;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const rows = [["Name (EN)", "Name (AR)"], ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 28 }, { wch: 28 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, templateName);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const seen = new Set(existingEn.map((s) => s.trim().toLowerCase()));
      let ok = 0,
        fail = 0,
        dup = 0;
      for (const r of rows) {
        const get = (keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(r).find((x) => x.trim().toLowerCase() === k.toLowerCase());
            if (found) return String(r[found] ?? "").trim();
          }
          return "";
        };
        const en = get([
          "Name (EN)",
          "Name EN",
          "name_en",
          "name",
          "Name",
          "Title (EN)",
          "Title EN",
          "title_en",
          "title",
          "Title",
        ]);
        const ar = get(["Name (AR)", "Name AR", "name_ar", "Title (AR)", "Title AR", "title_ar"]);
        if (!en) continue;
        const key = en.toLowerCase();
        if (seen.has(key)) {
          dup++;
          continue;
        }
        seen.add(key);
        try {
          await onImportRow({ en, ar });
          ok++;
        } catch {
          fail++;
        }
      }
      toast.success(
        `Imported ${ok} ${label}${dup ? ` · ${dup} duplicate${dup === 1 ? "" : "s"} skipped` : ""}${fail ? ` · ${fail} failed` : ""}`,
      );
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-background p-3">
      <span className="text-xs font-semibold text-muted-foreground">Bulk import:</span>
      <button
        onClick={downloadTemplate}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
      >
        <Download className="h-3.5 w-3.5" /> Download template
      </button>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        <Upload className="h-3.5 w-3.5" /> {busy ? "Importing…" : "Import from Excel"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleImport}
        className="hidden"
      />
      <span className="ms-auto text-[11px] text-muted-foreground">
        Columns: Name (EN), Name (AR)
      </span>
    </div>
  );
}

const PAGE_SIZE = 10;

function PageBar({
  page,
  setPage,
  total,
  pageSize,
}: {
  page: number;
  setPage: (n: number) => void;
  total: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(page, pages);
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
      <span>
        Showing {(cur - 1) * pageSize + 1}–{Math.min(cur * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setPage(Math.max(1, cur - 1))}
          disabled={cur <= 1}
          className="rounded border border-border bg-card px-2 py-1 font-semibold text-foreground hover:bg-accent disabled:opacity-50"
        >
          Prev
        </button>
        <span className="px-2">
          Page {cur} / {pages}
        </span>
        <button
          onClick={() => setPage(Math.min(pages, cur + 1))}
          disabled={cur >= pages}
          className="rounded border border-border bg-card px-2 py-1 font-semibold text-foreground hover:bg-accent disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function DepartmentsEditor() {
  const { settings } = useStoreState();
  const qc = useQueryClient();
  const addFn = adminAddDepartment;
  const delFn = adminDeleteDepartment;
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const items = settings.departments ?? [];
  const existingEn = items.map((d) => d.nameEn);
  const existingSet = new Set(existingEn.map((s) => s.trim().toLowerCase()));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const add = async () => {
    const name = en.trim();
    if (!name) return;
    if (existingSet.has(name.toLowerCase())) {
      toast.error("Department already exists");
      return;
    }
    setBusy(true);
    try {
      await addFn({ name_en: name, name_ar: ar.trim() || null });
      setEn("");
      setAr("");
      qc.invalidateQueries({ queryKey: ["supabase-sync"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    try {
      await delFn({ id });
      qc.invalidateQueries({ queryKey: ["supabase-sync"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };
  return (
    <div className="space-y-4">
      <BilingualImportBar
        label="departments"
        templateName="departments-template.xlsx"
        sheetName="Departments"
        sampleRows={[
          ["Sales", "المبيعات"],
          ["Engineering", "الهندسة"],
          ["Finance", "المالية"],
        ]}
        existingEn={existingEn}
        onImportRow={async ({ en, ar }) => {
          await addFn({ name_en: en, name_ar: ar || null });
          qc.invalidateQueries({ queryKey: ["supabase-sync"] });
        }}
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={en}
          onChange={(e) => setEn(e.target.value)}
          placeholder="Name (EN)"
          className={inputCls}
        />
        <input
          value={ar}
          onChange={(e) => setAr(e.target.value)}
          placeholder="الاسم (AR)"
          dir="rtl"
          className={inputCls}
        />
        <button
          onClick={add}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {pageItems.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{d.nameEn}</span>
              {d.nameAr && (
                <span className="text-xs text-muted-foreground" dir="rtl">
                  {d.nameAr}
                </span>
              )}
            </div>
            <button
              onClick={() => remove(d.id)}
              className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">No departments yet</div>
        )}
      </div>
      <PageBar page={page} setPage={setPage} total={items.length} pageSize={PAGE_SIZE} />
    </div>
  );
}

function PositionsEditor() {
  const { settings } = useStoreState();
  const qc = useQueryClient();
  const addFn = adminAddPosition;
  const delFn = adminDeletePosition;
  const [en, setEn] = useState("");
  const [ar, setAr] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const items = settings.positions ?? [];
  const existingEn = items.map((p) => p.nameEn);
  const existingSet = new Set(existingEn.map((s) => s.trim().toLowerCase()));
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const add = async () => {
    const name = en.trim();
    if (!name) return;
    if (existingSet.has(name.toLowerCase())) {
      toast.error("Position already exists");
      return;
    }
    setBusy(true);
    try {
      await addFn({ name_en: name, name_ar: ar.trim() || null });
      setEn("");
      setAr("");
      qc.invalidateQueries({ queryKey: ["supabase-sync"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this position?")) return;
    try {
      await delFn({ id });
      qc.invalidateQueries({ queryKey: ["supabase-sync"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };
  return (
    <div className="space-y-4">
      <BilingualImportBar
        label="positions"
        templateName="positions-template.xlsx"
        sheetName="Positions"
        sampleRows={[
          ["Sales Manager", "مدير مبيعات"],
          ["Engineer", "مهندس"],
          ["Accountant", "محاسب"],
        ]}
        existingEn={existingEn}
        onImportRow={async ({ en, ar }) => {
          await addFn({ name_en: en, name_ar: ar || null });
          qc.invalidateQueries({ queryKey: ["supabase-sync"] });
        }}
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={en}
          onChange={(e) => setEn(e.target.value)}
          placeholder="Title (EN)"
          className={inputCls}
        />
        <input
          value={ar}
          onChange={(e) => setAr(e.target.value)}
          placeholder="المسمى (AR)"
          dir="rtl"
          className={inputCls}
        />
        <button
          onClick={add}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border">
        {pageItems.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">{p.nameEn}</span>
              {p.nameAr && (
                <span className="text-xs text-muted-foreground" dir="rtl">
                  {p.nameAr}
                </span>
              )}
            </div>
            <button
              onClick={() => remove(p.id)}
              className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">No positions yet</div>
        )}
      </div>
      <PageBar page={page} setPage={setPage} total={items.length} pageSize={PAGE_SIZE} />
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </div>
      {children}
    </label>
  );
}

function UserRow({ user }: { user: AppUser }) {
  const { settings, users } = useStoreState();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<AppUser>(user);
  const [skillsText, setSkillsText] = useState((user.skills ?? []).join(", "));
  const upd = (patch: Partial<AppUser>) => setDraft((d) => ({ ...d, ...patch }));
  const departments = settings.departments ?? [];
  const positions = settings.positions ?? [];
  const selectedDeptId = departments.find((d) => d.nameEn === draft.departmentEn)?.id ?? "";
  const selectedPosId = positions.find((p) => p.nameEn === draft.titleEn)?.id ?? "";
  const managers = users.filter((u) => u.role === "manager" && u.id !== user.id);

  if (edit) {
    return (
      <tr className="bg-background align-top">
        <td colSpan={5} className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name (EN)" required>
              <input
                value={draft.name}
                onChange={(e) => upd({ name: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Full name (AR)">
              <input
                value={draft.nameAr ?? ""}
                onChange={(e) => upd({ nameAr: e.target.value })}
                dir="rtl"
                className={inputCls}
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => upd({ email: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Phone">
              <input
                value={draft.phone ?? ""}
                onChange={(e) => upd({ phone: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Role">
              <select
                value={draft.role}
                onChange={(e) => upd({ role: e.target.value as UserRoleKey })}
                className={`${inputCls} capitalize`}
              >
                {USER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Manager">
              <select
                value={draft.managerId ?? ""}
                onChange={(e) => upd({ managerId: e.target.value || undefined })}
                className={inputCls}
              >
                <option value="">— No manager —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.profileId ?? m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Active">
              <select
                value={draft.active ? "1" : "0"}
                onChange={(e) => upd({ active: e.target.value === "1" })}
                className={inputCls}
              >
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </Field>
            <Field label="Position">
              <select
                value={selectedPosId}
                onChange={(e) => {
                  const p = positions.find((x) => x.id === e.target.value);
                  upd({ titleEn: p?.nameEn ?? "", titleAr: p?.nameAr ?? "" });
                }}
                className={inputCls}
              >
                <option value="">— Select position —</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameEn}
                    {p.nameAr ? ` · ${p.nameAr}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  const d = departments.find((x) => x.id === e.target.value);
                  upd({ departmentEn: d?.nameEn ?? "", departmentAr: d?.nameAr ?? "" });
                }}
                className={inputCls}
              >
                <option value="">— Select department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameEn}
                    {d.nameAr ? ` · ${d.nameAr}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Location (EN)">
              <input
                value={draft.locationEn ?? ""}
                onChange={(e) => upd({ locationEn: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Location (AR)">
              <input
                value={draft.locationAr ?? ""}
                onChange={(e) => upd({ locationAr: e.target.value })}
                dir="rtl"
                className={inputCls}
              />
            </Field>
            <Field label="Avatar URL">
              <input
                value={draft.avatarUrl ?? ""}
                onChange={(e) => upd({ avatarUrl: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Target type">
              <select
                value={draft.targetType ?? "yearly"}
                onChange={(e) => upd({ targetType: e.target.value as any })}
                className={inputCls}
              >
                <option value="yearly">Yearly</option>
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
            <Field label="Annual target">
              <input
                type="number"
                min={0}
                value={(draft as any).annualTarget ?? draft.targetValue ?? 0}
                onChange={(e) =>
                  upd({
                    annualTarget: Number(e.target.value),
                    targetValue: Number(e.target.value),
                  } as any)
                }
                className={inputCls}
              />
            </Field>
            <Field label="Skills (comma-separated)">
              <input
                value={skillsText}
                onChange={(e) => {
                  setSkillsText(e.target.value);
                  upd({
                    skills: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                }}
                className={inputCls}
              />
            </Field>
            <Field label="Employment start date">
              <input
                type="date"
                value={(draft as any).startDate ?? ""}
                onChange={(e) => upd({ startDate: e.target.value } as any)}
                className={inputCls}
              />
            </Field>
            <Field label="Q1 target">
              <input
                type="number"
                min={0}
                value={(draft as any).q1Target ?? 0}
                onChange={(e) => upd({ q1Target: Number(e.target.value) } as any)}
                className={inputCls}
              />
            </Field>
            <Field label="Q2 target">
              <input
                type="number"
                min={0}
                value={(draft as any).q2Target ?? 0}
                onChange={(e) => upd({ q2Target: Number(e.target.value) } as any)}
                className={inputCls}
              />
            </Field>
            <Field label="Q3 target">
              <input
                type="number"
                min={0}
                value={(draft as any).q3Target ?? 0}
                onChange={(e) => upd({ q3Target: Number(e.target.value) } as any)}
                className={inputCls}
              />
            </Field>
            <Field label="Q4 target">
              <input
                type="number"
                min={0}
                value={(draft as any).q4Target ?? 0}
                onChange={(e) => upd({ q4Target: Number(e.target.value) } as any)}
                className={inputCls}
              />
            </Field>
            <Field label="Meetings per week (target)">
              <input
                type="number"
                min={0}
                value={(draft as any).weeklyMeetingsTarget ?? 0}
                onChange={(e) => upd({ weeklyMeetingsTarget: Number(e.target.value) } as any)}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setDraft(user);
                setSkillsText((user.skills ?? []).join(", "));
                setEdit(false);
              }}
              className="rounded border border-border px-3 py-1.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const { validateProfilePatch } = await import("@/lib/supabaseWrites");
                const err = validateProfilePatch(draft, { selfProfileId: user.profileId });
                if (err) {
                  (await import("sonner")).toast.error(err);
                  return;
                }
                actions.updateUser(user.id, draft);
                (await import("sonner")).toast.success("Profile saved");
                setEdit(false);
              }}
              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <Check className="h-3 w-3" /> Save
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-background">
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : null}
          <div>
            <div className="font-semibold text-foreground">{user.name}</div>
            {user.titleEn && (
              <div className="text-[11px] text-muted-foreground">{user.titleEn}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
      <td className="px-3 py-2">
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold capitalize text-primary">
          {user.role}
        </span>
      </td>
      <td className="px-3 py-2">
        <button
          onClick={() => actions.updateUser(user.id, { active: !user.active })}
          className={`relative h-5 w-9 rounded-full transition ${user.active ? "bg-primary" : "bg-muted"}`}
          aria-label="Toggle active"
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${user.active ? "left-[18px]" : "left-0.5"}`}
          />
        </button>
      </td>
      <td className="px-3 py-2 text-end">
        <div className="inline-flex items-center gap-2">
          <button
            onClick={() => setEdit(true)}
            className="rounded border border-border px-2 py-1 text-xs font-semibold"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete ${user.name}?`)) actions.removeUser(user.id);
            }}
            className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PermissionsMatrix() {
  const { settings } = useStoreState();
  const CRUD: CrudOp[] = ["create", "read", "update", "delete"];
  return (
    <div className="space-y-4">
      {USER_ROLES.map((role) => (
        <div key={role} className="rounded-xl border border-border bg-background p-4">
          <div className="mb-3 font-display text-sm font-bold capitalize text-foreground">
            {role}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-start font-semibold">Page</th>
                  {CRUD.map((op) => (
                    <th key={op} className="px-2 py-1 text-center font-semibold capitalize">
                      {op}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {APP_PAGES.map((page) => {
                  const ops = settings.permissions[role]?.crud[page] ?? [];
                  return (
                    <tr key={page} className="border-t border-border">
                      <td className="px-2 py-1.5 font-semibold capitalize text-foreground">
                        {page}
                      </td>
                      {CRUD.map((op) => {
                        const checked = ops.includes(op);
                        return (
                          <td key={op} className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={role === "admin"}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? Array.from(new Set([...ops, op]))
                                  : ops.filter((x) => x !== op);
                                actions.setRolePermission(
                                  role as UserRoleKey,
                                  page as AppPage,
                                  next,
                                );
                              }}
                              className="h-4 w-4 cursor-pointer accent-primary"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Admin role always has full access.</p>
    </div>
  );
}

type LocationRow = {
  id: string;
  city_en: string;
  city_ar: string | null;
  districts_en: string[];
  districts_ar: string[];
};

function LocationsEditor(_props: { cities?: unknown }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: rows = [], refetch } = useQuery({
    queryKey: ["locations-admin"],
    queryFn: async (): Promise<LocationRow[]> => {
      const { data, error } = await supabase.from("locations").select("*").order("city_en");
      if (error) throw error;
      return (data ?? []) as LocationRow[];
    },
  });
  const invalidate = () => {
    void refetch();
    qc.invalidateQueries({ queryKey: ["supabase-sync"] });
  };

  const cities = rows.map((r) => ({
    id: r.id,
    name: r.city_en,
    nameAr: r.city_ar ?? undefined,
    districts: r.districts_en ?? [],
    districtsAr: Object.fromEntries(
      (r.districts_en ?? []).map((d, i) => [d, (r.districts_ar ?? [])[i] ?? ""]),
    ) as Record<string, string>,
  }));

  async function dbAddCity(name: string, nameAr?: string) {
    const exists = rows.find((r) => r.city_en.toLowerCase() === name.toLowerCase());
    if (exists) {
      if (nameAr) await dbUpdateCityAr(exists.id, nameAr);
      return;
    }
    const { error } = await supabase
      .from("locations")
      .insert({ city_en: name, city_ar: nameAr ?? null, districts_en: [], districts_ar: [] });
    if (error) throw error;
  }
  async function dbRemoveCity(id: string) {
    const { error } = await supabase.from("locations").delete().eq("id", id);
    if (error) throw error;
  }
  async function dbUpdateCityAr(id: string, nameAr: string) {
    const { error } = await supabase
      .from("locations")
      .update({ city_ar: nameAr || null })
      .eq("id", id);
    if (error) throw error;
  }
  async function dbAddDistrict(row: LocationRow, dEn: string, dAr?: string) {
    if ((row.districts_en ?? []).some((x) => x.toLowerCase() === dEn.toLowerCase())) return;
    const nextEn = [...(row.districts_en ?? []), dEn];
    const nextAr = [...(row.districts_ar ?? []), dAr ?? ""];
    const { error } = await supabase
      .from("locations")
      .update({ districts_en: nextEn, districts_ar: nextAr })
      .eq("id", row.id);
    if (error) throw error;
  }
  async function dbRemoveDistrict(row: LocationRow, dEn: string) {
    const idx = (row.districts_en ?? []).indexOf(dEn);
    if (idx < 0) return;
    const nextEn = (row.districts_en ?? []).filter((_, i) => i !== idx);
    const nextAr = (row.districts_ar ?? []).filter((_, i) => i !== idx);
    const { error } = await supabase
      .from("locations")
      .update({ districts_en: nextEn, districts_ar: nextAr })
      .eq("id", row.id);
    if (error) throw error;
  }

  const rowById = new Map(rows.map((r) => [r.id, r] as const));

  const [newCity, setNewCity] = useState("");
  const [newCityAr, setNewCityAr] = useState("");
  const [newDistrict, setNewDistrict] = useState<Record<string, { en: string; ar: string }>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const rows = [
      ["City (EN)", "City (AR)", "District (EN)", "District (AR)"],
      ["Cairo", "القاهرة", "Nasr City", "مدينة نصر"],
      ["Cairo", "القاهرة", "Maadi", "المعادي"],
      ["Giza", "الجيزة", "Dokki", "الدقي"],
      ["Alexandria", "الإسكندرية", "Smouha", "سموحة"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Locations");
    XLSX.writeFile(wb, "locations-template.xlsx");
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const xlsxRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      let cityCount = 0,
        districtCount = 0;
      // Build a working map of city_en -> {row, en[], ar[]} we mutate locally then persist.
      const work = new Map<
        string,
        {
          id: string | null;
          city_en: string;
          city_ar: string | null;
          en: string[];
          ar: string[];
          touched: boolean;
        }
      >();
      for (const r of rows)
        work.set(r.city_en.toLowerCase(), {
          id: r.id,
          city_en: r.city_en,
          city_ar: r.city_ar,
          en: [...(r.districts_en ?? [])],
          ar: [...(r.districts_ar ?? [])],
          touched: false,
        });
      for (const r of xlsxRows) {
        const get = (keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(r).find((x) => x.trim().toLowerCase() === k.toLowerCase());
            if (found) return String(r[found] ?? "").trim();
          }
          return "";
        };
        const cityEn = get(["City (EN)", "City EN", "city_en", "city", "City"]);
        const cityAr = get(["City (AR)", "City AR", "city_ar"]);
        const distEn = get(["District (EN)", "District EN", "district_en", "district", "District"]);
        const distAr = get(["District (AR)", "District AR", "district_ar"]);
        if (!cityEn) continue;
        const key = cityEn.toLowerCase();
        let entry = work.get(key);
        if (!entry) {
          entry = {
            id: null,
            city_en: cityEn,
            city_ar: cityAr || null,
            en: [],
            ar: [],
            touched: true,
          };
          work.set(key, entry);
          cityCount++;
        } else if (cityAr && entry.city_ar !== cityAr) {
          entry.city_ar = cityAr;
          entry.touched = true;
        }
        if (distEn && !entry.en.some((x) => x.toLowerCase() === distEn.toLowerCase())) {
          entry.en.push(distEn);
          entry.ar.push(distAr || "");
          entry.touched = true;
          districtCount++;
        }
      }
      const ops: Array<Promise<{ error: any }>> = [];
      const newInserts: any[] = [];
      for (const e2 of work.values()) {
        if (!e2.touched) continue;
        if (e2.id)
          ops.push(
            Promise.resolve(
              supabase
                .from("locations")
                .update({ city_ar: e2.city_ar, districts_en: e2.en, districts_ar: e2.ar })
                .eq("id", e2.id) as any,
            ),
          );
        else
          newInserts.push({
            city_en: e2.city_en,
            city_ar: e2.city_ar,
            districts_en: e2.en,
            districts_ar: e2.ar,
          });
      }
      if (newInserts.length)
        ops.push(Promise.resolve(supabase.from("locations").insert(newInserts) as any));
      const results = await Promise.all(ops);
      const errs = results.map((x: any) => x?.error).filter(Boolean);
      if (errs.length) throw new Error(errs[0].message);

      toast.success(`Imported ${cityCount} cities, ${districtCount} districts`);
      invalidate();
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-background p-3">
        <span className="text-xs font-semibold text-muted-foreground">Bulk import:</span>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
        >
          <Download className="h-3.5 w-3.5" /> Download template
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Upload className="h-3.5 w-3.5" /> Import from Excel
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleImport}
          className="hidden"
        />
        <span className="ms-auto text-[11px] text-muted-foreground">
          Columns: City (EN), City (AR), District (EN), District (AR)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
          placeholder="City (EN)"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <input
          value={newCityAr}
          onChange={(e) => setNewCityAr(e.target.value)}
          placeholder="المدينة (AR)"
          dir="rtl"
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={async () => {
            if (!newCity.trim()) return;
            try {
              await dbAddCity(newCity.trim(), newCityAr.trim() || undefined);
              setNewCity("");
              setNewCityAr("");
              invalidate();
            } catch (e: any) {
              toast.error(e?.message ?? "Failed");
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> {t("addCity")}
        </button>
      </div>
      <div className="space-y-3">
        {cities.map((c) => {
          const draft = newDistrict[c.name] ?? { en: "", ar: "" };
          const isOpen = expanded.has(c.name);
          return (
            <div key={c.name} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggle(c.name)}
                  className="inline-flex flex-wrap items-center gap-2 text-start"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-display text-base font-bold text-foreground">{c.name}</span>
                  {c.nameAr && (
                    <span className="text-xs text-muted-foreground" dir="rtl">
                      {c.nameAr}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">({c.districts.length})</span>
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`${t("removeCity")} "${c.name}"?`)) {
                      try {
                        await dbRemoveCity(c.id);
                        invalidate();
                      } catch (e: any) {
                        toast.error(e?.message ?? "Failed");
                      }
                    }
                  }}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  {t("remove")}
                </button>
              </div>
              {isOpen && (
                <div className="mt-3 space-y-3">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">AR name:</span>
                    <input
                      defaultValue={c.nameAr ?? ""}
                      onBlur={async (e) => {
                        if ((e.target.value || "") !== (c.nameAr ?? "")) {
                          try {
                            await dbUpdateCityAr(c.id, e.target.value);
                            invalidate();
                          } catch (er: any) {
                            toast.error(er?.message ?? "Failed");
                          }
                        }
                      }}
                      placeholder="AR name"
                      dir="rtl"
                      className="h-7 w-40 rounded-md border border-border bg-card px-2 text-xs focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.districts.map((d) => {
                      const ar = c.districtsAr?.[d];
                      return (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-border"
                        >
                          {d}
                          {ar && (
                            <span className="text-muted-foreground" dir="rtl">
                              / {ar}
                            </span>
                          )}
                          <button
                            onClick={async () => {
                              const row = rowById.get(c.id);
                              if (!row) return;
                              try {
                                await dbRemoveDistrict(row, d);
                                invalidate();
                              } catch (er: any) {
                                toast.error(er?.message ?? "Failed");
                              }
                            }}
                            className="text-muted-foreground hover:text-rose-600"
                            aria-label={`Remove ${d}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                    {c.districts.length === 0 && (
                      <span className="text-xs text-muted-foreground">{t("noDistrictsYet")}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={draft.en}
                      onChange={(e) =>
                        setNewDistrict({
                          ...newDistrict,
                          [c.name]: { ...draft, en: e.target.value },
                        })
                      }
                      placeholder={`${t("addDistrictTo")} ${c.name} (EN)`}
                      className="h-9 rounded-md border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
                    />
                    <input
                      value={draft.ar}
                      onChange={(e) =>
                        setNewDistrict({
                          ...newDistrict,
                          [c.name]: { ...draft, ar: e.target.value },
                        })
                      }
                      placeholder="الحي (AR)"
                      dir="rtl"
                      className="h-9 rounded-md border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        const v = draft.en.trim();
                        if (!v) return;
                        const row = rowById.get(c.id);
                        if (!row) return;
                        try {
                          await dbAddDistrict(row, v, draft.ar.trim() || undefined);
                          setNewDistrict({ ...newDistrict, [c.name]: { en: "", ar: "" } });
                          invalidate();
                        } catch (er: any) {
                          toast.error(er?.message ?? "Failed");
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-3.5 w-3.5" /> {t("add")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusesEditor() {
  const { settings } = useStoreState();
  const { t } = useI18n();
  const [val, setVal] = useState("");
  const PROTECTED = new Set(["new", "won", "lost"]);
  const add = () => {
    if (!val.trim()) return;
    actions.addStatus(val.trim());
    setVal("");
  };
  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="e.g. Meeting Scheduled, Proposal Sent, Archived"
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={add}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {settings.statuses.map((s) => {
          const stage = settings.stages.find((st) => st.key === s);
          const label = stage?.label ?? t(s as any) ?? s;
          const locked = PROTECTED.has(s);
          return (
            <span
              key={s}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ring-1"
              style={{
                background: `${stage?.color ?? "#64748b"}1a`,
                color: stage?.color ?? "#64748b",
                borderColor: stage?.color,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: stage?.color ?? "#64748b" }}
              />
              {label}
              {!locked && (
                <button
                  onClick={() => actions.removeStatus(s)}
                  className="ml-1 rounded p-0.5 text-current/70 hover:bg-black/10"
                  aria-label={`Remove ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Statuses sync to the pipeline, lead forms, and filters. New, Won, and Lost are protected and
        can't be removed.
      </p>
    </div>
  );
}

function StageRow({
  stageKey,
  label,
  color,
  index,
  total,
}: {
  stageKey: string;
  label: string;
  color: string;
  index: number;
  total: number;
}) {
  const { t } = useI18n();
  const [val, setVal] = useState(label);
  const [dragOver, setDragOver] = useState<"top" | "bottom" | null>(null);
  const dirty = val !== label;
  const locked = ["new", "won", "lost"].includes(stageKey);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/stage-index", String(index));
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setDragOver(e.clientY < rect.top + rect.height / 2 ? "top" : "bottom");
      }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        const fromStr = e.dataTransfer.getData("text/stage-index");
        const from = Number(fromStr);
        if (Number.isNaN(from) || from === index) {
          setDragOver(null);
          return;
        }
        let to = dragOver === "bottom" ? index + 1 : index;
        if (from < to) to -= 1;
        if (to < 0) to = 0;
        if (to > total - 1) to = total - 1;
        actions.reorderStages(from, to);
        setDragOver(null);
      }}
      className={`relative flex items-center gap-3 rounded-lg border bg-background p-3 transition ${dragOver ? "border-primary" : "border-border"}`}
    >
      {dragOver === "top" && (
        <span className="absolute inset-x-0 -top-1 h-0.5 rounded bg-primary" />
      )}
      {dragOver === "bottom" && (
        <span className="absolute inset-x-0 -bottom-1 h-0.5 rounded bg-primary" />
      )}
      <span
        className="flex h-7 w-5 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <span className="w-6 text-center font-mono text-[11px] text-muted-foreground">
        {index + 1}
      </span>
      <input
        type="color"
        value={color}
        onChange={(e) => actions.setStageColor(stageKey, e.target.value)}
        className="h-7 w-7 cursor-pointer rounded border border-border bg-transparent p-0"
        aria-label="Stage color"
      />
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {t(stageKey as any) ?? stageKey}
      </span>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="h-9 flex-1 rounded-md border border-border bg-card px-2 text-sm focus:border-primary focus:outline-none"
      />
      <button
        disabled={!dirty}
        onClick={() => actions.renameStage(stageKey, val)}
        className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
          dirty
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Check className="h-3.5 w-3.5" /> {t("save")}
      </button>
      {!locked && (
        <button
          onClick={() => actions.removeStatus(stageKey)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
          aria-label="Delete stage"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ============== Notification Templates (DB-backed) ==============

type TemplateRow = {
  id: string;
  name_en: string;
  name_ar: string | null;
  channel: string;
  subject_en: string | null;
  subject_ar: string | null;
  body_en: string;
  body_ar: string | null;
  enabled: boolean;
};

const CHANNELS = ["Email", "SMS", "WhatsApp", "Push"] as const;

function TemplatesEditor() {
  const { dir } = useI18n();
  const isAr = dir === "rtl";
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const empty: TemplateRow = {
    id: "",
    name_en: "",
    name_ar: "",
    channel: "Email",
    subject_en: "",
    subject_ar: "",
    body_en: "",
    body_ar: "",
    enabled: true,
  };

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_templates")
      .select("*")
      .order("name_en", { ascending: true });
    if (error) toast.error(error.message);
    else setRows((data ?? []) as TemplateRow[]);
    setLoading(false);
  };
  useEffect(() => {
    reload();
  }, []);

  const save = async (row: TemplateRow) => {
    const payload = {
      name_en: row.name_en,
      name_ar: row.name_ar || null,
      channel: row.channel,
      subject_en: row.subject_en || null,
      subject_ar: row.subject_ar || null,
      body_en: row.body_en,
      body_ar: row.body_ar || null,
      enabled: row.enabled,
    };
    if (!row.name_en.trim() || !row.body_en.trim()) {
      toast.error(isAr ? "الاسم ومحتوى الرسالة مطلوبان" : "Name and body are required");
      return;
    }
    const q = row.id
      ? supabase.from("notification_templates").update(payload).eq("id", row.id)
      : supabase.from("notification_templates").insert(payload);
    const { error } = await q;
    if (error) toast.error(error.message);
    else {
      toast.success(isAr ? "تم الحفظ" : "Saved");
      setEditing(null);
      reload();
    }
  };

  const remove = async (id: string) => {
    if (!confirm(isAr ? "حذف هذا القالب؟" : "Delete this template?")) return;
    const { error } = await supabase.from("notification_templates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(isAr ? "تم الحذف" : "Deleted");
      reload();
    }
  };

  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">
            {isAr ? "قوالب الإشعارات" : "Notification Templates"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "إدارة قوالب البريد والرسائل النصية والواتساب والإشعارات."
              : "Manage Email / SMS / WhatsApp / Push templates."}
          </p>
        </div>
        <button
          onClick={() => setEditing(empty)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> {isAr ? "قالب جديد" : "New template"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {isAr ? "جارٍ التحميل..." : "Loading..."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((tp) => (
            <div key={tp.id} className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-foreground">
                  {isAr ? tp.name_ar || tp.name_en : tp.name_en}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tp.enabled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                  >
                    {tp.enabled ? "ON" : "OFF"}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {tp.channel}
                  </span>
                </div>
              </div>
              {(isAr ? tp.subject_ar : tp.subject_en) && (
                <div className="mb-1 text-xs text-muted-foreground">
                  {isAr ? tp.subject_ar : tp.subject_en}
                </div>
              )}
              <div className="mb-3 max-h-24 overflow-hidden rounded-lg bg-secondary/50 p-3 text-xs leading-relaxed text-foreground">
                {isAr ? tp.body_ar || tp.body_en : tp.body_en}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditing(tp)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-accent"
                >
                  {isAr ? "تعديل" : "Edit"}
                </button>
                <button
                  onClick={() => remove(tp.id)}
                  className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="inline h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {isAr ? "لا توجد قوالب بعد." : "No templates yet."}
            </div>
          )}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">
                {editing.id
                  ? isAr
                    ? "تعديل القالب"
                    : "Edit template"
                  : isAr
                    ? "قالب جديد"
                    : "New template"}
              </h3>
              <button onClick={() => setEditing(null)} className="rounded p-1 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TxtField
                label={isAr ? "الاسم (إنجليزي)" : "Name (EN)"}
                value={editing.name_en}
                onChange={(v) => setEditing({ ...editing, name_en: v })}
              />
              <TxtField
                label={isAr ? "الاسم (عربي)" : "Name (AR)"}
                value={editing.name_ar ?? ""}
                onChange={(v) => setEditing({ ...editing, name_ar: v })}
              />
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isAr ? "القناة" : "Channel"}
                </label>
                <select
                  value={editing.channel}
                  onChange={(e) => setEditing({ ...editing, channel: e.target.value })}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-end gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.enabled}
                  onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                />
                <span>{isAr ? "مفعّل" : "Enabled"}</span>
              </label>
              <TxtField
                label={isAr ? "الموضوع (إنجليزي)" : "Subject (EN)"}
                value={editing.subject_en ?? ""}
                onChange={(v) => setEditing({ ...editing, subject_en: v })}
              />
              <TxtField
                label={isAr ? "الموضوع (عربي)" : "Subject (AR)"}
                value={editing.subject_ar ?? ""}
                onChange={(v) => setEditing({ ...editing, subject_ar: v })}
              />
              <TxtField
                label={isAr ? "المحتوى (إنجليزي)" : "Body (EN)"}
                value={editing.body_en}
                onChange={(v) => setEditing({ ...editing, body_en: v })}
                textarea
                className="md:col-span-2"
              />
              <TxtField
                label={isAr ? "المحتوى (عربي)" : "Body (AR)"}
                value={editing.body_ar ?? ""}
                onChange={(v) => setEditing({ ...editing, body_ar: v })}
                textarea
                className="md:col-span-2"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {isAr
                ? "استخدم متغيرات مثل {{name}} و {{lead}} داخل النص."
                : "Use variables like {{name}}, {{lead}} inside the body."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={() => save(editing)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {isAr ? "حفظ" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TxtField({
  label,
  value,
  onChange,
  textarea,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
        />
      )}
    </div>
  );
}

// ============== SMTP Settings (DB-backed) ==============

type SmtpRow = {
  id: number;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  reply_to: string | null;
  enabled: boolean;
};

const HOSTINGER_DEFAULTS: Omit<
  SmtpRow,
  "id" | "username" | "password" | "from_email" | "from_name" | "reply_to" | "enabled"
> = {
  provider: "hostinger",
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
};

function SmtpEditor() {
  const { dir } = useI18n();
  const isAr = dir === "rtl";
  const [row, setRow] = useState<SmtpRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("smtp_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) toast.error(error.message);
      else
        setRow(
          (data as SmtpRow) ?? {
            id: 1,
            ...HOSTINGER_DEFAULTS,
            username: "",
            password: "",
            from_email: "",
            from_name: "INT-CRM",
            reply_to: "",
            enabled: false,
          },
        );
      setLoading(false);
    })();
  }, []);

  const applyHostinger = () => {
    if (!row) return;
    setRow({ ...row, ...HOSTINGER_DEFAULTS });
    toast.success(isAr ? "تم تطبيق إعدادات Hostinger" : "Hostinger defaults applied");
  };

  const save = async () => {
    if (!row) return;
    if (row.enabled && (!row.host || !row.username || !row.password || !row.from_email)) {
      toast.error(
        isAr
          ? "أدخل المضيف واسم المستخدم وكلمة المرور والبريد المرسل قبل التفعيل"
          : "Host, username, password and from-email are required to enable sending",
      );
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("smtp_settings")
      .upsert({ ...row, id: 1, updated_by: (await supabase.auth.getUser()).data.user?.id ?? null });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success(isAr ? "تم حفظ إعدادات SMTP" : "SMTP settings saved");
  };

  if (loading || !row) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {isAr ? "جارٍ التحميل..." : "Loading..."}
      </div>
    );
  }

  return (
    <section>
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">
            {isAr ? "إعدادات SMTP" : "SMTP / Outgoing Email"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAr
              ? "تُستخدم لإرسال إشعارات البريد. الافتراضي: Hostinger."
              : "Used to send notification emails. Default provider: Hostinger."}
          </p>
        </div>
        <button
          onClick={applyHostinger}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-accent"
        >
          <Mail className="h-4 w-4" /> {isAr ? "افتراضات Hostinger" : "Use Hostinger defaults"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            {isAr ? "المزود" : "Provider"}
          </label>
          <select
            value={row.provider}
            onChange={(e) => setRow({ ...row, provider: e.target.value })}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            <option value="hostinger">Hostinger</option>
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook / Office 365</option>
            <option value="sendgrid">SendGrid</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={row.enabled}
            onChange={(e) => setRow({ ...row, enabled: e.target.checked })}
          />
          <span>{isAr ? "تفعيل الإرسال" : "Enable outgoing email"}</span>
        </label>

        <TxtField
          label={isAr ? "المضيف" : "SMTP Host"}
          value={row.host}
          onChange={(v) => setRow({ ...row, host: v })}
        />
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            {isAr ? "المنفذ" : "Port"}
          </label>
          <input
            type="number"
            value={row.port}
            onChange={(e) => setRow({ ...row, port: Number(e.target.value) || 0 })}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
        </div>

        <label className="flex items-end gap-2 text-sm">
          <input
            type="checkbox"
            checked={row.secure}
            onChange={(e) => setRow({ ...row, secure: e.target.checked })}
          />
          <span>{isAr ? "اتصال آمن (SSL/TLS)" : "Use SSL/TLS"}</span>
        </label>
        <TxtField
          label={isAr ? "اسم المستخدم" : "Username"}
          value={row.username}
          onChange={(v) => setRow({ ...row, username: v })}
        />

        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            {isAr ? "كلمة المرور" : "Password"}
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={row.password}
              onChange={(e) => setRow({ ...row, password: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 pe-10 text-sm"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label="toggle password"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <TxtField
          label={isAr ? "البريد المرسل منه" : "From email"}
          value={row.from_email}
          onChange={(v) => setRow({ ...row, from_email: v })}
        />

        <TxtField
          label={isAr ? "اسم المرسل" : "From name"}
          value={row.from_name}
          onChange={(v) => setRow({ ...row, from_name: v })}
        />
        <TxtField
          label={isAr ? "الرد على" : "Reply-to (optional)"}
          value={row.reply_to ?? ""}
          onChange={(v) => setRow({ ...row, reply_to: v })}
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
        <span>
          {isAr
            ? "كلمة المرور محفوظة في قاعدة البيانات وتُحمى بصلاحيات المدير فقط."
            : "Password is stored in the database and protected by admin-only RLS."}
        </span>
        <button
          disabled={saving}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{" "}
          {isAr ? "حفظ" : "Save SMTP"}
        </button>
      </div>
    </section>
  );
}

// ============== Send Email (queue + scheduling) ==============

// ============== User Roles Editor (moved from /admin/users) ==============
type AppRoleKey = "admin" | "manager" | "finance" | "hr" | "employee";
const ALL_APP_ROLES: AppRoleKey[] = ["admin", "manager", "finance", "hr", "employee"];

interface AdminUserRow {
  user_id: string;
  email: string | null;
  auth_created_at: string;
  last_sign_in_at: string | null;
  profile_id: string | null;
  full_name_en: string | null;
  full_name_ar: string | null;
  avatar_url: string | null;
  active: boolean | null;
  roles: AppRoleKey[];
}

function UserRolesEditor() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_users_list" as any);
      if (error) throw error;
      return (data ?? []) as unknown as AdminUserRow[];
    },
  });

  const assign = useMutation({
    mutationFn: async (v: { user_id: string; role: AppRoleKey }) => {
      const { error } = await supabase.rpc("admin_assign_role" as any, {
        _user_id: v.user_id,
        _role: v.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(lang === "ar" ? "تم تعيين الصلاحية" : "Role assigned");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setBusyKey(null);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Failed");
      setBusyKey(null);
    },
  });

  const remove = useMutation({
    mutationFn: async (v: { user_id: string; role: AppRoleKey }) => {
      const { error } = await supabase.rpc("admin_remove_role" as any, {
        _user_id: v.user_id,
        _role: v.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(lang === "ar" ? "تمت إزالة الصلاحية" : "Role removed");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setBusyKey(null);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Failed");
      setBusyKey(null);
    },
  });

  const rows = (usersQ.data ?? []).filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.full_name_en ?? "").toLowerCase().includes(q) ||
      (u.full_name_ar ?? "").includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            style={{ insetInlineStart: "0.75rem" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث بالاسم أو البريد..." : "Search name or email..."}
            className="h-10 w-full rounded-lg border border-border bg-card text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            style={{ paddingInlineStart: "2.25rem", paddingInlineEnd: "0.75rem" }}
          />
        </div>
      </div>

      {usersQ.isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : usersQ.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {(usersQ.error as Error).message}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {lang === "ar" ? "لا يوجد مستخدمون." : "No users found."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-start">{lang === "ar" ? "المستخدم" : "User"}</th>
                <th className="px-4 py-3 text-start">{lang === "ar" ? "البريد" : "Email"}</th>
                <th className="px-4 py-3 text-start">
                  {lang === "ar" ? "آخر دخول" : "Last sign-in"}
                </th>
                <th className="px-4 py-3 text-start">{lang === "ar" ? "الصلاحيات" : "Roles"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((u) => {
                const name =
                  lang === "ar"
                    ? u.full_name_ar || u.full_name_en || u.email || "—"
                    : u.full_name_en || u.email || "—";
                return (
                  <tr key={u.user_id} className="align-top hover:bg-accent/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UserCircle2 className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-foreground">{name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(u.auth_created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/90">{u.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_APP_ROLES.map((r) => {
                          const owned = u.roles.includes(r);
                          const key = `${u.user_id}:${r}`;
                          const busy = busyKey === key;
                          return (
                            <button
                              key={r}
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setBusyKey(key);
                                if (owned) remove.mutate({ user_id: u.user_id, role: r });
                                else assign.mutate({ user_id: u.user_id, role: r });
                              }}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                                owned
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                  : "border border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                              } disabled:opacity-60`}
                              title={
                                owned
                                  ? lang === "ar"
                                    ? "إزالة"
                                    : "Remove"
                                  : lang === "ar"
                                    ? "تعيين"
                                    : "Assign"
                              }
                            >
                              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AutomationsEditor() {
  const { t } = useI18n();
  const { settings } = useStoreState();
  const automations = settings.automations ?? [];
  const [editing, setEditing] = useState<Partial<(typeof automations)[0]> | null>(null);

  const save = () => {
    if (!editing?.name?.trim() || !editing?.trigger?.trim() || !editing?.action?.trim()) return;
    if (editing.id) {
      actions.updateAutomation(editing.id, {
        name: editing.name,
        trigger: editing.trigger,
        action: editing.action,
      });
    } else {
      actions.addAutomation(editing.name, editing.trigger, editing.action);
    }
    setEditing(null);
  };

  const remove = (id: string) => {
    if (confirm("Delete this automation rule?")) {
      actions.deleteAutomation(id);
    }
  };

  return (
    <section>
      <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">{t("automations")}</h2>
          <p className="text-sm text-muted-foreground">{t("automationsDesc")}</p>
        </div>
        <button
          onClick={() => setEditing({ name: "", trigger: "", action: "" })}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Rule
        </button>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {automations.map((r) => (
          <div key={r.id} className="flex items-center gap-4 p-5 transition hover:bg-accent/30">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.enabled ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground"}`}
            >
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold ${r.enabled ? "text-foreground" : "text-muted-foreground line-through"}`}
                >
                  {r.name}
                </span>
                {!r.enabled && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    Disabled
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                  When: {r.trigger}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                <span className="rounded bg-secondary px-1.5 py-0.5 font-medium text-foreground">
                  Then: {r.action}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => actions.toggleAutomation(r.id)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${r.enabled ? "bg-primary" : "bg-muted"}`}
                aria-label="Toggle"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${r.enabled ? "left-[22px]" : "left-0.5"}`}
                />
              </button>
              <div className="h-6 w-px bg-border" />
              <button
                onClick={() => setEditing(r)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(r.id)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {automations.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No automation rules yet. Create your first rule to automate workflows.
          </div>
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground">
                {editing.id ? "Edit Automation Rule" : "New Automation Rule"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Rule Name" required>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Auto-assign new web leads"
                  className={inputCls}
                  autoFocus
                />
              </Field>
              <Field label="Trigger (When)" required>
                <input
                  value={editing.trigger}
                  onChange={(e) => setEditing({ ...editing, trigger: e.target.value })}
                  placeholder="e.g. Lead created from Website"
                  className={inputCls}
                />
              </Field>
              <Field label="Action (Then)" required>
                <input
                  value={editing.action}
                  onChange={(e) => setEditing({ ...editing, action: e.target.value })}
                  placeholder="e.g. Assign to Sales Team"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={
                  !editing.name?.trim() || !editing.trigger?.trim() || !editing.action?.trim()
                }
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                {editing.id ? "Save Changes" : "Create Rule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
