import { createFileRoute } from "@tanstack/react-router";
import { NotificationSettingsPage } from "@/components/NotificationSettingsPage";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/notifications/settings")({
  component: Page,
  head: () => ({ meta: [{ title: "Notification Settings · Admin" }] }),
});

function Page() {
  const { t } = useI18n();
  return (
    <NotificationSettingsPage
      panel="admin"
      user={{ name: "", role: t("admin"), initials: "HR" }}
    />
  );
}
