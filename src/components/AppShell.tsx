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
  ListTodo,
  StickyNote,
  Box,
  AlertTriangle,
  Layers,
  Calculator,
  DollarSign,
  PackageCheck,
  ClipboardList,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { LangToggle, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useSupabaseSync } from "@/lib/useSupabaseSync";
import { useChatNotifications } from "@/lib/useChatNotifications";
import { useState, type ReactNode } from "react";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { RealtimeStatus } from "@/components/RealtimeStatus";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import { LeadWonCelebration } from "@/components/pipeline/LeadWonCelebration";
import { PendingApprovalFloatingWidget } from "@/components/admin/PendingApprovalFloatingWidget";
import { useStoreState } from "@/lib/store";

type NavItem = { to: string; icon: typeof Users; key: any; search?: Record<string, string> };

const adminNav: NavItem[] = [
  { to: "/admin", icon: LayoutDashboard, key: "dashboard" },
  { to: "/admin/leads", icon: Users, key: "leads" },
  { to: "/admin/clients", icon: Building2, key: "clients" as any },
  { to: "/admin/consultants", icon: UserCheck, key: "consultants" as any },
  { to: "/admin/pipeline", icon: Workflow, key: "pipeline" },
  { to: "/admin/activities", icon: CalendarCheck, key: "activities" },
  { to: "/admin/projects", icon: Briefcase, key: "projects" },
  { to: "/admin/services-items", icon: Box, key: "servicesItems" as any },
  { to: "/admin/offers", icon: FileBadge, key: "offers" },
  { to: "/admin/managers", icon: Users, key: "managers" },
  { to: "/admin/employees", icon: UserCircle2, key: "employees" },

  { to: "/admin/attendance", icon: Clock4, key: "attendance" },
  { to: "/admin/history", icon: History, key: "history" },
  { to: "/admin/reports", icon: History, key: "reports" },
  { to: "/admin/reports/inactive-leads", icon: AlertTriangle, key: "inactiveLeadsReport" as any },
  { to: "/admin/inactive-staff", icon: UserX, key: "inactiveStaff" as any },
  { to: "/admin/chat", icon: MessageSquare, key: "chat" as any },
  { to: "/admin/email-inbox", icon: Inbox, key: "emailInbox" as any },
  { to: "/admin/security", icon: ShieldCheck, key: "securityCenter" as any },
  { to: "/admin/settings", icon: Settings, key: "settings" },
  { to: "/admin/kpis", icon: Settings, key: "kpisSetup" as any },
  { to: "/admin/todo", icon: ListTodo, key: "toDoList" as any },
];

const employeeNav: NavItem[] = [
  { to: "/employee", icon: LayoutDashboard, key: "dashboard" },
  { to: "/employee/leads", icon: Users, key: "myLeads" },
  { to: "/employee/pipeline", icon: Workflow, key: "pipeline" },
  { to: "/employee/activities", icon: CalendarCheck, key: "myActivities" },
  { to: "/employee/projects", icon: Briefcase, key: "myProjects" },
  { to: "/employee/attendance", icon: Clock4, key: "attendance" },
  { to: "/employee/chat", icon: MessageSquare, key: "chat" as any },
  { to: "/employee/send-email", icon: Mail, key: "sendEmail" as any },
  { to: "/employee/email-inbox", icon: Inbox, key: "emailInbox" as any },
  { to: "/employee/notes", icon: StickyNote, key: "stickyNotes" as any },
  { to: "/employee/profile", icon: UserCircle2, key: "profile" },
];

const managerNav: NavItem[] = [
  { to: "/manager", icon: LayoutDashboard, key: "dashboard" },
  { to: "/manager/employees", icon: UserCircle2, key: "myTeam" },
  { to: "/manager/leads", icon: Workflow, key: "ourLeads" as any },
  { to: "/manager/consultants", icon: UserCheck, key: "consultants" as any },
  { to: "/manager/pipeline", icon: Workflow, key: "pipeline" },
  { to: "/manager/activities", icon: CalendarCheck, key: "activities" },
  { to: "/manager/projects", icon: Briefcase, key: "projects" },
  { to: "/manager/services-items", icon: Box, key: "servicesItems" as any },
  { to: "/manager/offers", icon: FileBadge, key: "offers" },
  { to: "/manager/attendance", icon: Clock4, key: "attendance" },
  { to: "/manager/reports", icon: History, key: "reports" },
  { to: "/manager/reports/inactive-leads", icon: AlertTriangle, key: "inactiveLeadsReport" as any },
  { to: "/manager/chat", icon: MessageSquare, key: "chat" as any },
  { to: "/manager/send-email", icon: Mail, key: "sendEmail" as any },
  { to: "/manager/email-inbox", icon: Inbox, key: "emailInbox" as any },
  { to: "/manager/notes", icon: StickyNote, key: "stickyNotes" as any },
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

const presalesNav: NavItem[] = [
  { to: "/presales", icon: LayoutDashboard, key: "dashboard", search: { tab: "dashboard" } },
  { to: "/presales", icon: Users, key: "crmLeads" as any, search: { tab: "crm" } },
  { to: "/presales", icon: ClipboardList, key: "presalesCases" as any, search: { tab: "cases" } },
  { to: "/presales", icon: Layers, key: "boq" as any, search: { tab: "boq" } },
  { to: "/presales", icon: Calculator, key: "costEstimation" as any, search: { tab: "cost" } },
  { to: "/presales", icon: DollarSign, key: "financialOffers" as any, search: { tab: "offers" } },
  { to: "/presales", icon: PackageCheck, key: "handover" as any, search: { tab: "handover" } },
  { to: "/presales/send-email", icon: Mail, key: "sendEmail" as any },
  { to: "/presales/email-inbox", icon: Inbox, key: "emailInbox" as any },
  { to: "/presales", icon: UserCircle2, key: "profile", search: { tab: "profile" } },
];

interface Props {
  panel: "admin" | "employee" | "manager" | "finance" | "presales";
  user: { name: string; role: string; initials: string; photo?: string };
  children: ReactNode;
  pageTitle: string;
}

export function AppShell({ panel, user, children, pageTitle }: Props) {
  const { t, dir, lang } = useI18n();
  const { signOut, role: authRole, profile } = useAuth();
  const { registeredAccountsPublic } = useStoreState();
  
  useSupabaseSync();
  useChatNotifications();
  // Override caller-provided user with the logged-in profile, so every page
  // header reflects the real authenticated user.
  if (profile) {
    const fullName =
      lang === "ar"
        ? (profile.full_name_ar ?? profile.full_name_en ?? profile.email ?? "")
        : (profile.full_name_en ?? profile.email ?? "");
    const initials = (fullName || profile.email || "U")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    user = {
      name: fullName,
      role: authRole ? t(authRole as any) || authRole : user.role,
      initials,
      photo: profile.avatar_url ?? undefined,
    };
  }
  let nav =
    panel === "admin"
      ? adminNav
      : panel === "manager"
        ? managerNav
        : panel === "finance"
          ? financeNav
          : panel === "presales"
            ? presalesNav
            : employeeNav;

  if (registeredAccountsPublic && (panel === "employee" || panel === "manager")) {
    nav = [...nav, { to: `/${panel}/registered-accounts`, icon: Building2, key: "registeredAccounts" as any }];
  }

  const router = useRouterState();
  const pathname = router.location.pathname;
  const currentSearch = router.location.search as Record<string, any>;
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("int_crm_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("int_crm_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const panelLabel =
    panel === "admin"
      ? t("adminPanel")
      : panel === "manager"
        ? t("managerPanel")
        : panel === "finance"
          ? t("financePanel")
          : panel === "presales"
            ? t("presalesPanel" as any)
            : t("employeePanel");
  const roleLabel = authRole ? t(authRole as any) || authRole : user.role;

  return (
    <div className="flex min-h-screen bg-background" dir={dir}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 z-30 shrink-0 flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-all duration-300 ease-in-out md:relative md:flex ${
          open ? "flex translate-x-0" : "hidden md:flex"
        } ${collapsed ? "md:w-20" : "md:w-64"} w-64 ${dir === "rtl" ? "right-0" : "left-0"}`}
        style={{ backgroundImage: "var(--gradient-sidebar)" }}
      >
        <div
          className={`flex items-center border-b border-sidebar-border py-4 transition-all duration-300 ${
            collapsed ? "flex-col gap-3 px-2" : "justify-between px-4"
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <img src={logo} alt="INT-CRM" className="h-8 w-8 object-contain" />
            </div>
            {!collapsed && (
              <div className="leading-tight min-w-0 transition-opacity duration-200">
                <div className="font-display text-lg font-extrabold tracking-tight truncate">INT-CRM</div>
                <div className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60 truncate">
                  {panelLabel}
                </div>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title={
              collapsed
                ? dir === "rtl"
                  ? "توسيع القائمة"
                  : "Expand sidebar"
                : dir === "rtl"
                  ? "طي القائمة"
                  : "Collapse sidebar"
            }
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {dir === "rtl" ? (
              collapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
          {nav.map((item, idx) => {
            let active: boolean;
            if (item.search) {
              active = pathname.startsWith(item.to) && currentSearch?.tab === item.search.tab;
            } else {
              const hasMoreSpecificMatch = nav.some(
                (other) =>
                  other.to !== item.to &&
                  other.to.startsWith(item.to) &&
                  (pathname === other.to || pathname.startsWith(other.to + "/")),
              );
              active =
                (pathname === item.to ||
                  (item.to !== `/${panel}` && pathname.startsWith(item.to + "/"))) &&
                !hasMoreSpecificMatch;
              // Avoid finance dashboard matching when a tab is selected
              if (
                panel === "finance" &&
                item.to === "/finance" &&
                currentSearch?.tab &&
                currentSearch.tab !== "dashboard"
              ) {
                active = false;
              }
            }
            const Icon = item.icon;
            const itemLabel = t(item.key);
            return (
              <Link
                key={`${item.to}-${idx}`}
                to={item.to}
                search={item.search as any}
                onClick={() => setOpen(false)}
                title={collapsed ? itemLabel : undefined}
                className={`group flex items-center rounded-xl text-sm font-medium transition-all ${
                  collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-brand)]"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{itemLabel}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`border-t border-sidebar-border p-3 ${collapsed ? "flex flex-col items-center" : ""}`}>
          <button
            type="button"
            onClick={() => {
              void signOut();
            }}
            title={t("logout")}
            className={`flex items-center rounded-xl text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent transition-all ${
              collapsed ? "h-10 w-10 justify-center p-0" : "w-full gap-3 px-3 py-2"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t("logout")}</span>}
          </button>
          {!collapsed && (
            <div className="mt-3 px-3 text-[10px] leading-snug text-sidebar-foreground/40">
              {t("developedBy")}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <button className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop collapse toggle button in topbar */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shadow-2xs"
            title={
              collapsed
                ? dir === "rtl"
                  ? "توسيع القائمة الجانبية"
                  : "Expand sidebar"
                : dir === "rtl"
                  ? "طي القائمة الجانبية"
                  : "Collapse sidebar"
            }
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base font-bold text-foreground md:text-lg">
              {pageTitle}
            </h1>
            <div className="hidden items-center gap-1.5 text-[11px] md:flex">
              <span className="font-semibold text-primary">{panelLabel}</span>
            </div>
          </div>

          <GlobalSearch panel={panel} />

          <LangToggle />

          <RealtimeStatus />

          <NotificationsMenu panel={panel} />

          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-2.5 py-1.5">
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                loading="lazy"
                className="h-7 w-7 rounded-full object-cover ring-1 ring-primary/30"
              />
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
              onClick={() => {
                void signOut();
              }}
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
                pathname === item.to || (item.to !== `/${panel}` && pathname.startsWith(item.to));
              if (
                panel === "finance" &&
                item.to === "/finance" &&
                currentSearch?.tab &&
                currentSearch.tab !== "dashboard"
              ) {
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

      <LeadWonCelebration />
      {panel === "admin" && <PendingApprovalFloatingWidget />}
    </div>
  );
}
