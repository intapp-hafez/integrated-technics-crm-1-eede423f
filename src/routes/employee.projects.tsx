import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Users2, Target, Activity as ActivityIcon, LayoutGrid, Table as TableIcon, Mail } from "lucide-react";
import { shortId } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useI18n } from "@/lib/i18n";
import { fmtMoney } from "@/lib/mock-data";
import { useStoreState, type Project } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { filterMyProjects, isProjectMemberOf } from "@/lib/employeeProjects";
import { ProjectRequestDialog } from "@/components/ProjectRequestDialog";
import { ProjectRequestsPanel } from "@/components/ProjectRequestsPanel";
import { ExcelImportModal } from "@/components/ExcelImportModal";
import { Download } from "lucide-react";

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
  const { projects, profile, projectRequests, leads, activities } = useStoreState();
  const { user: authUser } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [displayView, setDisplayView] = useState<"table" | "grid">("table");

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
          </div>
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
                  <th className="px-4 py-3 text-start" title={t("members") || "Members"}><Users2 className="h-3.5 w-3.5" /></th>
                  <th className="px-4 py-3 text-start" title={t("activities") || "Activities"}><ActivityIcon className="h-3.5 w-3.5" /></th>
                  <th className="px-4 py-3 text-end">{t("leads") || "Leads"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      <Link to="/employee/projects/$projectId" params={{ projectId: p.id }} className="hover:text-primary">
                        {shortId(p.id)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to="/employee/projects/$projectId" params={{ projectId: p.id }} className="font-semibold text-foreground hover:text-primary">
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
                      <div className="font-semibold tracking-wide text-foreground">{p.clientPhone || "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.client}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {p.clientEmail || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{p.team}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{activities?.filter((a) => a.projectId === p.id).length || 0}</td>
                    <td className="px-4 py-3 text-end font-mono font-semibold text-primary">{leads?.filter((l) => l.projectId === p.id).length || 0}</td>
                  </tr>
                ))}
                {myProjects.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                  <h3 className="mt-1 font-display text-base font-bold text-foreground">{p.name}</h3>
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
                  <span className="flex items-center gap-1"><Users2 className="h-3.5 w-3.5" />{p.team}</span>
                  <span className="flex items-center gap-1" title="Leads"><Target className="h-3.5 w-3.5" />{leads?.filter((l) => l.projectId === p.id).length || 0}</span>
                  <span className="flex items-center gap-1" title="Activities"><ActivityIcon className="h-3.5 w-3.5" />{activities?.filter((a) => a.projectId === p.id).length || 0}</span>
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
