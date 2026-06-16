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
import { filterMyProjects } from "@/lib/employeeProjects";
import { ProjectRequestDialog } from "@/components/ProjectRequestDialog";
import { ProjectRequestsPanel } from "@/components/ProjectRequestsPanel";

export const Route = createFileRoute("/employee/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const { t } = useI18n();
  const { projects, profile } = useStoreState();
  const { user: authUser } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const myProjects = filterMyProjects(projects as Project[], {
    profileId: profile.profileId,
    userId: profile.userId ?? authUser?.id,
    name: profile.name,
  });

  return (
    <AppShell panel="employee" user={{ name: profile.name, role: t("employee"), initials: profile.name.split(" ").map(w => w[0]).join("") }} pageTitle={t("myProjects")}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Submit a new account for manager/admin approval.</p>
        <button onClick={() => setShowDialog(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
          <Plus className="h-3.5 w-3.5" /> Request New account
        </button>
      </div>

      <div className="mb-5" key={refresh}>
        <ProjectRequestsPanel mode="mine" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {myProjects.map((p) => (
          <Link key={p.id} to="/admin/projects/$projectId" params={{ projectId: p.id }} className="block rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:border-primary">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{shortId(p.id)} {p.category && `· ${p.category}`}</div>
                <h3 className="mt-1 font-display text-base font-bold text-foreground">{p.name}</h3>
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
                <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: p.status === "Delayed" ? "oklch(0.62 0.22 27)" : p.status === "At Risk" ? "oklch(0.78 0.15 80)" : "oklch(0.706 0.181 49.5)" }} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users2 className="h-3.5 w-3.5" />
                <span>{p.team} {t("members")}</span>
              </div>
              <div className="text-end">
                <div className="font-mono font-bold text-primary">{fmtMoney(p.budget)}</div>
                {p.offeredValue ? <div className="text-[9px] text-muted-foreground uppercase">{t("offeredValue")}: {fmtMoney(p.offeredValue)}</div> : null}
              </div>
            </div>
          </Link>
        ))}
        {myProjects.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm font-medium text-muted-foreground">You are not a member of a project yet.</p>
          </div>
        )}
      </div>

      {showDialog && (
        <ProjectRequestDialog
          profileId={profile.profileId}
          onClose={() => setShowDialog(false)}
          onSubmitted={() => setRefresh(r => r + 1)}
        />
      )}
    </AppShell>
  );
}
