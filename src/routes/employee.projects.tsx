import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  Users2,
  Target,
  Activity as ActivityIcon,
  LayoutGrid,
  Table as TableIcon,
  Mail,
  Phone,
  UserCheck,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState, type Project } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { filterMyProjects, isProjectMemberOf, getProjectOwner } from "@/lib/employeeProjects";
import { ProjectRequestDialog } from "@/components/ProjectRequestDialog";
import { ProjectRequestsPanel } from "@/components/ProjectRequestsPanel";
import { ExcelImportModal } from "@/components/ExcelImportModal";

export const Route = createFileRoute("/employee/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const L = {
    submitInfo: isAr
      ? "أرسل حساباً جديداً ليوافق عليه المدير/المسؤول."
      : "Submit a new account for manager/admin approval.",
    requestNew: isAr ? "طلب حساب جديد" : "Request New account",
    notMember: isAr ? "أنت لست عضواً في أي مشروع بعد." : "You are not a member of a project yet.",
    myAccounts: isAr ? "حساباتي" : "My Accounts",
    myRequests: isAr ? "طلباتي" : "My Requests",
  };
  const { projects, profile, projectRequests, leads, activities, users, employees } =
    useStoreState();
  const { user: authUser } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [displayView, setDisplayView] = useState<"table" | "grid" | "contacts">("table");
  const [expandedContacts, setExpandedContacts] = useState<Record<string, boolean>>({});

  const getOwner = (p: Project) => getProjectOwner(p, users, employees);

  const getOwnerPhoto = (name?: string) => {
    if (!name || name === "—") return undefined;
    const norm = name.trim().toLowerCase();
    const u = users?.find((usr) => usr.name?.trim().toLowerCase() === norm);
    if (u?.avatarUrl) return u.avatarUrl;
    const e = employees?.find((emp) => emp.name?.trim().toLowerCase() === norm);
    if (e?.photo) return e.photo;
    return undefined;
  };

  const approvedRequests = (projectRequests || []).filter(
    (req: any) => req.status === "approved" && req.requested_by === profile.profileId,
  );
  const requestedProjectIds = approvedRequests
    .map((req: any) => req.created_project_id)
    .filter(Boolean);
  const requestedProjectNames = new Set(
    approvedRequests.map((req: any) => req.name_en?.trim().toLowerCase()).filter(Boolean),
  );

  const myProjects = filterMyProjects(projects as Project[], {
    profileId: profile.profileId,
    userId: profile.userId ?? authUser?.id,
    name: profile.name,
  }).concat(
    (projects as Project[]).filter(
      (p) =>
        (requestedProjectIds.includes(p.id) ||
          requestedProjectNames.has(p.name?.trim().toLowerCase())) &&
        !isProjectMemberOf(p, {
          profileId: profile.profileId,
          userId: profile.userId ?? authUser?.id,
          name: profile.name,
        }),
    ),
  );

  const [activeTab, setActiveTab] = useState<"accounts" | "requests">("accounts");

  const isDetailRoute = useRouterState({
    select: (state) => state.location.pathname.startsWith("/employee/projects/"),
  });

  if (isDetailRoute) {
    return <Outlet />;
  }

  return (
    <AppShell
      panel="employee"
      user={{
        name: profile.name,
        role: t("employee"),
        initials: profile.name
          .split(" ")
          .map((w) => w[0])
          .join(""),
      }}
      pageTitle={t("myProjects")}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{L.submitInfo}</p>
        <div className="flex gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setDisplayView("table")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${displayView === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDisplayView("grid")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${displayView === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setDisplayView("contacts")}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${displayView === "contacts" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <UserCheck className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            onClick={() => {
              if (myProjects.length === 0) {
                toast.error("No accounts to export");
                return;
              }
              const stamp = new Date().toISOString().slice(0, 10);
              if (displayView === "contacts") {
                const rows = myProjects.map((p) => ({
                  "Account Name": p.name,
                  "Account Type": p.accountType
                    ? p.accountType === "Other" && p.otherAccountType
                      ? p.otherAccountType
                      : p.accountType
                    : p.category || "",
                  Owner: getOwner(p),
                  "Main Contact": p.client || "",
                  "Main Phone": p.clientPhone || "",
                  "Main Email": p.clientEmail || "",
                  "Extra Contacts Count": p.extraContacts?.length || 0,
                  "Extra Contacts": p.extraContacts
                    ? (p.extraContacts as any[])
                        .map(
                          (c) =>
                            `${c.name}${c.title ? ` (${c.title})` : ""}${c.phone ? ` - ${c.phone}` : ""}${c.email ? ` - ${c.email}` : ""}`,
                        )
                        .join("; ")
                    : "",
                }));
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Account Contacts");
                XLSX.writeFile(wb, `account-contacts-${stamp}.xlsx`);
                toast.success(`${myProjects.length} account contacts exported`);
                return;
              }
              const rows = myProjects.map((p) => ({
                ID: shortId(p.id),
                Name: p.name,
                Client: p.client,
                Owner: getOwner(p),
                Category: p.category ?? "",
                Status: p.status,
                Progress: p.progress,
                Client_Email: p.clientEmail ?? "",
                Client_Phone: p.clientPhone ?? "",
                Extra_Contacts: p.extraContacts
                  ? (p.extraContacts as any[])
                      .map((c) => `${c.name} (${c.title || "N/A"}) - ${c.phone} - ${c.email || ""}`)
                      .join("; ")
                  : "",
              }));
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "My Accounts");
              XLSX.writeFile(wb, `my-accounts-${stamp}.xlsx`);
              toast.success(`${myProjects.length} accounts exported`);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> {isAr ? "تصدير إلى إكسل" : "Export Excel"}
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <Download className="h-3.5 w-3.5 rotate-180" /> {t("importExcel")}
          </button>
          <button
            onClick={() => setShowDialog(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> {L.requestNew}
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "accounts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          {L.myAccounts}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              activeTab === "accounts"
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {myProjects.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === "requests"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          {L.myRequests}
        </button>
      </div>

      {activeTab === "requests" && (
        <div className="mb-5" key={refresh}>
          <ProjectRequestsPanel mode="mine" />
        </div>
      )}

      {activeTab === "accounts" && displayView === "table" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start">ID</th>
                  <th className="px-4 py-3 text-start">{t("name")}</th>
                  <th className="px-4 py-3 text-start">{t("client")}</th>
                  <th className="px-4 py-3 text-start">{t("email") || "Email"}</th>
                  <th className="px-4 py-3 text-start" title={t("members") || "Members"}>
                    <Users2 className="h-3.5 w-3.5" />
                  </th>
                  <th className="px-4 py-3 text-start" title={t("activities") || "Activities"}>
                    <ActivityIcon className="h-3.5 w-3.5" />
                  </th>
                  <th className="px-4 py-3 text-end">{t("leads") || "Leads"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      <Link
                        to="/employee/projects/$projectId"
                        params={{ projectId: p.id }}
                        className="hover:text-primary"
                      >
                        {shortId(p.id)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/employee/projects/$projectId"
                        params={{ projectId: p.id }}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {p.name}
                      </Link>
                      {(p.accountType || p.category) && (
                        <div className="text-[11px] text-muted-foreground">
                          {p.accountType
                            ? p.accountType === "Other" && p.otherAccountType
                              ? p.otherAccountType
                              : p.accountType
                            : p.category}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold tracking-wide text-foreground">
                        {p.clientPhone || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.client}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {p.clientEmail || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.team}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {activities?.filter((a) => a.projectId === p.id).length || 0}
                    </td>
                    <td className="px-4 py-3 text-end font-mono font-semibold text-primary">
                      {leads?.filter((l) => l.projectId === p.id).length || 0}
                    </td>
                  </tr>
                ))}
                {myProjects.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      {L.notMember}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "accounts" && displayView === "contacts" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start">{isAr ? "اسم الحساب" : "Account Name"}</th>
                  <th className="px-4 py-3 text-start">{isAr ? "المالك" : "Owner"}</th>
                  <th className="px-4 py-3 text-start">
                    {isAr ? "جهة الاتصال الرئيسية" : "Main Contact"}
                  </th>
                  <th className="px-4 py-3 text-start">{isAr ? "البريد الإلكتروني" : "Email"}</th>
                  <th className="px-4 py-3 text-start">
                    {isAr ? "جهات اتصال إضافية" : "Extra Contacts"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myProjects.map((p) => {
                  const ownerName = getOwner(p);
                  const ownerPhoto = getOwnerPhoto(ownerName);
                  const ownerInitials = ownerName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2);
                  const extras = p.extraContacts ?? [];

                  return (
                    <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                      {/* Account Name */}
                      <td className="align-top px-4 py-4 font-semibold text-foreground">
                        <Link
                          to="/employee/projects/$projectId"
                          params={{ projectId: p.id }}
                          className="hover:text-primary transition-colors block"
                        >
                          <div className="font-bold text-foreground text-sm">{p.name}</div>
                          {(p.accountType || p.category) && (
                            <div className="text-xs text-muted-foreground font-normal">
                              {p.accountType
                                ? p.accountType === "Other" && p.otherAccountType
                                  ? p.otherAccountType
                                  : p.accountType
                                : p.category}
                            </div>
                          )}
                        </Link>
                      </td>

                      {/* Owner */}
                      <td className="align-top px-4 py-4">
                        <div className="flex items-center gap-2">
                          {ownerPhoto ? (
                            <img
                              src={ownerPhoto}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {ownerInitials || "?"}
                            </div>
                          )}
                          <span className="text-sm font-medium text-foreground">{ownerName}</span>
                        </div>
                      </td>

                      {/* Main Contact */}
                      <td className="align-top px-4 py-4">
                        <div className="font-semibold text-foreground text-sm">{p.client}</div>
                        {p.clientPhone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Phone className="h-3 w-3 text-primary/70" />
                            <a href={`tel:${p.clientPhone}`} className="hover:underline">
                              {p.clientPhone}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Email */}
                      <td className="align-top px-4 py-4 text-sm">
                        {p.clientEmail ? (
                          <a
                            href={`mailto:${p.clientEmail}`}
                            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {p.clientEmail}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Extra Contacts (One Column Format - Collapsed after 2) */}
                      <td className="align-top px-4 py-3">
                        {extras.length > 0 ? (
                          <div>
                            <div className="space-y-2">
                              {(expandedContacts[p.id] ? extras : extras.slice(0, 2)).map(
                                (
                                  c: { name: string; title: string; phone: string; email: string },
                                  i: number,
                                ) => (
                                  <div
                                    key={i}
                                    className="rounded-lg border border-border/80 bg-secondary/30 p-2.5 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-foreground">{c.name}</span>
                                      {c.title && (
                                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                          {c.title}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-[11px]">
                                      {c.phone && (
                                        <a
                                          href={`tel:${c.phone}`}
                                          className="inline-flex items-center gap-1 hover:text-foreground"
                                        >
                                          <Phone className="h-3 w-3 text-primary/70" /> {c.phone}
                                        </a>
                                      )}
                                      {c.email && (
                                        <a
                                          href={`mailto:${c.email}`}
                                          className="inline-flex items-center gap-1 hover:text-foreground"
                                        >
                                          <Mail className="h-3 w-3 text-primary/70" /> {c.email}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                            {extras.length > 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedContacts((prev) => ({ ...prev, [p.id]: !prev[p.id] }))
                                }
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 hover:underline cursor-pointer"
                              >
                                {expandedContacts[p.id] ? (
                                  <>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                    {isAr ? "عرض أقل" : "Show less"}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                    {isAr
                                      ? `عرض ${extras.length - 2} المزيد`
                                      : `+ Show ${extras.length - 2} more`}
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {isAr ? "لا توجد جهات اتصال إضافية" : "No extra contacts"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {myProjects.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      {L.notMember}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "accounts" && displayView === "grid" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {myProjects.map((p) => (
            <Link
              key={p.id}
              to="/employee/projects/$projectId"
              params={{ projectId: p.id }}
              className="block rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:border-primary hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {shortId(p.id)}
                    {(p.accountType || p.category) &&
                      ` · ${p.accountType ? (p.accountType === "Other" && p.otherAccountType ? p.otherAccountType : p.accountType) : p.category}`}
                  </div>
                  <h3 className="mt-1 font-display text-base font-bold text-foreground">
                    {p.name}
                  </h3>
                </div>
                <div className="text-end">
                  <div className="inline-block rounded-full bg-secondary/50 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground">
                    {p.clientPhone || "—"}
                  </div>
                  <div className="mt-1 pr-1 text-[11px] text-muted-foreground">{p.client}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{p.clientEmail || "—"}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users2 className="h-3.5 w-3.5" />
                    {p.team}
                  </span>
                  <span className="flex items-center gap-1" title="Leads">
                    <Target className="h-3.5 w-3.5" />
                    {leads?.filter((l) => l.projectId === p.id).length || 0}
                  </span>
                  <span className="flex items-center gap-1" title="Activities">
                    <ActivityIcon className="h-3.5 w-3.5" />
                    {activities?.filter((a) => a.projectId === p.id).length || 0}
                  </span>
                </div>
                <div className="font-mono font-bold text-primary">{fmtMoney(p.budget)}</div>
              </div>
            </Link>
          ))}
          {myProjects.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">{L.notMember}</p>
            </div>
          )}
        </div>
      )}

      {showDialog && (
        <ProjectRequestDialog
          profileId={profile.profileId}
          onClose={() => setShowDialog(false)}
          onSubmitted={() => setRefresh((r) => r + 1)}
        />
      )}
      {showImport && <ExcelImportModal type="projects" onClose={() => setShowImport(false)} />}
    </AppShell>
  );
}
