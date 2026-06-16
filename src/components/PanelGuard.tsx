import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth, PANEL_PATH, type Panel } from "@/lib/auth";

import { Loader2 } from "lucide-react";

interface Props {
  /** Panels that may view this subtree. If the user's resolved role isn't one of these, they're redirected to their own panel. */
  allow: Panel[];
  /** When false, even unauthenticated users may render. Default true: requires auth. */
  requireAuth?: boolean;
  children: React.ReactNode;
}

export function PanelGuard({ allow, requireAuth = true, children }: Props) {
  const { loading, user, panel } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    // Send to login, preserve return path
    const search = pathname && pathname !== "/" ? { next: pathname } : undefined;
    return <Navigate to="/" search={search as any} replace />;
  }

  if (!panel) {
    return <Navigate to="/" replace />;
  }

  if (!allow.includes(panel)) {
    return <Navigate to={PANEL_PATH[panel]} replace />;
  }

  return <>{children}</>;
}
