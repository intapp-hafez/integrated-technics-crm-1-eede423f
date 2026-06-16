import { createFileRoute } from "@tanstack/react-router";
import { NotificationSettingsPage } from "@/components/NotificationSettingsPage";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/manager/notifications/settings")({
  component: Page,
  head: () => ({ meta: [{ title: "Notification Settings · Manager" }] }),
});

function Page() {
  const { t } = useI18n();
  return (
    <NotificationSettingsPage
      panel="manager"
      user={{ name: "Aisha Mahmoud", role: t("manager"), initials: "AM" }}
    />
  );
}
