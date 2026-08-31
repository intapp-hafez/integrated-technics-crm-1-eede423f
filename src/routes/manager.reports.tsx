import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/manager/reports")({
  component: ManagerReportsLayout,
});

function ManagerReportsLayout() {
  return <Outlet />;
}
