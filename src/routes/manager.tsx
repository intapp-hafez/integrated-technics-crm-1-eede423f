import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PanelGuard } from "@/components/PanelGuard";

export const Route = createFileRoute("/manager")({
  component: () => (
    <PanelGuard allow={["manager"]}>
      <Outlet />
    </PanelGuard>
  ),
});
