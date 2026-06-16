import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Workflow,
  CalendarCheck,
  Briefcase,
  UserCircle2,
  Clock4,
  History,
  Settings,
  Search,
  ShieldCheck,
  LogOut,
  Menu,
  FileBadge,
  Wallet,
  MessageSquare,
  FileSpreadsheet,
  Mail,
  Inbox,
  Building2,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { LangToggle, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useSupabaseSync } from "@/lib/useSupabaseSync";
import { useChatNotifications } from "@/lib/useChatNotifications";
import { useState, type ReactNode } from "react";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { RealtimeStatus } from "@/components/RealtimeStatus";



type NavItem = { to: string; icon: typeof Users; key: any; search?: Record<string, string> };

const adminNav: NavItem[] = [
  { to: "/admin", icon: LayoutDashboard, key: "dashboard" },
  { to: "/admin/leads", icon: Users, key: "leads" },
  { to: "/admin/clients", icon: Building2, key: "clients" as any },
  { to: "/admin/pipeline", icon: Workflow, key: "pipeline" },
  { to: "/admin/activities", icon: CalendarCheck, key: "activities" },
  { to: "/admin/projects", icon: Briefcase, key: "projects" },
  { to: "/admin/offers", icon: FileBadge, key: "offers" },
  { to: "/admin/managers", icon: Users, key: "managers" },
  { to: "/admin/employees", icon: UserCircle2, key: "employees" },
  
  { to: "/admin/attendance", icon: Clock4, key: "attendance" },
  { to: "/admin/history", icon: History, key: "history" },
  { to: "/admin/reports", icon: History, key: "reports" },
  { to: "/admin/chat", icon: MessageSquare, key: "chat" as any },
  { to: "/admin/email-inbox", icon: Inbox, key: "emailInbox" as any },
  { to: "/admin/security", icon: ShieldCheck, key: "securityCenter" as any },
  { to: "/admin/settings", icon: Settings, key: "settings" },
];

const employeeNav: NavItem[] = [
  { to: "/employee", icon: LayoutDashboard, key: "dashboard" },
  { to: "/employee/leads", icon: Users, key: "myLeads" },
  { to: "/employee/pipeline", icon: Workflow, key: "pipeline" },
  { to: "/employee/activities", icon: CalendarCheck, key: "myActivities" },
  { to: "/employee/projects", icon: Briefcase, key: "myProjects" },
  { to: "/employee/offers", icon: FileBadge, key: "offers" },
  { to: "/employee/attendance", icon: Clock4, key: "attendance" },
  { to: "/employee/chat", icon: MessageSquare, key: "chat" as any },
  { to: "/employee/send-email", icon: Mail, key: "sendEmail" as any },
  { to: "/employee/email-inbox", icon: Inbox, key: "emailInbox" as any },
  { to: "/employee/profile", icon: UserCircle2, key: "profile" },
];

const managerNav: NavItem[] = [
  { to: "/manager", icon: LayoutDashboard, key: "dashboard" },
  { to: "/manager/employees", icon: UserCircle2, key: "myTeam" },
  { to: "/manager/leads", icon: Workflow, key: "ourLeads" as any },
  { to: "/manager/pipeline", icon: Workflow, key: "pipeline" },
  { to: "/manager/activities", icon: CalendarCheck, key: "activities" },
  { to: "/manager/projects", icon: Briefcase, key: "projects" },
  { to: "/manager/offers", icon: FileBadge, key: "offers" },
  { to: "/manager/attendance", icon: Clock4, key: "attendance" },
  { to: "/manager/reports", icon: History, key: "reports" },
  { to: "/manager/chat", icon: MessageSquare, key: "chat" as any },
  { to: "/manager/send-email", icon: Mail, key: "sendEmail" as any },
  { to: "/manager/email-inbox", icon: Inbox, key: "emailInbox" as any },
];


const financeNav: NavItem[] = [
  { to: "/finance", icon: Wallet, key: "dashboard", search: { tab: "dashboard" } },
  { to: "/finance", icon: FileBadge, key: "offers", search: { tab: "quotations" } },
  { to: "/finance", icon: MessageSquare, key: "chat" as any, search: { tab: "chat" } },
  { to: "/finance", icon: FileSpreadsheet, key: "reports", search: { tab: "reports" } },
  { to: "/finance/send-email", icon: Mail, key: "sendEmail" as any },
  { to: "/finance/email-inbox", icon: Inbox, key: "emailInbox" as any },
  { to: "/finance", icon: UserCircle2, key: "profile", search: { tab: "profile" } },
];


interface Props {
  panel: "admin" | "employee" | "manager" | "finance";
  user: { name: string; role: string; initials: string; photo?: string };
  children: ReactNode;
  pageTitle: string;
}

export function AppShell({ panel, user, children, pageTitle }: Props) {
  const { t, dir, lang } = useI18n();
  const { signOut, role: authRole, profile } = useAuth();
  useSupabaseSync();
  useChatNotifications();
  // Override caller-provided user with the logged-in profile, so every page
  // header reflects the real authenticated user.
  if (profile) {
    const fullName = lang === "ar"
      ? (profile.full_name_ar ?? profile.full_name_en ?? profile.email ?? "")
      : (profile.full_name_en ?? profile.email ?? "");
    const initials = (fullName || profile.email || "U")
      .split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
    user = {
      name: fullName,
      role: authRole ? (t(authRole as any) || authRole) : user.role,
      initials,
      photo: profile.avatar_url ?? undefined,
    };
  }
  const nav =
    panel === "admin" ? adminNav :
    panel === "manager" ? managerNav :
    panel === "finance" ? financeNav :
    employeeNav;
  const router = useRouterState();
  const pathname = router.location.pathname;
  const currentSearch = router.location.search as Record<string, any>;
  const [open, setOpen] = useState(false);
  const panelLabel =
    panel === "admin" ? t("adminPanel") :
    panel === "manager" ? t("managerPanel") :
    panel === "finance" ? t("financePanel") :
    t("employeePanel");
  const roleLabel = authRole ? t(authRole as any) || authRole : user.role;

  return (
    <div className="flex min-h-screen bg-background" dir={dir}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 z-30 w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform md:relative md:flex ${
          open ? "flex translate-x-0" : "hidden md:flex"
        } ${dir === "rtl" ? "right-0" : "left-0"}`}
        style={{ backgroundImage: "var(--gradient-sidebar)" }}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
            <img src={logo} alt="INT-CRM" className="h-8 w-8 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-extrabold tracking-tight">INT-CRM</div>
            <div className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60">
              {panel === "admin" ? t("adminPanel") : panel === "manager" ? t("managerPanel") : panel === "finance" ? t("financePanel") : t("employeePanel")}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item, idx) => {
            let active: boolean;
            if (item.search) {
              active = pathname.startsWith(item.to) && currentSearch?.tab === item.search.tab;
            } else {
              active =
                pathname === item.to ||
                (item.to !== `/${panel}` && pathname.startsWith(item.to));
              // Avoid finance dashboard matching when a tab is selected
              if (panel === "finance" && item.to === "/finance" && currentSearch?.tab && currentSearch.tab !== "dashboard") {
                active = false;
              }
            }
            const Icon = item.icon;
            return (
              <Link
                key={`${item.to}-${idx}`}
                to={item.to}
                search={item.search as any}
                onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <button
            type="button"
            onClick={() => { void signOut(); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            <span>{t("logout")}</span>
          </button>
          <div className="mt-3 text-[10px] leading-snug text-sidebar-foreground/40">
            {t("developedBy")}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <button
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold text-foreground md:text-lg">
              {pageTitle}
            </h1>
            <div className="hidden items-center gap-1.5 text-[11px] md:flex">
              <span className="font-semibold text-primary">{panelLabel}</span>
            </div>
          </div>

          <div className="relative ms-auto hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" style={{ insetInlineStart: "0.75rem" }} />
            <input
              placeholder={t("search")}
              className="h-10 w-full rounded-lg border border-border bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ paddingInlineStart: "2.25rem", paddingInlineEnd: "0.75rem" }}
            />
          </div>

          <LangToggle />

          <RealtimeStatus />

          <NotificationsMenu panel={panel} />


          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-2.5 py-1.5">
            {user.photo ? (
              <img src={user.photo} alt={user.name} loading="lazy" className="h-7 w-7 rounded-full object-cover ring-1 ring-primary/30" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {user.initials}
              </div>
            )}
            <div className="hidden text-xs leading-tight sm:block">
              <div className="font-semibold text-foreground">{user.name}</div>
              <div className="text-muted-foreground">
                <span className="font-semibold text-primary">{panelLabel}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { void signOut(); }}
              title={t("logout")}
              aria-label={t("logout")}
              className="ms-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex items-stretch justify-around">
          {nav.slice(0, 5).map((item, idx) => {
            const Icon = item.icon;
            let active: boolean;
            if (item.search) {
              active = pathname.startsWith(item.to) && currentSearch?.tab === item.search.tab;
            } else {
              active =
                pathname === item.to ||
                (item.to !== `/${panel}` && pathname.startsWith(item.to));
              if (panel === "finance" && item.to === "/finance" && currentSearch?.tab && currentSearch.tab !== "dashboard") {
                active = false;
              }
            }
            return (
              <li key={`bn-${item.to}-${idx}`} className="flex-1">
                <Link
                  to={item.to}
                  search={item.search as any}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} />
                  <span className="truncate max-w-[64px]">{t(item.key)}</span>
                  {active && <span className="mt-0.5 h-0.5 w-6 rounded-full bg-primary" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}