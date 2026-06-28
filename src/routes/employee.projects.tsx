import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Users2 } from "lucide-react";
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
  const { projects, profile, projectRequests } = useStoreState();
  const { user: authUser } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [refresh, setRefresh] = useState(0);

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
          <button
            disabled
            title={
              isAr
                ? "نعتذر — هذا الخيار غير متاح حالياً. شكراً لتفهمكم."
                : "We apologise — this option is currently not working. Thanks for your understanding."
            }
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground opacity-40"
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

      {activeTab === "accounts" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {myProjects.map((p) => (
            <Link
              key={p.id}
              to="/admin/projects/$projectId"
              params={{ projectId: p.id }}
              className="block rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:border-primary"
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
                  <p className="text-xs text-muted-foreground">{p.client}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
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
                  <span>
                    {p.team} {t("members")}
                  </span>
                </div>
                <div className="text-end">
                  <div className="font-mono font-bold text-primary">{fmtMoney(p.budget)}</div>
                  {p.offeredValue ? (
                    <div className="text-[9px] text-muted-foreground uppercase">
                      {t("offeredValue")}: {fmtMoney(p.offeredValue)}
                    </div>
                  ) : null}
                </div>
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
