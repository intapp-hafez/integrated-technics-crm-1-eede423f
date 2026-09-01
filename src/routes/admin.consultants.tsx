import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ConsultantsView } from "@/components/consultants/ConsultantsView";

export const Route = createFileRoute("/admin/consultants")({
  component: AdminConsultantsPage,
  head: () => ({ meta: [{ title: "Consultants · Admin" }] }),
});

function AdminConsultantsPage() {
  const { t, lang } = useI18n();
  const { user, profile } = useAuth();

  const appShellUser = {
    name: profile?.full_name_en || profile?.full_name_ar || user?.email || "Admin",
    role: "Admin",
    initials: (profile?.full_name_en || profile?.full_name_ar || "AD")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    photo: profile?.avatar_url ?? undefined,
  };

  return (
    <AppShell panel="admin" user={appShellUser} pageTitle={t("consultants")}>
      <ConsultantsView panel="admin" />
    </AppShell>
  );
}
