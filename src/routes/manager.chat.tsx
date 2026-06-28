import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChatWithContacts } from "@/components/ChatWithContacts";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useStoreState } from "@/lib/store";
import { chatContactsFor } from "@/lib/chatContacts";

export const Route = createFileRoute("/manager/chat")({
  component: ManagerChatPage,
  head: () => ({ meta: [{ title: "Chat · INT-CRM" }] }),
});

function ManagerChatPage() {
  const { t, dir } = useI18n();
  const { profile, role } = useAuth();
  const { users, employees } = useStoreState();

  const contacts = chatContactsFor(role ?? "manager", profile?.id, users, employees);

  const meName =
    (dir === "rtl" ? profile?.full_name_ar : profile?.full_name_en) ||
    profile?.full_name_en ||
    "Manager";
  const meInitials =
    (meName || "")
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "MG";

  return (
    <AppShell
      panel="manager"
      user={{
        name: meName,
        role: t("manager"),
        initials: meInitials,
        photo: profile?.avatar_url ?? undefined,
      }}
      pageTitle={dir === "rtl" ? "المحادثات" : "Chat"}
    >
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-foreground">
          {dir === "rtl" ? "محادثات الفريق والإدارة" : "Team & admin chat"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {dir === "rtl"
            ? "تواصل في الوقت الفعلي مع موظفي فريقك ومع الإدارة."
            : "Real-time messaging with your team employees and admins."}
        </p>
      </div>
      <ChatWithContacts
        contacts={contacts}
        me={{ name: meName, photo: profile?.avatar_url ?? undefined, initials: meInitials }}
        emptyHint={
          dir === "rtl" ? "لا يوجد أعضاء أو مسؤولون بعد." : "No team members or admins yet."
        }
      />
    </AppShell>
  );
}
