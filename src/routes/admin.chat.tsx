import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChatWithContacts } from "@/components/ChatWithContacts";
import { useI18n } from "@/lib/i18n";
import { useStoreState } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { chatContactsFor } from "@/lib/chatContacts";

export const Route = createFileRoute("/admin/chat")({
  component: AdminChatPage,
  head: () => ({ meta: [{ title: "Chat · INT-CRM" }] }),
});

function AdminChatPage() {
  const { t, dir } = useI18n();
  const { users, employees } = useStoreState();
  const { profile, role } = useAuth();

  const contacts = chatContactsFor(role ?? "admin", profile?.id, users, employees);

  const meName = (dir === "rtl" ? profile?.full_name_ar : profile?.full_name_en) || profile?.full_name_en || "Admin";
  const meInitials = (meName || "").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "AD";

  return (
    <AppShell
      panel="admin"
      user={{
        name: meName,
        role: t("admin"),
        initials: meInitials,
        photo: profile?.avatar_url ?? undefined,
      }}
      pageTitle={dir === "rtl" ? "المحادثات" : "Chat"}
    >
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-foreground">
          {dir === "rtl" ? "اختر مستخدمًا للمحادثة" : "Select a user to chat with"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {dir === "rtl"
            ? "تواصل مباشرة وفي الوقت الفعلي مع أي مستخدم."
            : "Real-time direct messages with any user."}
        </p>
      </div>
      <ChatWithContacts
        contacts={contacts}
        me={{ name: meName, photo: profile?.avatar_url ?? undefined, initials: meInitials }}
        emptyHint={dir === "rtl" ? "لا يوجد مستخدمون." : "No users yet."}
      />
    </AppShell>
  );
}
