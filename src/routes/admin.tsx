import { createFileRoute, Outlet, Link, Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth, PANEL_PATH } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const SHARED_PREFIXES = ["/admin/leads", "/admin/pipeline", "/admin/projects", "/admin/activities"];

function AdminLayout() {
  const { loading, user, panel, isAdmin } = useAuth();
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  if (!panel) return <Navigate to="/" replace />;

  if (isAdmin) return <Outlet />;

  // Non-admin: allow only shared subpaths (and not admin-only detail pages)
  const adminOnlyDetail = /^\/admin\/employees\/[^/]+\/?$/.test(path);
  const allowedShared =
    !adminOnlyDetail && SHARED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  if (allowedShared) return <Outlet />;

  const homeLink = PANEL_PATH[panel];
  const homeLinkLabel =
    panel === "manager"
      ? t("managerPanel")
      : panel === "finance"
        ? t("financePanel")
        : t("goToEmployeePanel");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">
          {t("adminAccessRequired")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("adminAccessMsg")}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link
            to={homeLink}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {homeLinkLabel}
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
          >
            {t("switchAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
