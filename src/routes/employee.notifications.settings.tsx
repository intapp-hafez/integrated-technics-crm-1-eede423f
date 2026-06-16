import { createFileRoute } from "@tanstack/react-router";
import { NotificationSettingsPage } from "@/components/NotificationSettingsPage";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/employee/notifications/settings")({
  component: Page,
  head: () => ({ meta: [{ title: "Notification Settings · Employee" }] }),
});

function Page() {
  const { t } = useI18n();
  return (
    <NotificationSettingsPage
      panel="employee"
      user={{ name: "Omar Tarek", role: t("employee"), initials: "OT" }}
    />
  );
}
