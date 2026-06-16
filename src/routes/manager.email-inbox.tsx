import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { EmailJobsInbox } from "@/components/EmailJobsInbox";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/manager/email-inbox")({
  component: Page,
  head: () => ({ meta: [{ title: "Email Inbox · Manager" }] }),
});

function Page() {
  const { dir } = useI18n();
  return (
    <AppShell
      panel="manager"
      user={{ name: "", role: "Manager", initials: "" }}
      pageTitle={dir === "rtl" ? "صندوق مهام البريد" : "Email Inbox"}
    >
      <div className="rounded-2xl border border-border bg-card p-6">
        <EmailJobsInbox />
      </div>
    </AppShell>
  );
}
