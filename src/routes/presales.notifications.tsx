import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/presales/notifications")({
  component: () => null,
  loader: () => { throw redirect({ to: "/presales", search: { tab: "dashboard" } as any }); },
});
