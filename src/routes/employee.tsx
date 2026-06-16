import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PanelGuard } from "@/components/PanelGuard";

export const Route = createFileRoute("/employee")({
  component: () => (
    <PanelGuard allow={["employee"]}>
      <Outlet />
    </PanelGuard>
  ),
});
