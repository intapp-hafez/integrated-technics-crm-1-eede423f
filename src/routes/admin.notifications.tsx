import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/NotificationsPage";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/notifications")({
  component: Page,
  head: () => ({ meta: [{ title: "Notifications · Admin" }] }),
});

function Page() {
  const { t } = useI18n();
  return (
    <NotificationsPage
      panel="admin"
      user={{
        name: "",
        role: t("admin"),
        initials: "HR",
        photo: "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
      }}
    />
  );
}
