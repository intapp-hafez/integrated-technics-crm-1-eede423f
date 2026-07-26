import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import {
  Activity,
  Bell,
  Clock,
  Calendar,
  Filter,
  AlertTriangle,
  User,
  Info,
  Check,
  Save,
  ShieldAlert,
  Mail,
} from "lucide-react";
import { useStoreState } from "@/lib/store";

export function ActivitiesMonitoringTab() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { users } = useStoreState();
  const notificationUsers = users.filter((u) => u.active && (u.role === "employee" || u.role === "manager"));

  const [activeSubTab, setActiveSubTab] = useState<string>("all");
  const [employeeEmails, setEmployeeEmails] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<boolean>(true);
  const [threshold, setThreshold] = useState<string>("3");
  const [frequency, setFrequency] = useState<{ daily: boolean; weekly: boolean; monthly: boolean }>({
    daily: true,
    weekly: true,
    monthly: false,
  });
  const [workingDays, setWorkingDays] = useState<Record<string, boolean>>({
    Sunday: true,
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: false,
    Saturday: false,
  });
  const [workStart, setWorkStart] = useState<string>("08:00 AM");
  const [workEnd, setWorkEnd] = useState<string>("06:00 PM");
  const [exclusions, setExclusions] = useState<{
    closed: boolean;
    won: boolean;
    lost: boolean;
    archived: boolean;
  }>({
    closed: true,
    won: true,
    lost: true,
    archived: true,
  });

  const [otherSettings, setOtherSettings] = useState<{
    ignoreOthers: boolean;
    includeSub: boolean;
    pauseHolidays: boolean;
    autoFollowup: boolean;
  }>({
    ignoreOthers: true,
    includeSub: true,
    pauseHolidays: false,
    autoFollowup: false,
  });

  const [templates, setTemplates] = useState<{
    employeeWarning: string;
    managerEscalation: string;
    salesManagerEscalation: string;
    adminEscalation: string;
  }>({
    employeeWarning: "Action Required: Lead {lead_name} has been inactive for {inactive_days} days.",
    managerEscalation: "Escalation Alert: Lead {lead_name} assigned to {owner_name} requires attention ({inactive_days} days inactive).",
    salesManagerEscalation: "High Priority Inactivity: {company} has recorded 0 activities for {inactive_days} days.",
    adminEscalation: "Critical Inactivity Alert: {lead_name} ({company}) is stagnant for {inactive_days} days.",
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("crm_activities_monitoring_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.enabled !== undefined) setEnabled(parsed.enabled);
        if (parsed.threshold) setThreshold(parsed.threshold);
        if (parsed.frequency) setFrequency(parsed.frequency);
        if (parsed.workingDays) setWorkingDays(parsed.workingDays);
        if (parsed.workStart) setWorkStart(parsed.workStart);
        if (parsed.workEnd) setWorkEnd(parsed.workEnd);
        if (parsed.exclusions) setExclusions(parsed.exclusions);
        if (parsed.otherSettings) setOtherSettings(parsed.otherSettings);
        if (parsed.templates) setTemplates(parsed.templates);
        if (parsed.employeeEmails) setEmployeeEmails(parsed.employeeEmails);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem(
      "crm_activities_monitoring_settings",
      JSON.stringify({
        enabled,
        threshold,
        frequency,
        workingDays,
        workStart,
        workEnd,
        exclusions,
        otherSettings,
        templates,
        employeeEmails,
      })
    );
    setTimeout(() => {
      setIsSaving(false);
      toast.success(isAr ? "تم حفظ إعدادات مراقبة الأنشطة بنجاح" : "Activities Monitoring settings saved successfully!");
    }, 400);
  };

  const subTabs = [
    { key: "all", label: isAr ? "جميع الإعدادات" : "All Settings" },
    { key: "general", label: isAr ? "الإعدادات العامة" : "General Settings" },
    { key: "notification", label: isAr ? "إعدادات الإشعارات" : "Notification Settings" },
    { key: "templates", label: isAr ? "قوالب الإشعارات" : "Notification Templates" },
    { key: "escalation", label: isAr ? "قواعد التصعيد" : "Escalation Rules" },
    { key: "emails", label: isAr ? "تكوين البريد الإلكتروني" : "Emails Configuration" },
    { key: "working", label: isAr ? "أيام وساعات العمل" : "Working Days & Hours" },
    { key: "exclusions", label: isAr ? "استثناءات حالات العملاء" : "Lead Status Exclusions" },
  ];

  const DAYS_LIST = [
    { key: "Sunday", labelEn: "Sunday", labelAr: "الأحد" },
    { key: "Monday", labelEn: "Monday", labelAr: "الإثنين" },
    { key: "Tuesday", labelEn: "Tuesday", labelAr: "الثلاثاء" },
    { key: "Wednesday", labelEn: "Wednesday", labelAr: "الأربعاء" },
    { key: "Thursday", labelEn: "Thursday", labelAr: "الخميس" },
    { key: "Friday", labelEn: "Friday", labelAr: "الجمعة" },
    { key: "Saturday", labelEn: "Saturday", labelAr: "السبت" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Save Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            {t("activitiesMonitoring")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("activitiesMonitoringDesc")}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ التغييرات" : "Save Changes")}
        </button>
      </div>

      {/* Main Grid: Sidebar Sub-tabs + Settings Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Sub-tabs Sidebar */}
        <div className="lg:col-span-3">
          <nav className="space-y-1 rounded-2xl border border-border bg-card p-2 shadow-xs">
            {subTabs.map((tab) => {
              const active = activeSubTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSubTab(tab.key)}
                  className={`flex w-full items-center rounded-xl px-4 py-3 text-xs font-semibold transition ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Settings Cards Grid */}
        <div className="space-y-6 lg:col-span-9">
          {/* Card Row 1: Enable & Threshold */}
          {(activeSubTab === "all" || activeSubTab === "general") && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Enable Activities Monitoring */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs transition hover:shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {t("enableActivitiesMonitoring")}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("enableActivitiesMonitoringDesc")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnabled(!enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      enabled ? "bg-primary" : "bg-secondary"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                        enabled ? (isAr ? "-translate-x-5" : "translate-x-5") : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* No Activity Threshold */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs transition hover:shadow-sm">
                <h3 className="text-sm font-bold text-foreground">
                  {t("noActivityThreshold")}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("noActivityThresholdDesc")}
                </p>
                <div className="mt-4">
                  <select
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full max-w-xs rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="1">1 {isAr ? "يوم" : "Day"}</option>
                    <option value="2">2 {isAr ? "أيام" : "Days"}</option>
                    <option value="3">3 {isAr ? "أيام" : "Days"}</option>
                    <option value="5">5 {isAr ? "أيام" : "Days"}</option>
                    <option value="7">7 {isAr ? "أيام" : "Days"}</option>
                    <option value="14">14 {isAr ? "يومًا" : "Days"}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Notification Frequency */}
          {(activeSubTab === "all" || activeSubTab === "notification") && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <h3 className="text-sm font-bold text-foreground">
                {t("notificationFrequency")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("notificationFrequencyDesc")}
              </p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5 cursor-pointer hover:border-primary/50">
                  <input
                    type="checkbox"
                    checked={frequency.daily}
                    onChange={(e) => setFrequency({ ...frequency, daily: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      {isAr ? "يوميًا" : "Daily"}
                    </span>
                    <p className="text-[11px] text-muted-foreground">{t("dailyDesc")}</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5 cursor-pointer hover:border-primary/50">
                  <input
                    type="checkbox"
                    checked={frequency.weekly}
                    onChange={(e) => setFrequency({ ...frequency, weekly: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      {isAr ? "أسبوعيًا" : "Weekly"}
                    </span>
                    <p className="text-[11px] text-muted-foreground">{t("weeklyDesc")}</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-border bg-background p-3.5 cursor-pointer hover:border-primary/50">
                  <input
                    type="checkbox"
                    checked={frequency.monthly}
                    onChange={(e) => setFrequency({ ...frequency, monthly: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground">
                      {isAr ? "شهريًا" : "Monthly"}
                    </span>
                    <p className="text-[11px] text-muted-foreground">{t("monthlyDesc")}</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Working Days & Working Hours & Exclusions & Escalation Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Working Days */}
            {(activeSubTab === "all" || activeSubTab === "working") && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                <h3 className="text-sm font-bold text-foreground">{isAr ? "أيام العمل" : "Working Days"}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("workingDaysDesc")}
                </p>
                <div className="mt-3.5 space-y-2">
                  {DAYS_LIST.map((d) => (
                    <label key={d.key} className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workingDays[d.key]}
                        onChange={(e) =>
                          setWorkingDays({ ...workingDays, [d.key]: e.target.checked })
                        }
                        className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                      />
                      {isAr ? d.labelAr : d.labelEn}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Working Hours & Lead Exclusions Stack */}
            <div className="space-y-6 sm:col-span-1">
              {/* Working Hours */}
              {(activeSubTab === "all" || activeSubTab === "working") && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-foreground">{isAr ? "ساعات العمل" : "Working Hours"}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("workingHoursDesc")}
                  </p>
                  <div className="mt-3.5 flex items-center gap-1.5 min-w-0">
                    <select
                      value={workStart}
                      onChange={(e) => setWorkStart(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background px-2 py-1.5 text-[11px] font-semibold text-foreground focus:border-primary focus:outline-hidden"
                    >
                      <option value="08:00 AM">08:00 AM</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                    </select>
                    <span className="text-xs font-bold text-muted-foreground shrink-0">–</span>
                    <select
                      value={workEnd}
                      onChange={(e) => setWorkEnd(e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-border bg-background px-2 py-1.5 text-[11px] font-semibold text-foreground focus:border-primary focus:outline-hidden"
                    >
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                      <option value="07:00 PM">07:00 PM</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Lead Status Exclusions */}
              {(activeSubTab === "all" || activeSubTab === "exclusions") && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-foreground">{t("leadStatusExclusions")}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t("leadStatusExclusionsDesc")}
                  </p>
                  <div className="mt-3.5 space-y-2.5">
                    <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exclusions.closed}
                        onChange={(e) => setExclusions({ ...exclusions, closed: e.target.checked })}
                        className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                      />
                      {t("ignoreClosedLeads")}
                    </label>
                    <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exclusions.won}
                        onChange={(e) => setExclusions({ ...exclusions, won: e.target.checked })}
                        className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                      />
                      {t("ignoreWonLeads")}
                    </label>
                    <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exclusions.lost}
                        onChange={(e) => setExclusions({ ...exclusions, lost: e.target.checked })}
                        className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                      />
                      {t("ignoreLostLeads")}
                    </label>
                    <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exclusions.archived}
                        onChange={(e) => setExclusions({ ...exclusions, archived: e.target.checked })}
                        className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary"
                      />
                      {t("ignoreArchivedLeads")}
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Escalation Rules Card */}
            {(activeSubTab === "all" || activeSubTab === "escalation") && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                <h3 className="text-sm font-bold text-foreground">{t("escalationRules")}</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("escalationRulesDesc")}
                </p>

                <div className="mt-4 space-y-3">
                  {/* 3 Days -> Employee */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 px-3.5 py-3 text-emerald-700 dark:text-emerald-400">
                    <span className="text-xs font-bold">3 {isAr ? "أيام" : "Days"}</span>
                    <span className="text-xs font-semibold">→</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                      <User className="h-3.5 w-3.5" />
                      {t("notifyEmployee")}
                    </span>
                  </div>

                  {/* 5 Days -> Manager */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-blue-500/10 px-3.5 py-3 text-blue-700 dark:text-blue-400">
                    <span className="text-xs font-bold">5 {isAr ? "أيام" : "Days"}</span>
                    <span className="text-xs font-semibold">→</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                      <User className="h-3.5 w-3.5" />
                      {t("notifyManager")}
                    </span>
                  </div>

                  {/* 7 Days -> Sales Manager */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3.5 py-3 text-amber-700 dark:text-amber-400">
                    <span className="text-xs font-bold">7 {isAr ? "أيام" : "Days"}</span>
                    <span className="text-xs font-semibold">→</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                      <User className="h-3.5 w-3.5" />
                      {t("notifySalesManager")}
                    </span>
                  </div>

                  {/* 14 Days -> CRM Admin */}
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-rose-500/10 px-3.5 py-3 text-rose-700 dark:text-rose-400">
                    <span className="text-xs font-bold">14 {isAr ? "يومًا" : "Days"}</span>
                    <span className="text-xs font-semibold">→</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                      <User className="h-3.5 w-3.5" />
                      {t("notifyCRMAdmin")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Templates */}
          {(activeSubTab === "all" || activeSubTab === "templates") && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <h3 className="text-sm font-bold text-foreground">
                {isAr ? "قوالب الإشعارات" : "Notification Templates"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAr 
                  ? "تخصيص نصوص الإشعارات لكل مستوى تصعيد. استخدم المتغيرات التالية: {lead_name}, {company}, {inactive_days}, {owner_name}"
                  : "Customize the notification text for each escalation level. Use variables: {lead_name}, {company}, {inactive_days}, {owner_name}"}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Employee Warning */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    {isAr ? "تحذير الموظف (3 أيام)" : "Employee Warning (3 Days)"}
                  </label>
                  <textarea
                    value={templates.employeeWarning}
                    onChange={(e) => setTemplates({ ...templates, employeeWarning: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Manager Escalation */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    {isAr ? "تصعيد للمدير المباشر (5 أيام)" : "Manager Escalation (5 Days)"}
                  </label>
                  <textarea
                    value={templates.managerEscalation}
                    onChange={(e) => setTemplates({ ...templates, managerEscalation: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>

                {/* Sales Manager Escalation */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    {isAr ? "تصعيد لمدير المبيعات (7 أيام)" : "Sales Manager Escalation (7 Days)"}
                  </label>
                  <textarea
                    value={templates.salesManagerEscalation}
                    onChange={(e) => setTemplates({ ...templates, salesManagerEscalation: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/20"
                  />
                </div>

                {/* Admin Escalation */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    {isAr ? "تصعيد لمدير النظام (14 يوم)" : "Admin Escalation (14 Days)"}
                  </label>
                  <textarea
                    value={templates.adminEscalation}
                    onChange={(e) => setTemplates({ ...templates, adminEscalation: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-rose-500 focus:outline-hidden focus:ring-1 focus:ring-rose-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Emails Configuration */}
          {(activeSubTab === "all" || activeSubTab === "emails") && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-bold text-foreground">
                  {isAr ? "البريد الإلكتروني للموظفين" : "Employee Notification Emails"}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                {isAr ? "حدد عناوين البريد الإلكتروني المخصصة لتلقي إشعارات التصعيد لكل موظف." : "Specify dedicated email addresses for receiving escalation notifications for each employee."}
              </p>

              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-start text-xs">
                  <thead className="bg-secondary/40 font-bold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-start">{isAr ? "اسم الموظف" : "Employee Name"}</th>
                      <th className="px-4 py-3 text-start">{isAr ? "البريد الإلكتروني للإشعارات" : "Notification Email"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {notificationUsers.map((u) => (
                      <tr key={u.id} className="bg-background hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                           {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.name}
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {u.name[0]}
                              </span>
                            )}
                          {u.name}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="email"
                            value={employeeEmails[u.id] || ""}
                            onChange={(e) => {
                              const newEmails = { ...employeeEmails, [u.id]: e.target.value };
                              setEmployeeEmails(newEmails);
                              // Auto-save to localStorage to prevent data loss if user forgets to click save
                              try {
                                const saved = localStorage.getItem("crm_activities_monitoring_settings");
                                const parsed = saved ? JSON.parse(saved) : {};
                                parsed.employeeEmails = newEmails;
                                localStorage.setItem("crm_activities_monitoring_settings", JSON.stringify(parsed));
                              } catch(err) {}
                            }}
                            placeholder={isAr ? "أدخل البريد الإلكتروني..." : "Enter email address..."}
                            className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/20"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other Settings Toggles Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <h3 className="text-sm font-bold text-foreground">
              {isAr ? "إعدادات أخرى" : "Other Settings"}
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Ignore Activities Created by Others */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-foreground">
                      {t("ignoreActivitiesCreatedByOthers")}
                    </span>
                    <span title={t("ignoreActivitiesCreatedByOthersDesc")}>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {t("ignoreActivitiesCreatedByOthersDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOtherSettings({ ...otherSettings, ignoreOthers: !otherSettings.ignoreOthers })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    otherSettings.ignoreOthers ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      otherSettings.ignoreOthers ? (isAr ? "-translate-x-4" : "translate-x-4") : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Include Sub-Activities */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-foreground">
                      {t("includeSubActivities")}
                    </span>
                    <span title={t("includeSubActivitiesDesc")}>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {t("includeSubActivitiesDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOtherSettings({ ...otherSettings, includeSub: !otherSettings.includeSub })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    otherSettings.includeSub ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      otherSettings.includeSub ? (isAr ? "-translate-x-4" : "translate-x-4") : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Pause Monitoring for Holidays */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-foreground">
                      {t("pauseMonitoringForHolidays")}
                    </span>
                    <span title={t("pauseMonitoringForHolidaysDesc")}>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {t("pauseMonitoringForHolidaysDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOtherSettings({ ...otherSettings, pauseHolidays: !otherSettings.pauseHolidays })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    otherSettings.pauseHolidays ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      otherSettings.pauseHolidays ? (isAr ? "-translate-x-4" : "translate-x-4") : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Auto-Create Follow-up */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-foreground">
                      {t("autoCreateFollowup")}
                    </span>
                    <span title={t("autoCreateFollowupDesc")}>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {t("autoCreateFollowupDesc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setOtherSettings({ ...otherSettings, autoFollowup: !otherSettings.autoFollowup })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    otherSettings.autoFollowup ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      otherSettings.autoFollowup ? (isAr ? "-translate-x-4" : "translate-x-4") : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Info Footer Banner */}
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary">
            <Info className="h-5 w-5 shrink-0" />
            <div>
              <span className="font-bold">{t("howItWorks")}</span>
              <p className="mt-0.5 text-primary/80 leading-relaxed">
                {t("howItWorksDesc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
