import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PanelGuard } from "@/components/PanelGuard";

export const Route = createFileRoute("/finance")({
  component: () => (
    <PanelGuard allow={["finance"]}>
      <Outlet />
    </PanelGuard>
  ),
});
