import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState, type AppNotification } from "@/lib/store";
import { isAllowed, useNotifPrefs } from "@/lib/notificationPrefs";
import { useAuth } from "@/lib/auth";
import { Bell, Users, MessageSquare, CalendarCheck, Clock4, FileBadge, Briefcase, Check, Trash2, MailOpen, Mail, Settings as SettingsIcon } from "lucide-react";
import { useMemo, useState } from "react";

type Panel = "admin" | "manager" | "employee" | "finance";

const ICONS: Record<AppNotification["type"], typeof Bell> = {
  lead: Users,
  chat: MessageSquare,
  activity: CalendarCheck,
  attendance: Clock4,
  quotation: FileBadge,
  project: Briefcase,
};

const TONE: Record<AppNotification["type"], string> = {
  lead: "bg-blue-100 text-blue-600",
  chat: "bg-violet-100 text-violet-600",
  activity: "bg-emerald-100 text-emerald-600",
  attendance: "bg-amber-100 text-amber-600",
  quotation: "bg-rose-100 text-rose-600",
  project: "bg-indigo-100 text-indigo-600",
};

const CATEGORIES: { key: AppNotification["type"] | "all"; labelEn: string; labelAr: string }[] = [
  { key: "all", labelEn: "All", labelAr: "الكل" },
  { key: "lead", labelEn: "Leads", labelAr: "العملاء المحتملون" },
  { key: "project", labelEn: "Accounts", labelAr: "الحسابات" },
  { key: "chat", labelEn: "Chat", labelAr: "المحادثات" },
  { key: "activity", labelEn: "Activities", labelAr: "الأنشطة" },
  { key: "attendance", labelEn: "Attendance", labelAr: "الحضور" },
  { key: "quotation", labelEn: "Quotations", labelAr: "العروض" },
];

function timeAgo(ts: string, dir: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return dir === "rtl" ? "الآن" : "now";
  if (m < 60) return `${m}${dir === "rtl" ? " د" : "m"}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${dir === "rtl" ? " س" : "h"}`;
  return `${Math.floor(h / 24)}${dir === "rtl" ? " ي" : "d"}`;
}

function rewriteHref(href: string | undefined, panel: Panel): string | undefined {
  if (!href) return href;
  if (href === "/chat" || href.startsWith("/chat")) {
    if (panel === "finance") return "/finance?tab=chat";
    return `/${panel}/chat`;
  }
  if (panel === "admin") return href;
  if (panel === "finance") {
    if (href.startsWith("/admin/offers/")) return href.replace("/admin/offers/", "/finance/quotations/");
    if (href.startsWith("/admin/offers")) return "/finance?tab=quotations";
    if (href.startsWith("/admin/chat")) return "/finance?tab=chat";
    return "/finance";
  }
  return href.replace("/admin/", `/${panel}/`);
}

export function NotificationsPage({ panel, user }: { panel: Panel; user: { name: string; role: string; initials: string; photo?: string } }) {
  const { dir } = useI18n();
  const { notifications, profile } = useStoreState();
  const { role } = useAuth();
  const [prefs] = useNotifPrefs(role ?? panel);
  const [filter, setFilter] = useState<AppNotification["type"] | "all">("all");

  const me = profile?.name || user.name;

  const all = useMemo<AppNotification[]>(() => {
    // Trust server-side RLS: anything Supabase returned is already addressed
    // to this user via audience profile-ids or audience_roles.
    return notifications
      .filter((n) => isAllowed(n, prefs))
      .sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  }, [notifications, prefs]);


  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const n of all) c[n.type] = (c[n.type] ?? 0) + 1;
    return c;
  }, [all]);

  const filtered = filter === "all" ? all : all.filter((n) => n.type === filter);
  const unreadCount = all.filter((n) => n.unread).length;

  return (
    <AppShell panel={panel} user={user} pageTitle={dir === "rtl" ? "الإشعارات" : "Notifications"}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{dir === "rtl" ? "مركز الإشعارات" : "Notification Center"}</h2>
            <p className="text-xs text-muted-foreground">
              {unreadCount} {dir === "rtl" ? "غير مقروء من أصل" : "unread of"} {all.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/${panel}/notifications/settings` as any}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <SettingsIcon className="h-4 w-4" /> {dir === "rtl" ? "الإعدادات" : "Settings"}
          </Link>
          <button
            onClick={() => actions.markAllNotificationsRead(me)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <Check className="h-4 w-4" /> {dir === "rtl" ? "تحديد الكل كمقروء" : "Mark all read"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = filter === c.key;
          const I = c.key === "all" ? Bell : ICONS[c.key];
          return (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-border hover:bg-accent"
              }`}
            >
              <I className="h-3.5 w-3.5" />
              {dir === "rtl" ? c.labelAr : c.labelEn}
              <span className={`ms-1 rounded-full px-1.5 text-[10px] font-bold ${active ? "bg-primary-foreground/20" : "bg-secondary"}`}>
                {counts[c.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        {filtered.length === 0 && (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            {dir === "rtl" ? "لا توجد إشعارات في هذه الفئة" : "No notifications in this category"}
          </div>
        )}
        <ul className="divide-y divide-border">
          {filtered.map((n) => {
            const I = ICONS[n.type];
            const href = rewriteHref(n.href, panel);
            const inner = (
              <div className={`group flex items-start gap-4 px-5 py-4 transition hover:bg-secondary/60 ${n.unread ? "bg-primary/5" : ""}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE[n.type]}`}>
                  <I className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-bold text-foreground">{dir === "rtl" ? n.titleAr : n.titleEn}</div>
                    {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    <div className="ms-auto text-[11px] text-muted-foreground">{timeAgo(n.ts, dir)}</div>
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{dir === "rtl" ? n.bodyAr : n.bodyEn}</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (n.unread) actions.markNotificationRead(n.id);
                      else actions.markNotificationUnread(n.id);
                    }}
                    title={n.unread ? (dir === "rtl" ? "تحديد كمقروء" : "Mark read") : (dir === "rtl" ? "تحديد كغير مقروء" : "Mark unread")}
                    aria-label="toggle-read"
                    className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {n.unread ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); actions.dismissNotification(n.id); }}
                    title={dir === "rtl" ? "أرشفة" : "Archive"}
                    aria-label="dismiss"
                    className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {href ? (
                  <Link to={href as any} onClick={() => actions.markNotificationRead(n.id)}>{inner}</Link>
                ) : (
                  <div onClick={() => actions.markNotificationRead(n.id)}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
