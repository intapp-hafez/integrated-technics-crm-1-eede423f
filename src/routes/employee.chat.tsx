import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChatWithContacts } from "@/components/ChatWithContacts";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { chatContactsFor } from "@/lib/chatContacts";

export const Route = createFileRoute("/employee/chat")({
  component: EmployeeChatPage,
  head: () => ({ meta: [{ title: "Chat · INT-CRM" }] }),
});

function EmployeeChatPage() {
  const { t, dir, lang } = useI18n();
  const { profile, role } = useAuth();
  const { users, employees } = useStoreState();

  const meName =
    (dir === "rtl" ? profile?.full_name_ar : profile?.full_name_en) ||
    profile?.full_name_en ||
    "Me";
  const meInitials =
    (meName || "").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() ||
    "ME";

  const contacts = chatContactsFor(role ?? "employee", profile?.id, users, employees);

  return (
    <AppShell
      panel="employee"
      user={{
        name: meName,
        role: t("employee"),
        initials: meInitials,
        photo: profile?.avatar_url ?? undefined,
      }}
      pageTitle={dir === "rtl" ? "المحادثة" : "Chat"}
    >
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-foreground">
          {dir === "rtl" ? `مرحبًا ${meName.split(" ")[0]} 👋` : `Hi ${meName.split(" ")[0]} 👋`}
        </h2>
        <p className="text-sm text-muted-foreground">
          {dir === "rtl"
            ? "تواصل مع مديرك المباشر والإدارة في الوقت الفعلي."
            : "Real-time chat with your direct manager and admins."}
        </p>
      </div>
      <ChatWithContacts
        contacts={contacts}
        me={{ name: meName, photo: profile?.avatar_url ?? undefined, initials: meInitials }}
        emptyHint={
          lang === "ar"
            ? "لا يوجد مديرون أو مسؤولون متاحون للمحادثة بعد."
            : "No managers or admins available to chat with yet."
        }
      />
    </AppShell>
  );
}
