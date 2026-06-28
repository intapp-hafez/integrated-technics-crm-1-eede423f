import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { categoriesForRole, useNotifPrefs } from "@/lib/notificationPrefs";
import { useAuth } from "@/lib/auth";
import { Bell, ArrowLeft } from "lucide-react";

type Panel = "admin" | "manager" | "employee" | "finance";

export function NotificationSettingsPage({
  panel,
  user,
}: {
  panel: Panel;
  user: { name: string; role: string; initials: string; photo?: string };
}) {
  const { dir } = useI18n();
  const { role } = useAuth();
  const [prefs, setPrefs] = useNotifPrefs(role ?? panel);
  const categories = categoriesForRole(role ?? panel);

  return (
    <AppShell
      panel={panel}
      user={user}
      pageTitle={dir === "rtl" ? "إعدادات الإشعارات" : "Notification Settings"}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              {dir === "rtl" ? "تفضيلات الإشعارات" : "Notification Preferences"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {dir === "rtl"
                ? "اختر أنواع الإشعارات التي تريد استلامها"
                : "Choose which kinds of notifications you receive"}
            </p>
          </div>
        </div>
        <Link
          to={`/${panel}/notifications` as any}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
          {dir === "rtl" ? "رجوع" : "Back"}
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <ul className="divide-y divide-border">
          {categories.map((c) => {
            const enabled = prefs[c.key] !== false;
            return (
              <li key={c.key} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">
                    {dir === "rtl" ? c.labelAr : c.labelEn}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {dir === "rtl" ? c.descAr : c.descEn}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => setPrefs({ ...prefs, [c.key]: !enabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    } ${dir === "rtl" ? "-scale-x-100" : ""}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {dir === "rtl"
          ? "يتم حفظ التفضيلات على هذا الجهاز."
          : "Preferences are saved to this device."}
      </p>
    </AppShell>
  );
}
