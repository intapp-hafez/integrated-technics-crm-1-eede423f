import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/NotificationsPage";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/employee/notifications")({
  component: Page,
  head: () => ({ meta: [{ title: "Notifications · Employee" }] }),
});

function Page() {
  const { t } = useI18n();
  return (
    <NotificationsPage
      panel="employee"
      user={{ name: "Omar Tarek", role: t("employee"), initials: "OT" }}
    />
  );
}
