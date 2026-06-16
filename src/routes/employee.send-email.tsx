import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SendEmailEditor } from "@/components/SendEmailEditor";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/employee/send-email")({
  component: Page,
  head: () => ({ meta: [{ title: "Send Email · Employee" }] }),
});

function Page() {
  const { t, dir } = useI18n();
  return (
    <AppShell
      panel="employee"
      user={{ name: "", role: t("employee"), initials: "" }}
      pageTitle={dir === "rtl" ? "إرسال بريد إلكتروني" : "Send Email"}
    >
      <div className="rounded-2xl border border-border bg-card p-6">
        <SendEmailEditor />
      </div>
    </AppShell>
  );
}
