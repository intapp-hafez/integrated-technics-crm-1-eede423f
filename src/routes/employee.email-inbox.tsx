import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { EmailJobsInbox } from "@/components/EmailJobsInbox";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/employee/email-inbox")({
  component: Page,
  head: () => ({ meta: [{ title: "Email Inbox · Employee" }] }),
});

function Page() {
  const { t, dir } = useI18n();
  return (
    <AppShell
      panel="employee"
      user={{ name: "", role: t("employee"), initials: "" }}
      pageTitle={dir === "rtl" ? "صندوق مهام البريد" : "Email Inbox"}
    >
      <div className="rounded-2xl border border-border bg-card p-6">
        <EmailJobsInbox />
      </div>
    </AppShell>
  );
}
