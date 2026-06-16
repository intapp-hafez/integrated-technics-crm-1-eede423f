import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SendEmailEditor } from "@/components/SendEmailEditor";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/finance/send-email")({
  component: Page,
  head: () => ({ meta: [{ title: "Send Email · Finance" }] }),
});

function Page() {
  const { t, dir } = useI18n();
  return (
    <AppShell
      panel="finance"
      user={{ name: "", role: t("finance"), initials: "" }}
      pageTitle={dir === "rtl" ? "إرسال بريد إلكتروني" : "Send Email"}
    >
      <div className="rounded-2xl border border-border bg-card p-6">
        <SendEmailEditor />
      </div>
    </AppShell>
  );
}
