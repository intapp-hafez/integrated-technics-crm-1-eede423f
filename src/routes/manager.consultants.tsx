import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ConsultantsView } from "@/components/consultants/ConsultantsView";

export const Route = createFileRoute("/manager/consultants")({
  component: ManagerConsultantsPage,
  head: () => ({ meta: [{ title: "Consultants · Manager" }] }),
});

function ManagerConsultantsPage() {
  const { t, lang } = useI18n();
  const { user, profile } = useAuth();
  const meName = profile?.full_name_en || profile?.full_name_ar || user?.email || "";

  const appShellUser = {
    name: meName,
    role: t("manager"),
    initials:
      meName
        .split(/\s+/)
        .filter(Boolean)
        .map((w: string) => w[0]?.toUpperCase())
        .join("")
        .slice(0, 2) || "MN",
    photo:
      profile?.avatar_url ||
      "https://cdn.pixabay.com/photo/2022/03/11/06/14/indian-man-7061278_1280.jpg",
  };

  return (
    <AppShell panel="manager" user={appShellUser} pageTitle={t("consultants")}>
      <ConsultantsView panel="manager" />
    </AppShell>
  );
}
