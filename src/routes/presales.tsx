import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PanelGuard } from "@/components/PanelGuard";

export const Route = createFileRoute("/presales")({
  component: () => (
    <PanelGuard allow={["presales", "admin"]}>
      <Outlet />
    </PanelGuard>
  ),
});
