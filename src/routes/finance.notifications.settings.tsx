import { createFileRoute } from "@tanstack/react-router";
import { NotificationSettingsPage } from "@/components/NotificationSettingsPage";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/finance/notifications/settings")({
  component: Page,
  head: () => ({ meta: [{ title: "Notification Settings · Finance" }] }),
});

function Page() {
  const { dir } = useI18n();
  return (
    <NotificationSettingsPage
      panel="finance"
      user={{ name: "Layla Hassan", role: dir === "rtl" ? "مالية" : "Finance Officer", initials: "LH" }}
    />
  );
}
