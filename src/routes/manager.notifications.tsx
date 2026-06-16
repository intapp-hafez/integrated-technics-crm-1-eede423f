import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/NotificationsPage";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/manager/notifications")({
  component: Page,
  head: () => ({ meta: [{ title: "Notifications · Manager" }] }),
});

function Page() {
  const { t } = useI18n();
  return (
    <NotificationsPage
      panel="manager"
      user={{ name: "Aisha Mahmoud", role: t("manager"), initials: "AM" }}
    />
  );
}
