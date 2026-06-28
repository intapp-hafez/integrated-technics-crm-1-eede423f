import { useEffect, useState } from "react";
import type { AppNotification } from "@/lib/store";

// Role-aware preference categories. Each user can enable/disable individual
// notification streams. The categories map directly to AppNotification.type.
export type NotifCategory = "lead" | "project" | "chat" | "activities" | "attendance" | "quotation";

export type Role = "admin" | "manager" | "finance" | "hr" | "employee" | string;

export const NOTIF_CATEGORIES: {
  key: NotifCategory;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  // roles that can subscribe to this category
  roles: Role[];
}[] = [
  {
    key: "lead",
    labelEn: "Leads",
    labelAr: "العملاء المحتملون",
    descEn: "New leads and status changes",
    descAr: "العملاء الجدد وتغييرات الحالة",
    roles: ["admin", "manager", "finance", "employee"],
  },
  {
    key: "project",
    labelEn: "Projects",
    labelAr: "المشاريع",
    descEn: "Project creation, status and updates",
    descAr: "إنشاء وتحديث وحالة المشاريع",
    roles: ["admin", "manager", "finance", "employee"],
  },
  {
    key: "chat",
    labelEn: "Chat Messages",
    labelAr: "رسائل الدردشة",
    descEn: "New messages and replies",
    descAr: "الرسائل والردود الجديدة",
    roles: ["admin", "manager", "finance", "hr", "employee"],
  },
  {
    key: "activities",
    labelEn: "Activities",
    labelAr: "الأنشطة",
    descEn: "New activities and changes",
    descAr: "الأنشطة الجديدة والتغييرات",
    roles: ["admin", "manager", "employee"],
  },
  {
    key: "attendance",
    labelEn: "Attendance",
    labelAr: "الحضور",
    descEn: "Check-in / check-out alerts",
    descAr: "تنبيهات الحضور والانصراف",
    roles: ["admin", "manager", "hr", "employee"],
  },
  {
    key: "quotation",
    labelEn: "Quotations",
    labelAr: "العروض",
    descEn: "Quotation submissions and approvals",
    descAr: "تقديم العروض والموافقات",
    roles: ["admin", "manager", "finance"],
  },
];

export type NotifPrefs = Record<NotifCategory, boolean>;

const DEFAULT_PREFS: NotifPrefs = {
  lead: true,
  project: true,
  chat: true,
  activities: true,
  attendance: true,
  quotation: true,
};

const keyFor = (role?: Role) => `int-crm:notif-prefs:v2:${role ?? "default"}`;

export function loadPrefs(role?: Role): NotifPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(keyFor(role));
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: NotifPrefs, role?: Role) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(keyFor(role), JSON.stringify(p));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("int-crm:notif-prefs-changed"));
}

export function useNotifPrefs(role?: Role): [NotifPrefs, (p: NotifPrefs) => void] {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  useEffect(() => {
    setPrefs(loadPrefs(role));
    const onChange = () => setPrefs(loadPrefs(role));
    window.addEventListener("int-crm:notif-prefs-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("int-crm:notif-prefs-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [role]);
  return [
    prefs,
    (p) => {
      savePrefs(p, role);
      setPrefs(p);
    },
  ];
}

// Map a notification to its category for filtering by user prefs.
export function categoryOf(
  n: Pick<AppNotification, "type" | "titleEn" | "bodyEn" | "href">,
): NotifCategory {
  if (n.type === "chat") return "chat";
  if (n.type === "attendance") return "attendance";
  if (n.type === "quotation") return "quotation";
  if (n.type === "project") return "project";
  if (n.type === "lead") return "lead";
  // activity type → activities
  return "activities";
}

export function isAllowed(
  n: Pick<AppNotification, "type" | "titleEn" | "bodyEn" | "href">,
  prefs: NotifPrefs,
): boolean {
  return prefs[categoryOf(n)] !== false;
}

export function categoriesForRole(role?: Role): typeof NOTIF_CATEGORIES {
  if (!role) return NOTIF_CATEGORIES;
  return NOTIF_CATEGORIES.filter((c) => c.roles.includes(role));
}
