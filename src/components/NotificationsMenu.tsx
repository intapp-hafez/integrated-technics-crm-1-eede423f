import { Link } from "@tanstack/react-router";
import { Bell, Users, MessageSquare, CalendarCheck, Clock4, FileBadge, Briefcase, X, MailOpen, Mail, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState, type AppNotification } from "@/lib/store";
import { isAllowed, useNotifPrefs } from "@/lib/notificationPrefs";
import { useAuth } from "@/lib/auth";

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

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function rewriteHref(href: string | undefined, panel: Panel): string | undefined {
  if (!href) return href;
  // Normalise generic chat URL
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

export function NotificationsMenu({ panel }: { panel: Panel }) {
  const { dir } = useI18n();
  const { notifications, profile } = useStoreState();
  const { role } = useAuth();
  const [prefs] = useNotifPrefs(role ?? panel);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const me = profile?.name || "";
  // Trust server-side RLS: every notification returned by Supabase is already
  // scoped to this user (either via audience profile-id list or audience_roles
  // matching one of their roles). Showing the full list here ensures
  // role-broadcast notifications (e.g. "audience_roles: [finance]") aren't
  // dropped by client-side gating.
  const items = useMemo(() => {
    return notifications
      .filter((n) => isAllowed(n, prefs))
      .sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  }, [notifications, prefs]);


  const unreadCount = items.filter((n) => n.unread).length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-accent"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground" style={{ insetInlineEnd: "-0.25rem" }}>
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute z-40 mt-2 w-[380px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          style={{ insetInlineEnd: 0 }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="font-display text-sm font-bold text-foreground">{dir === "rtl" ? "الإشعارات" : "Notifications"}</div>
              <div className="text-[10px] text-muted-foreground">{unreadCount} {dir === "rtl" ? "غير مقروء" : "unread"}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => actions.markAllNotificationsRead(me)} className="text-[11px] font-semibold text-primary hover:underline">
                {dir === "rtl" ? "تحديد الكل" : "Mark all read"}
              </button>
              <Link
                to={`/${panel}/notifications/settings` as any}
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="settings"
                title={dir === "rtl" ? "الإعدادات" : "Settings"}
              >
                <SettingsIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
            {items.map((n) => {
              const I = ICONS[n.type];
              const href = rewriteHref(n.href, panel);
              const content = (
                <div className={`group flex items-start gap-3 px-4 py-3 transition hover:bg-secondary/60 ${n.unread ? "bg-primary/5" : ""}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE[n.type]}`}>
                    <I className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-foreground">{dir === "rtl" ? n.titleAr : n.titleEn}</div>
                      <div className="text-[10px] text-muted-foreground">{timeAgo(n.ts)}</div>
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{dir === "rtl" ? n.bodyAr : n.bodyEn}</div>
                  </div>
                  <div className="flex flex-col items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        if (n.unread) actions.markNotificationRead(n.id);
                        else actions.markNotificationUnread(n.id);
                      }}
                      title={n.unread ? (dir === "rtl" ? "تحديد كمقروء" : "Mark read") : (dir === "rtl" ? "تحديد كغير مقروء" : "Mark unread")}
                      aria-label="toggle-read"
                    >
                      {n.unread ? <MailOpen className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /> : <Mail className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); actions.dismissNotification(n.id); }}
                      aria-label="dismiss"
                      title={dir === "rtl" ? "أرشفة" : "Archive"}
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </div>
              );
              return href ? (
                <Link
                  key={n.id}
                  to={href as any}
                  onClick={() => { setOpen(false); actions.markNotificationRead(n.id); }}
                >
                  {content}
                </Link>
              ) : (
                <div key={n.id} onClick={() => actions.markNotificationRead(n.id)}>
                  {content}
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                {dir === "rtl" ? "لا توجد إشعارات" : "No notifications"}
              </div>
            )}
          </div>
          <Link
            to={`/${panel}/notifications` as any}
            onClick={() => setOpen(false)}
            className="block border-t border-border bg-secondary/40 px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-secondary"
          >
            {dir === "rtl" ? "عرض جميع الإشعارات" : "View all notifications"} →
          </Link>
        </div>
      )}
    </div>
  );
}
