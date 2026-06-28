import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/NotificationsPage";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/finance/notifications")({
  component: Page,
  head: () => ({ meta: [{ title: "Notifications · Finance" }] }),
});

function Page() {
  const { dir } = useI18n();
  return (
    <NotificationsPage
      panel="finance"
      user={{
        name: "Layla Hassan",
        role: dir === "rtl" ? "مالية" : "Finance Officer",
        initials: "LH",
        photo:
          "https://e7.pngegg.com/pngimages/394/133/png-clipart-hijab-muslim-islamic-fashion-woman-islam-tube-girl.png",
      }}
    />
  );
}
