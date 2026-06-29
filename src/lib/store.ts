import { useEffect, useState, useSyncExternalStore } from "react";
import {
  leads,
  activities,
  projects,
  attendanceToday,
  employees as mockEmployees,
  quotations,
} from "./mock-data";
import type { Lead, LeadStatus, Quotation } from "./mock-data";

export type Employee = (typeof mockEmployees)[number];

export interface AppNotification {
  id: string;
  type: "lead" | "chat" | "activity" | "attendance" | "quotation" | "project";
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  ts: string;
  unread: boolean;
  href?: string;
  audience?: string[]; // user names that should see it; empty/undefined = everyone
}

export type HistoryModule = "lead" | "pipeline" | "project" | "employee" | "activity" | "settings";
export interface HistoryEntry {
  id: string;
  ts: string; // ISO
  module: HistoryModule;
  action: string;
  actor?: string;
  target: string;
  details?: string;
  targetId?: string;
  targetTable?: string;
}

export type ActivityType =
  | "Call"
  | "Meeting"
  | "Site Visit"
  | "Follow-up"
  | "Inspection"
  | "Email"
  | (string & {});
export type ActivityStatus = "pending" | "in_progress" | "done" | "cancelled" | "delayed";
export type ActivityApprovalStatus = "pending" | "approved" | "rejected";
export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  leadId?: string;
  projectId?: string;
  dueDate: string; // YYYY-MM-DD
  time: string; // HH:mm
  owner: string;
  ownerId?: string;
  presalesIds?: string[];
  status: ActivityStatus;
  notes?: string;
  estMinutes?: number;
  createdAt: string;
  presalesTeam?: string[];
  approvalStatus?: ActivityApprovalStatus;
  approvedBy?: string;
  approvedByName?: string;
  approvedByPhoto?: string;
  approvedAt?: string;
  rejectionReason?: string;
  reviewNote?: string;
  createdBy?: string;
  createdByName?: string;
  createdByPhoto?: string;
}

export interface Note {
  id: string;
  leadId: string;
  ts: string;
  author: string;
  text: string;
}

export interface Attachment {
  id: string;
  leadId: string;
  name: string;
  size: string;
  ts: string;
  dataUrl?: string;
  mime?: string;
}

export interface PipelineStageDef {
  key: string;
  label: string;
  color: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel: "Email" | "SMS" | "WhatsApp" | "Push";
  subject: string;
  body: string;
}

export interface LocationCity {
  name: string;
  nameAr?: string;
  districts: string[];
  districtsAr?: Record<string, string>;
}

export type UserRoleKey = "admin" | "manager" | "hr" | "finance" | "employee";
export const USER_ROLES: UserRoleKey[] = ["admin", "manager", "hr", "finance", "employee"];
export const APP_PAGES = [
  "dashboard",
  "leads",
  "pipeline",
  "activities",
  "projects",
  "employees",
  "attendance",
  "offers",
  "quotations",
  "reports",
  "notifications",
  "chat",
  "profile",
  "history",
  "settings",
] as const;
export type AppPage = (typeof APP_PAGES)[number];
export type CrudOp = "create" | "read" | "update" | "delete";
export interface RolePermission {
  pages: AppPage[];
  crud: Record<AppPage, CrudOp[]>;
}

export type AdminTaskStatus = "new" | "in progress" | "done" | "delayed";

export interface AdminTaskActivity {
  id: string;
  taskId: string;
  ts: string;
  actor: string;
  details: string;
}

export interface AdminTask {
  id: string;
  title: string;
  details: string;
  date: string;
  status: AdminTaskStatus;
}
export interface AppUser {
  id: string; // auth user_id
  profileId?: string;
  name: string;
  nameAr?: string;
  email: string;
  phone?: string;
  role: UserRoleKey;
  active: boolean;
  titleEn?: string;
  titleAr?: string;
  departmentEn?: string;
  departmentAr?: string;
  locationEn?: string;
  locationAr?: string;
  avatarUrl?: string;
  targetType?: "yearly" | "quarterly" | "monthly";
  targetValue?: number;
  skills?: string[];
  managerId?: string;
}

export interface ProjectLocation {
  city: string;
  district: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  progress: number;
  budget: number;
  status: string;
  team: number;
  offeredValue: number;
  category: string;
  competitors: string[];
  lastUpdate: string;
  projectType?: string;
  clientEmail?: string;
  clientPhone?: string;
  city?: string;
  district?: string;
  street?: string;
  teamMembers?: string[];
  memberProfileIds?: string[];
  memberUserIds?: string[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  accountType?: string;
  otherAccountType?: string;
  extraContacts?: Array<{ name: string; title: string; phone: string; email: string }>;
  createdBy?: string;
  createdByName?: string;
  managerId?: string;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // HH:mm
  checkOut: string; // HH:mm or ""
  hours: string; // computed label
  location: string;
  owner: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
}

export interface Profile {
  profileId?: string;
  userId?: string;
  name: string;
  nameAr?: string;
  title: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  skills: string[];
  manager?: string;
  avatarUrl?: string;
  targetValue?: number;
  targetType?: "yearly" | "quarterly" | "monthly";
}

export interface DepartmentItem {
  id: string;
  nameEn: string;
  nameAr: string;
}
export interface PositionItem {
  id: string;
  nameEn: string;
  nameAr: string;
}

interface Settings {
  statuses: string[];
  stages: PipelineStageDef[];
  activityTypes: ActivityType[];
  automations: AutomationRule[];
  templates: NotificationTemplate[];
  locations: LocationCity[];
  permissions: Record<UserRoleKey, RolePermission>;
  departments: DepartmentItem[];
  positions: PositionItem[];
  workdayHours: number;
}

export interface ProjectRequest {
  id: string;
  [key: string]: any;
}

interface State {
  leads: Lead[];
  history: HistoryEntry[];
  activities: Activity[];
  notes: Note[];
  attachments: Attachment[];
  settings: Settings;
  leadDistricts: Record<string, string>;
  projectLocations: Record<string, ProjectLocation>;
  projects: Project[];
  quotations: typeof quotations;
  attendance: AttendanceRecord[];
  profile: Profile;
  users: AppUser[];
  employees: Employee[];
  notifications: AppNotification[];
  projectRequests?: ProjectRequest[];
  onlineUserIds: string[];
  celebrationLead?: Lead | null;
  adminTasks: AdminTask[];
  adminTaskActivities: AdminTaskActivity[];
}

import * as sb from "./supabaseWrites";

const now = () => new Date().toISOString();
const id = (p: string) => sb.newUuid();

const today = new Date();
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

const seedHistory: HistoryEntry[] = [
  {
    id: "H-001",
    ts: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    module: "pipeline",
    actor: "System",
    target: "Aramco Digital",
    action: "Moved to Negotiation",
    details: "From Proposal â†’ Negotiation",
  },
  {
    id: "H-002",
    ts: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    module: "lead",
    actor: "Nour Khaled",
    target: "Red Sea Global",
    action: "Created proposal",
    details: "Value SAR 280K",
  },
  {
    id: "H-003",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    module: "activity",
    actor: "Omar Tarek",
    target: "STC Group",
    action: "Logged call",
    details: "Discovery call â€” 35 min",
  },
  {
    id: "H-004",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    module: "project",
    actor: "Aisha Mahmoud",
    target: "P-206 STC DC4",
    action: "Status changed to At Risk",
  },
  {
    id: "H-005",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    module: "employee",
    actor: "Yusuf Saleh",
    target: "Layla Hassan",
    action: "Updated role",
    details: "Field Operations â†’ Senior Field Ops",
  },
  {
    id: "H-006",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    module: "settings",
    actor: "System",
    target: "Pipeline",
    action: "Renamed stage",
    details: "â€˜Wonâ€™ retained",
  },
  {
    id: "H-007",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    module: "lead",
    actor: "Layla Hassan",
    target: "NEOM Logistics",
    action: "Lead created",
    details: "Source: Event",
  },
];

function allCrud(): CrudOp[] {
  return ["create", "read", "update", "delete"];
}
function defaultPermissions(): Record<UserRoleKey, RolePermission> {
  const allPages = [...APP_PAGES] as AppPage[];
  const mk = (
    pages: AppPage[],
    crudByPage: Partial<Record<AppPage, CrudOp[]>>,
    defaultCrud: CrudOp[] = ["read"],
  ): RolePermission => ({
    pages,
    crud: Object.fromEntries(
      allPages.map((p) => [p, pages.includes(p) ? (crudByPage[p] ?? defaultCrud) : []]),
    ) as Record<AppPage, CrudOp[]>,
  });
  return {
    admin: mk(allPages, Object.fromEntries(allPages.map((p) => [p, allCrud()])), allCrud()),
    manager: mk(
      [
        "dashboard",
        "leads",
        "pipeline",
        "activities",
        "projects",
        "employees",
        "attendance",
        "offers",
        "quotations",
        "reports",
        "notifications",
        "chat",
        "profile",
        "history",
      ],
      {
        leads: allCrud(),
        pipeline: allCrud(),
        activities: allCrud(),
        projects: ["read", "update"],
        attendance: ["read", "update"],
        offers: ["read", "update"],
        quotations: ["read", "update"],
        notifications: ["create", "read", "update"],
        chat: ["create", "read"],
        profile: ["read", "update"],
      },
    ),
    hr: mk(
      ["dashboard", "employees", "attendance", "notifications", "chat", "profile", "history"],
      {
        employees: allCrud(),
        attendance: allCrud(),
        notifications: ["read", "update"],
        chat: ["create", "read"],
        profile: ["read", "update"],
      },
    ),
    finance: mk(
      [
        "dashboard",
        "offers",
        "quotations",
        "projects",
        "reports",
        "notifications",
        "chat",
        "profile",
        "history",
      ],
      {
        offers: allCrud(),
        quotations: allCrud(),
        projects: ["read", "update"],
        reports: ["read"],
        notifications: ["read", "update"],
        chat: ["create", "read"],
        profile: ["read", "update"],
      },
    ),
    employee: mk(
      ["dashboard", "leads", "activities", "attendance", "notifications", "chat", "profile"],
      {
        leads: ["create", "read", "update"],
        activities: ["create", "read", "update"],
        attendance: ["create", "read"],
        notifications: ["read", "update"],
        chat: ["create", "read"],
        profile: ["read", "update"],
      },
    ),
  };
}

const seedUsers: AppUser[] = [
  {
    id: "U-1",
    name: "Admin",
    email: "hafez.rahim@integratedtechnics.com",
    role: "admin",
    active: true,
  },
  {
    id: "U-2",
    name: "Nour Khaled",
    email: "nour.khaled@integratedtechnics.com",
    role: "manager",
    active: true,
  },
  {
    id: "U-3",
    name: "Layla Hassan",
    email: "layla.hassan@integratedtechnics.com",
    role: "hr",
    active: true,
  },
  {
    id: "U-4",
    name: "Yusuf Saleh",
    email: "yusuf.saleh@integratedtechnics.com",
    role: "finance",
    active: true,
  },
  {
    id: "U-5",
    name: "Omar Tarek",
    email: "omar.tarek@integratedtechnics.com",
    role: "employee",
    active: true,
  },
];

const seedNotes: Note[] = [
  {
    id: "N-1",
    leadId: "L-1042",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    author: "Admin",
    text: "Client requested a revised SLA with 4-hour response window.",
  },
  {
    id: "N-2",
    leadId: "L-1042",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    author: "Nour Khaled",
    text: "Site survey scheduled for next Tuesday with their facilities team.",
  },
];

const seedAttachments: Attachment[] = [
  {
    id: "F-1",
    leadId: "L-1042",
    name: "Aramco_RFP_v2.pdf",
    size: "2.4 MB",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
  },
  {
    id: "F-2",
    leadId: "L-1042",
    name: "Site_Survey_Photos.zip",
    size: "18.1 MB",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
  },
];

const seedProfile: Profile = {
  name: "Admin",
  nameAr: "Ù…Ø¯ÙŠØ± Ø§Ù„Ù†Ø¸Ø§Ù…",
  title: "Sales Director",
  department: "Sales Department",
  email: "hafez.rahim@integratedtechnics.com",
  phone: "+20 100 123 4567",
  location: "Cairo HQ, Egypt",
  skills: [
    "Enterprise Sales",
    "CRM Strategy",
    "Odoo 19",
    "Negotiation",
    "Pipeline Management",
    "PMP Certified",
    "ITIL v4",
    "GDPR Compliance",
  ],
  manager: "Nour Khaled",
  avatarUrl:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  targetValue: 1200000,
  targetType: "yearly",
};

const seedSettings: Settings = {
  statuses: [
    "new",
    "qualified",
    "contacted",
    "meeting_scheduled",
    "proposal_sent",
    "negotiation",
    "won",
    "lost",
    "archived",
  ],
  stages: [
    { key: "new", label: "New", color: "#64748b" },
    { key: "qualified", label: "Qualified", color: "#8b5cf6" },
    { key: "contacted", label: "Contacted", color: "#3b82f6" },
    { key: "meeting_scheduled", label: "Meeting Scheduled", color: "#0ea5e9" },
    { key: "proposal_sent", label: "Proposal Sent", color: "#f59e0b" },
    { key: "negotiation", label: "Negotiation", color: "#ec4899" },
    { key: "won", label: "Won", color: "#10b981" },
    { key: "lost", label: "Lost", color: "#ef4444" },
    { key: "archived", label: "Archived", color: "#9ca3af" },
  ],
  activityTypes: [
    "Call",
    "Meeting",
    "Site Visit",
    "Follow-up",
    "Inspection",
    "Email",
    "Demo",
    "Workshop",
    "Presentation",
    "Negotiation",
    "Proposal",
    "Training",
    "Contract Signing",
    "Handover",
  ],
  automations: [
    {
      id: "AU-1",
      name: "Auto-assign new web leads",
      trigger: "Lead created from Website",
      action: "Assign to Nour Khaled",
      enabled: true,
    },
    {
      id: "AU-2",
      name: "Notify owner on stage change",
      trigger: "Pipeline stage moved",
      action: "Send push notification",
      enabled: true,
    },
    {
      id: "AU-3",
      name: "Escalate stalled proposals",
      trigger: "Lead in Proposal > 7 days",
      action: "Notify sales director",
      enabled: false,
    },
    {
      id: "AU-4",
      name: "Create kickoff project on Won",
      trigger: "Lead marked as Won",
      action: "Auto-create Project draft",
      enabled: true,
    },
  ],
  templates: [
    {
      id: "T-1",
      name: "Welcome email",
      channel: "Email",
      subject: "Welcome to Integrated Technics",
      body: "Dear {{contact}}, thank you for your interest in our services...",
    },
    {
      id: "T-2",
      name: "Proposal reminder",
      channel: "Email",
      subject: "Following up on your proposal â€” {{company}}",
      body: "Hi {{contact}}, just checking if you had a chance to review our proposal...",
    },
    {
      id: "T-3",
      name: "Site visit confirmation",
      channel: "SMS",
      subject: "",
      body: "Hello {{contact}}, our engineer will arrive at {{time}} on {{date}}. â€” INT",
    },
    {
      id: "T-4",
      name: "Won deal notification",
      channel: "WhatsApp",
      subject: "",
      body: "ðŸŽ‰ Welcome aboard {{company}}! Your project kickoff is being prepared.",
    },
  ],
  locations: [
    {
      name: "Cairo",
      districts: ["Nasr City", "Maadi", "Heliopolis", "Zamalek", "Downtown", "New Cairo"],
    },
    {
      name: "Giza",
      districts: ["Dokki", "Mohandessin", "6th of October", "Sheikh Zayed", "Haram"],
    },
    { name: "Alexandria", districts: ["Smouha", "Sidi Gaber", "Stanley", "Miami", "Montaza"] },
    { name: "Hurghada", districts: ["Sakkala", "Sahl Hasheesh", "El Dahar"] },
    { name: "Luxor", districts: ["East Bank", "West Bank", "Karnak"] },
    { name: "Port Said", districts: ["Al Arab", "Al Manakh", "Port Fouad"] },
  ],
  permissions: defaultPermissions(),
  departments: [],
  positions: [],
  workdayHours: 8,
};

const seedAttendance: AttendanceRecord[] = attendanceToday.records.map((r) => ({
  id: `AT-${r.id}`,
  date: new Date().toISOString().slice(0, 10),
  checkIn: r.in === "â€”" ? "" : r.in,
  checkOut: r.out === "â€”" ? "" : r.out,
  hours: r.hours,
  location: r.location === "â€”" ? "Cairo HQ" : r.location,
  owner: r.name,
}));

const _today = new Date();
const _daysAgo = (n: number) => {
  const d = new Date(_today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
// Spread seeded activities across recent days so period filters
// (today, yesterday, this week, this month) show meaningful data.
const _spread = [0, 0, 1, 1, 2, 3, 6, 10, 18, 25];
const _estPool = [30, 45, 60, 90, 120, 45, 60, 30, 90, 60];
const seedActivities: Activity[] = activities.map((a, i) => ({
  ...a,
  id: String(a.id),
  type: a.type as ActivityType,
  status: a.status as ActivityStatus,
  dueDate: _daysAgo(_spread[i % _spread.length]),
  estMinutes: _estPool[i % _estPool.length],
  createdAt: new Date().toISOString(),
}));

// Initial seed state â€” identical on server and first client render to avoid hydration mismatches.
const initialState: State = {
  leads: leads.map((l) => ({ ...l })),
  history: seedHistory,
  activities: seedActivities,
  notes: seedNotes,
  attachments: seedAttachments,
  settings: {
    ...seedSettings,
    locations: seedSettings.locations,
    permissions: seedSettings.permissions,
  },
  leadDistricts: {},
  projectLocations: {},
  projects: projects.map((p) => ({ ...p })),
  quotations: quotations,
  attendance: seedAttendance,
  profile: seedProfile,
  users: seedUsers,
  employees: mockEmployees.map((e) => ({ ...e })),
  notifications: [],
  projectRequests: [],
  onlineUserIds: [],
  celebrationLead: null,
  adminTasks: [],
  adminTaskActivities: [],
};

let state: State = initialState;

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const emit = () => {
  listeners.forEach((l) => l());
};
const getSnap = () => state;
const getServerSnap = () => initialState;

function set(updater: (s: State) => State) {
  state = updater(state);
  persist();
  emit();
}

function loadPersisted<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("int-crm:leads", JSON.stringify(state.leads));
    localStorage.setItem("int-crm:notes", JSON.stringify(state.notes));
    localStorage.setItem("int-crm:attachments", JSON.stringify(state.attachments));
    localStorage.setItem("int-crm:locations", JSON.stringify(state.settings.locations));
    localStorage.setItem("int-crm:leadDistricts", JSON.stringify(state.leadDistricts));
    localStorage.setItem("int-crm:projectLocations", JSON.stringify(state.projectLocations));
    localStorage.setItem("int-crm:projects", JSON.stringify(state.projects));
    localStorage.setItem("int-crm:quotations", JSON.stringify(state.quotations));
    // profile is sourced from Supabase; do not persist to avoid stale seed
    localStorage.setItem("int-crm:users", JSON.stringify(state.users));
    localStorage.setItem("int-crm:permissions", JSON.stringify(state.settings.permissions));
    localStorage.setItem("int-crm:workdayHours", JSON.stringify(state.settings.workdayHours));
    localStorage.setItem("int-crm:notifications", JSON.stringify(state.notifications));
  } catch {
    /* quota or serialization issue â€” ignore */
  }
}

let _hydrated = false;
function hydrateFromStorage() {
  if (_hydrated || typeof window === "undefined") return;
  _hydrated = true;
  try {
    localStorage.removeItem("int-crm:profile");
    localStorage.removeItem("int-crm:activities:v2");
    localStorage.removeItem("int-crm:attendance");
  } catch {
    /* ignore */
  }
  state = {
    ...state,
    leads: loadPersisted("int-crm:leads", state.leads),
    notes: loadPersisted("int-crm:notes", state.notes),
    attachments: loadPersisted("int-crm:attachments", state.attachments),
    settings: {
      ...state.settings,
      locations: loadPersisted("int-crm:locations", state.settings.locations),
      permissions: loadPersisted("int-crm:permissions", state.settings.permissions),
      workdayHours: loadPersisted("int-crm:workdayHours", state.settings.workdayHours),
    },
    leadDistricts: loadPersisted("int-crm:leadDistricts", state.leadDistricts),
    projectLocations: loadPersisted("int-crm:projectLocations", state.projectLocations),
    projects: loadPersisted("int-crm:projects", state.projects),
    quotations: loadPersisted("int-crm:quotations", state.quotations),
    // profile intentionally not hydrated from storage (Supabase is source of truth)
    users: loadPersisted("int-crm:users", state.users),
    notifications: loadPersisted("int-crm:notifications", state.notifications),
  };
  emit();
}

export function useStoreState(): State {
  const snap = useSyncExternalStore(subscribe, getSnap, getServerSnap);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    hydrateFromStorage();
    setMounted(true);
  }, []);
  return mounted ? snap : initialState;
}

function logHistory(entry: Omit<HistoryEntry, "id" | "ts"> & { actor?: string }) {
  const normalizedEntry = { ...entry, actor: entry.actor ?? "System" };
  set((s) => ({ ...s, history: [{ id: id("H"), ts: now(), ...normalizedEntry }, ...s.history] }));
}

function pushNotificationInternal(
  n: Omit<AppNotification, "id" | "ts" | "unread"> & { unread?: boolean },
) {
  const notif: AppNotification = { id: id("N"), ts: now(), unread: n.unread ?? true, ...n };
  set((s) => ({ ...s, notifications: [notif, ...s.notifications].slice(0, 100) }));
}

export const actions = {
  clearCelebration() {
    set((s) => ({ ...s, celebrationLead: null }));
  },
  moveLead(leadId: string, to: LeadStatus, actor?: string) {
    let from: LeadStatus | undefined;
    let company = "";
    
    set((s) => {
      from = s.leads.find((l) => l.id === leadId)?.status;
      company = s.leads.find((l) => l.id === leadId)?.company ?? "";
      const updatedLeads = s.leads.map((l) => {
        if (l.id === leadId) {
          return { ...l, status: to, updatedAt: "just now" };
        }
        return l;
      });
      return {
        ...s,
        leads: updatedLeads,
        celebrationLead:
          to === "won" && from !== "won" ? updatedLeads.find((l) => l.id === leadId) || null : s.celebrationLead,
      };
    });
    if (from && from !== to) {
      const label = (k: LeadStatus) => state.settings.stages.find((x) => x.key === k)?.label ?? k;
      logHistory({
        module: "pipeline",
        actor,
        target: company || leadId,
        action: `Moved to ${label(to)}`,
        details: `${label(from)} â†’ ${label(to)}`,
      });
      sb.sbUpdateLead(leadId, { status: to });
      const lead = state.leads.find((l) => l.id === leadId);
      const ownerName = lead?.owner;
      pushNotificationInternal({
        type: "lead",
        titleEn: "Lead status changed",
        titleAr: "ØªÙ… ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø§Ù„Ø¹Ù…ÙŠÙ„",
        bodyEn: `${company || leadId}: ${label(from)} â†’ ${label(to)}`,
        bodyAr: `${company || leadId}: ${label(from)} â† ${label(to)}`,
        href: `/admin/leads/${leadId}`,
        audience: ownerName && ownerName !== actor ? [ownerName] : undefined,
      });
    }
  },
  addNote(leadId: string, text: string, author?: string) {
    const resolvedAuthor = (author ?? state.profile?.name ?? "System") as string;
    const note: Note = { id: id("N"), leadId, ts: now(), author: resolvedAuthor, text };
    set((s) => ({ ...s, notes: [note, ...s.notes] }));
    const company = state.leads.find((l) => l.id === leadId)?.company ?? leadId;
    logHistory({
      module: "lead",
      actor: (author ?? state.profile?.name ?? "System") as string,
      target: company,
      action: "Added note",
      details: text.slice(0, 80),
    });
    sb.sbAddNote(note.id, leadId, text);
  },
  addAttachment(
    leadId: string,
    name: string,
    size = "â€”",
    author?: string,
    dataUrl?: string,
    mime?: string,
  ) {
    const resolvedAuthor: string = author ?? state.profile?.name ?? "System";
    const att: Attachment = { id: id("F"), leadId, name, size, ts: now(), dataUrl, mime };
    set((s) => ({ ...s, attachments: [att, ...s.attachments] }));
    const company = state.leads.find((l) => l.id === leadId)?.company ?? leadId;
    logHistory({
      module: "lead",
      actor: resolvedAuthor,
      target: company,
      action: "Uploaded attachment",
      details: name,
    });
  },
  removeAttachment(attId: string, actor?: string) {
    const att = state.attachments.find((a) => a.id === attId);
    set((s) => ({ ...s, attachments: s.attachments.filter((a) => a.id !== attId) }));
    if (att) {
      const company = state.leads.find((l) => l.id === att.leadId)?.company ?? att.leadId;
      logHistory({
        module: "lead",
        actor,
        target: company,
        action: "Removed attachment",
        details: att.name,
      });
    }
  },
  removeNote(noteId: string, actor?: string) {
    const note = state.notes.find((n) => n.id === noteId);
    set((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== noteId) }));
    if (note) {
      const company = state.leads.find((l) => l.id === note.leadId)?.company ?? note.leadId;
      logHistory({ module: "lead", actor, target: company, action: "Removed note" });
      sb.sbDeleteNote(noteId);
    }
  },
  sendReminder(activityId: string, templateId: string, actor?: string) {
    const activity = state.activities.find((a) => a.id === activityId);
    const template = state.settings.templates.find((t) => t.id === templateId);
    if (!activity || !template) return;
    const lead = activity.leadId ? state.leads.find((l) => l.id === activity.leadId) : undefined;
    const target = lead?.company ?? activity.projectId ?? activity.title;
    logHistory({
      module: "activity",
      actor,
      target,
      action: `Sent ${template.channel} reminder`,
      details: `â€œ${template.name}â€ â†’ ${activity.title}`,
    });
    const ownerName =
      activity.owner && activity.owner !== "Unassigned"
        ? activity.owner
        : (activity as any).createdByName;
    if (ownerName) {
      pushNotificationInternal({
        type: "activity",
        titleEn: `Reminder: ${activity.title}`,
        titleAr: `ØªØ°ÙƒÙŠØ±: ${activity.title}`,
        bodyEn: `${actor} sent a ${template.channel} reminder Â· due ${activity.dueDate} ${activity.time}${lead ? ` Â· ${lead.company}` : ""}`,
        bodyAr: `${actor} Ø£Ø±Ø³Ù„ ØªØ°ÙƒÙŠØ±Ù‹Ø§ Ø¹Ø¨Ø± ${template.channel} Â· Ù…Ø³ØªØ­Ù‚ ${activity.dueDate} ${activity.time}`,
        href: `/employee/activities/${activity.id}`,
        audience: [ownerName],
      });
    }
  },
  addActivity(a: Omit<Activity, "id" | "createdAt" | "status"> & { status?: ActivityStatus }) {
    const me = state.profile?.name && state.profile.name !== "â€”" ? state.profile.name : undefined;
    const myPhoto = state.profile?.avatarUrl;
    const ownerName = a.owner && a.owner !== "Unassigned" ? a.owner : (me ?? "Unassigned");
    const act: Activity = {
      id: id("A"),
      createdAt: now(),
      status: a.status ?? "pending",
      approvalStatus: "approved",
      ...a,
      owner: ownerName,
      createdBy: a.createdBy ?? me,
      createdByName: a.createdByName ?? me ?? ownerName,
      createdByPhoto: a.createdByPhoto ?? myPhoto,
    };
    set((s) => ({ ...s, activities: [act, ...s.activities] }));
    const target = act.leadId
      ? (state.leads.find((l) => l.id === act.leadId)?.company ?? act.leadId)
      : (act.projectId ?? "â€”");
    logHistory({
      module: "activity",
      actor: act.owner,
      target,
      action: `Scheduled ${act.type}`,
      details: `${act.title} @ ${act.dueDate} ${act.time}`,
    });
    sb.sbAddActivity(act.id, act);
    if (ownerName && me && ownerName !== me) {
      pushNotificationInternal({
        type: "activity",
        titleEn: "New activity assigned",
        titleAr: "ØªÙ… ØªØ¹ÙŠÙŠÙ† Ù†Ø´Ø§Ø· Ø¬Ø¯ÙŠØ¯",
        bodyEn: `${me} scheduled ${act.type}: "${act.title}" on ${act.dueDate}`,
        bodyAr: `Ù‚Ø§Ù… ${me} Ø¨Ø¬Ø¯ÙˆÙ„Ø© "${act.title}" ÙÙŠ ${act.dueDate}`,
        href: `/employee/activities/${act.id}`,
        audience: [ownerName],
      });
    }

    const ownerUser = state.users.find((u) => u.name === ownerName);
    const managerName = state.users.find((u) => u.id === ownerUser?.managerId)?.name;
    const admins = state.users.filter((u) => u.role === "admin").map((u) => u.name);
    const notifyAudience = [...new Set([...admins, managerName].filter(Boolean))] as string[];

    pushNotificationInternal({
      type: "activity",
      titleEn: "New activity created",
      titleAr: "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù†Ø´Ø§Ø· Ø¬Ø¯ÙŠØ¯",
      bodyEn: `${act.type} "${act.title}" â€” owner: ${ownerName}`,
      bodyAr: `${act.type} "${act.title}" â€” Ø§Ù„Ù…Ø§Ù„Ùƒ: ${ownerName}`,
      href: `/admin/activities/${act.id}`,
      audience: notifyAudience.length > 0 ? notifyAudience : undefined,
    });
  },
  setActivityStatus(actId: string, status: ActivityStatus, actor?: string) {
    let title = "";
    set((s) => ({
      ...s,
      activities: s.activities.map((a) => {
        if (a.id === actId) {
          title = a.title;
          return { ...a, status };
        }
        return a;
      }),
    }));
    logHistory({
      module: "activity",
      actor,
      target: title,
      action: `Marked ${status.replace("_", " ")}`,
    });
    sb.sbUpdateActivity(actId, { status });
  },
  approveActivity(actId: string, actor?: string, reviewNote?: string) {
    const resolvedActor: string = actor ?? state.profile?.name ?? "System";
    let title = "";
    let ownerName = "";
    set((s) => ({
      ...s,
      activities: s.activities.map((a) => {
        if (a.id === actId) {
          title = a.title;
          ownerName = a.owner;
          return {
            ...a,
            approvalStatus: "approved",
            approvedByName: resolvedActor,
            approvedAt: new Date().toISOString(),
            reviewNote: reviewNote ?? a.reviewNote,
            rejectionReason: undefined,
          };
        }
        return a;
      }),
    }));
    logHistory({
      module: "activity",
      actor: resolvedActor,

      target: title,
      action: "Approved activity",
      details: reviewNote,
    });
    sb.sbApproveActivity(actId, reviewNote);
    if (ownerName && ownerName !== resolvedActor) {
      pushNotificationInternal({
        type: "activity",
        titleEn: "Activity approved",
        titleAr: "ØªÙ…Øª Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø§Ù„Ù†Ø´Ø§Ø·",
        bodyEn: `${actor} approved â€œ${title}â€${reviewNote ? ` â€” ${reviewNote}` : ""}`,
        bodyAr: `${actor} Ø§Ø¹ØªÙ…Ø¯ "${title}"${reviewNote ? ` â€” ${reviewNote}` : ""}`,
        audience: [ownerName],
        href: "/employee/activities",
      });
    }
  },
  rejectActivity(actId: string, reason: string, actor?: string) {
    let title = "";
    let ownerName = "";
    set((s) => ({
      ...s,
      activities: s.activities.map((a) => {
        if (a.id === actId) {
          title = a.title;
          ownerName = a.owner;
          return {
            ...a,
            approvalStatus: "rejected",
            rejectionReason: reason,
            approvedByName: actor,
            approvedAt: new Date().toISOString(),
          };
        }
        return a;
      }),
    }));
    logHistory({
      module: "activity",
      actor,
      target: title,
      action: "Rejected activity",
      details: reason,
    });
    sb.sbRejectActivity(actId, reason);
    if (ownerName && ownerName !== actor) {
      pushNotificationInternal({
        type: "activity",
        titleEn: "Activity rejected",
        titleAr: "ØªÙ… Ø±ÙØ¶ Ø§Ù„Ù†Ø´Ø§Ø·",
        bodyEn: `${actor} rejected â€œ${title}â€ â€” ${reason}`,
        bodyAr: `${actor} Ø±ÙØ¶ "${title}" â€” ${reason}`,
        audience: [ownerName],
        href: "/employee/activities",
      });
    }
  },
  setActivityReviewNote(actId: string, note: string, actor?: string) {
    set((s) => ({
      ...s,
      activities: s.activities.map((a) => (a.id === actId ? { ...a, reviewNote: note } : a)),
    }));
    sb.sbSetActivityReviewNote(actId, note);
  },
  toggleAutomation(ruleId: string) {
    let name = "",
      enabled = false;
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        automations: s.settings.automations.map((r) => {
          if (r.id === ruleId) {
            name = r.name;
            enabled = !r.enabled;
            return { ...r, enabled };
          }
          return r;
        }),
      },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: name,
      action: enabled ? "Enabled automation" : "Disabled automation",
    });
  },
  addAutomation(name: string, trigger: string, action: string) {
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        automations: [
          ...s.settings.automations,
          { id: id("AU"), name, trigger, action, enabled: true },
        ],
      },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: name,
      action: "Added automation rule",
    });
  },
  updateAutomation(ruleId: string, payload: Partial<AutomationRule>) {
    let name = "";
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        automations: s.settings.automations.map((r) => {
          if (r.id === ruleId) {
            name = payload.name ?? r.name;
            return { ...r, ...payload };
          }
          return r;
        }),
      },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: name,
      action: "Updated automation rule",
    });
  },
  deleteAutomation(ruleId: string) {
    let name = "";
    set((s) => {
      name = s.settings.automations.find((r) => r.id === ruleId)?.name ?? "";
      return {
        ...s,
        settings: {
          ...s.settings,
          automations: s.settings.automations.filter((r) => r.id !== ruleId),
        },
      };
    });
    logHistory({
      module: "settings",
      actor: "System",
      target: name,
      action: "Deleted automation rule",
    });
  },
  renameStage(key: string, label: string) {
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        stages: s.settings.stages.map((st) => (st.key === key ? { ...st, label } : st)),
      },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: "Pipeline",
      action: "Renamed stage",
      details: `${key} â†’ ${label}`,
    });
  },
  setStageColor(key: string, color: string) {
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        stages: s.settings.stages.map((st) => (st.key === key ? { ...st, color } : st)),
      },
    }));
  },
  reorderStages(fromIdx: number, toIdx: number, actor?: string) {
    if (fromIdx === toIdx) return;
    let movedLabel = "";
    set((s) => {
      const next = [...s.settings.stages];
      if (fromIdx < 0 || fromIdx >= next.length || toIdx < 0 || toIdx >= next.length) return s;
      const [m] = next.splice(fromIdx, 1);
      movedLabel = m.label;
      next.splice(toIdx, 0, m);
      return {
        ...s,
        settings: {
          ...s.settings,
          stages: next,
          statuses: next.map((st) => st.key),
        },
      };
    });
    logHistory({
      module: "settings",
      actor,
      target: "Pipeline",
      action: "Reordered stages",
      details: `${movedLabel} â†’ position ${toIdx + 1}`,
    });
  },
  addStatus(label: string) {
    const lbl = label.trim();
    if (!lbl) return;
    const key = lbl
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key) return;
    set((s) => {
      if (s.settings.statuses.includes(key)) return s;
      const palette = [
        "#64748b",
        "#3b82f6",
        "#8b5cf6",
        "#0ea5e9",
        "#f59e0b",
        "#ec4899",
        "#10b981",
        "#ef4444",
        "#9ca3af",
        "#14b8a6",
      ];
      const color = palette[s.settings.stages.length % palette.length];
      return {
        ...s,
        settings: {
          ...s.settings,
          statuses: [...s.settings.statuses, key],
          stages: [...s.settings.stages, { key, label: lbl, color }],
        },
      };
    });
    logHistory({
      module: "settings",
      actor: "System",
      target: "Pipeline",
      action: "Added status",
      details: lbl,
    });
  },
  removeStatus(key: string) {
    if (["new", "won", "lost"].includes(key)) return;
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        statuses: s.settings.statuses.filter((x) => x !== key),
        stages: s.settings.stages.filter((st) => st.key !== key),
      },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: "Pipeline",
      action: "Removed status",
      details: key,
    });
  },
  setWorkdayHours(h: number) {
    const v = Math.max(1, Math.min(24, Number(h) || 8));
    set((s) => ({ ...s, settings: { ...s.settings, workdayHours: v } }));
    logHistory({
      module: "settings",
      actor: "System",
      target: "Workday",
      action: "Updated standard workday",
      details: `${v}h`,
    });
  },
  addActivityType(t: string) {
    const n = t.trim();
    if (!n) return;
    if (state.settings.activityTypes.some((x) => x.toLowerCase() === n.toLowerCase())) return;
    set((s) => ({
      ...s,
      settings: { ...s.settings, activityTypes: [...s.settings.activityTypes, n as ActivityType] },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: "Activities",
      action: "Added activity type",
      details: n,
    });
  },
  removeActivityType(t: string) {
    set((s) => ({
      ...s,
      settings: { ...s.settings, activityTypes: s.settings.activityTypes.filter((x) => x !== t) },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: "Activities",
      action: "Removed activity type",
      details: t,
    });
  },
  addCity(name: string, nameAr?: string) {
    const n = name.trim();
    if (!n) return;
    if (state.settings.locations.some((c) => c.name.toLowerCase() === n.toLowerCase())) return;
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        locations: [
          ...s.settings.locations,
          { name: n, nameAr: nameAr?.trim() || undefined, districts: [], districtsAr: {} },
        ],
      },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: "Locations",
      action: "Added city",
      details: n,
    });
  },
  removeCity(name: string) {
    set((s) => ({
      ...s,
      settings: { ...s.settings, locations: s.settings.locations.filter((c) => c.name !== name) },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: "Locations",
      action: "Removed city",
      details: name,
    });
  },
  updateCityAr(name: string, nameAr: string) {
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        locations: s.settings.locations.map((c) =>
          c.name === name ? { ...c, nameAr: nameAr.trim() || undefined } : c,
        ),
      },
    }));
  },
  addDistrict(city: string, district: string, districtAr?: string) {
    const d = district.trim();
    if (!d) return;
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        locations: s.settings.locations.map((c) => {
          if (c.name !== city) return c;
          if (c.districts.some((x) => x.toLowerCase() === d.toLowerCase())) return c;
          const nextAr = { ...(c.districtsAr ?? {}) };
          if (districtAr?.trim()) nextAr[d] = districtAr.trim();
          return { ...c, districts: [...c.districts, d], districtsAr: nextAr };
        }),
      },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: city,
      action: "Added district",
      details: d,
    });
  },
  removeDistrict(city: string, district: string) {
    set((s) => ({
      ...s,
      settings: {
        ...s.settings,
        locations: s.settings.locations.map((c) => {
          if (c.name !== city) return c;
          const nextAr = { ...(c.districtsAr ?? {}) };
          delete nextAr[district];
          return {
            ...c,
            districts: c.districts.filter((x) => x !== district),
            districtsAr: nextAr,
          };
        }),
      },
    }));
    logHistory({
      module: "settings",
      actor: "System",
      target: city,
      action: "Removed district",
      details: district,
    });
  },
  setLeadLocation(leadId: string, city: string, district: string) {
    let company = leadId;
    set((s) => ({
      ...s,
      leads: s.leads.map((l) => {
        if (l.id === leadId) {
          company = l.company;
          return { ...l, city };
        }
        return l;
      }),
      leadDistricts: { ...s.leadDistricts, [leadId]: district },
    }));
    logHistory({
      module: "lead",
      actor: "System",
      target: company,
      action: "Updated location",
      details: `${city}${district ? ` Â· ${district}` : ""}`,
    });
    sb.sbUpdateLead(leadId, { city });
    sb.sbSetLeadDistrict(leadId, district);
  },
  setProjectLocation(projectId: string, city: string, district: string) {
    set((s) => ({
      ...s,
      projectLocations: { ...s.projectLocations, [projectId]: { city, district } },
    }));
    logHistory({
      module: "project",
      actor: "System",
      target: projectId,
      action: "Updated location",
      details: `${city}${district ? ` Â· ${district}` : ""}`,
    });
  },
  // ---- Notifications ----
  pushNotification(n: Omit<AppNotification, "id" | "ts" | "unread"> & { unread?: boolean }) {
    pushNotificationInternal(n);
  },
  markNotificationRead(notifId: string) {
    set((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === notifId ? { ...n, unread: false } : n)),
    }));
    void sb.sbMarkNotificationRead(notifId);
  },
  markNotificationUnread(notifId: string) {
    set((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === notifId ? { ...n, unread: true } : n)),
    }));
    void sb.sbMarkNotificationUnread(notifId);
  },
  markAllNotificationsRead(audience?: string) {
    set((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        !audience || !n.audience || n.audience.includes(audience) ? { ...n, unread: false } : n,
      ),
    }));
    void sb.sbMarkAllNotificationsRead();
  },
  dismissNotification(notifId: string) {
    set((s) => ({ ...s, notifications: s.notifications.filter((n) => n.id !== notifId) }));
    void sb.sbDismissNotification(notifId);
  },
  // ---- Leads CRUD ----
  addLead(input: Omit<Lead, "id" | "updatedAt">, actor?: string) {
    const lead: Lead = { ...input, id: id("L"), updatedAt: "just now" };
    set((s) => ({ ...s, leads: [lead, ...s.leads] }));
    logHistory({ module: "lead", actor, target: lead.company, action: "Lead created" });
    sb.sbAddLead(lead.id, input);
    if (lead.owner && lead.owner !== actor) {
      pushNotificationInternal({
        type: "lead",
        titleEn: "New lead assigned",
        titleAr: "ØªÙ… ØªØ¹ÙŠÙŠÙ† Ø¹Ù…ÙŠÙ„ Ù…Ø­ØªÙ…Ù„ Ø¬Ø¯ÙŠØ¯",
        bodyEn: `${lead.company} assigned to you by ${actor}`,
        bodyAr: `ØªÙ… ØªØ¹ÙŠÙŠÙ† ${lead.company} Ø¥Ù„ÙŠÙƒ Ù…Ù† Ù‚Ø¨Ù„ ${actor}`,
        audience: [lead.owner],
      });
    }
    if (lead.status === "won") {
      (actions as any).convertLeadToQuotation(lead, actor);
    }
  },
  reassignLead(leadId: string, newOwner: string, actor?: string) {
    let company = leadId;
    let previousOwner = "";
    set((s) => ({
      ...s,
      leads: s.leads.map((l) => {
        if (l.id === leadId) {
          company = l.company;
          previousOwner = l.owner;
          return { ...l, owner: newOwner, updatedAt: "just now" };
        }
        return l;
      }),
    }));
    if (previousOwner === newOwner) return;
    logHistory({
      module: "lead",
      actor,
      target: company,
      action: "Reassigned lead",
      details: `${previousOwner} â†’ ${newOwner}`,
    });
    sb.sbUpdateLead(leadId, { owner: newOwner });
    // Notify the new owner across panels
    pushNotificationInternal({
      type: "lead",
      titleEn: "Lead reassigned to you",
      titleAr: "ØªÙ… Ù†Ù‚Ù„ Ø¹Ù…ÙŠÙ„ Ù…Ø­ØªÙ…Ù„ Ø¥Ù„ÙŠÙƒ",
      bodyEn: `${company} now assigned to you (was ${previousOwner})`,
      bodyAr: `${company} ØªÙ… ØªØ¹ÙŠÙŠÙ†Ù‡ Ø¥Ù„ÙŠÙƒ (ÙƒØ§Ù† Ù…Ø¹ ${previousOwner})`,
      href: "/employee/leads",
      audience: [newOwner],
    });
    // Inform managers/admins too
    pushNotificationInternal({
      type: "lead",
      titleEn: "Lead ownership changed",
      titleAr: "ØªÙ… ØªØºÙŠÙŠØ± Ù…Ù„ÙƒÙŠØ© Ø§Ù„Ø¹Ù…ÙŠÙ„",
      bodyEn: `${company}: ${previousOwner} â†’ ${newOwner}`,
      bodyAr: `${company}: ${previousOwner} â† ${newOwner}`,
      href: "/admin/leads",
    });
  },
  updateLead(leadId: string, patch: Partial<Lead>, actor?: string) {
    let company = leadId;
    let prevStatus: LeadStatus | undefined;
    let updatedLead: Lead | undefined;
    set((s) => ({
      ...s,
      leads: s.leads.map((l) => {
        if (l.id === leadId) {
          company = patch.company ?? l.company;
          prevStatus = l.status;
          updatedLead = { ...l, ...patch, updatedAt: "just now" };
          return updatedLead;
        }
        return l;
      }),
    }));
    logHistory({ module: "lead", actor, target: company, action: "Updated lead" });
    sb.sbUpdateLead(leadId, patch);
    // Status change notification
    if (updatedLead && patch.status && prevStatus && patch.status !== prevStatus) {
      const label = (k: LeadStatus) => state.settings.stages.find((x) => x.key === k)?.label ?? k;
      pushNotificationInternal({
        type: "lead",
        titleEn: "Lead status changed",
        titleAr: "ØªÙ… ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø§Ù„Ø¹Ù…ÙŠÙ„",
        bodyEn: `${company}: ${label(prevStatus)} â†’ ${label(patch.status)}`,
        bodyAr: `${company}: ${label(prevStatus)} â† ${label(patch.status)}`,
        href: `/admin/leads/${leadId}`,
        audience:
          updatedLead.owner && updatedLead.owner !== actor ? [updatedLead.owner] : undefined,
      });
    }
    // Auto-convert to quotation when lead enters "won" stage
    if (updatedLead && patch.status === "won" && prevStatus !== "won") {
      (actions as any).convertLeadToQuotation(updatedLead, actor);
    }
  },
  convertLeadToQuotation(lead: Lead, actor?: string) {
    // Skip if already converted
    const existing = state.quotations.find((q) => q.leadId === lead.id);
    if (existing) return existing.id;
    const qid = id("Q");
    const quotation: Quotation = {
      id: qid,
      leadId: lead.id,
      client: lead.company,
      submissionDate: new Date().toISOString().slice(0, 10),
      value: lead.value,
      status: "draft",
      revisions: 0,
      owner: lead.owner,
    };
    set((s) => ({ ...s, quotations: [quotation, ...s.quotations] }));
    logHistory({
      module: "pipeline",
      actor,
      target: `${quotation.id} Â· ${quotation.client}`,
      action: "Lead converted to quotation",
      details: `From lead ${lead.id}`,
    });
    pushNotificationInternal({
      type: "quotation",
      titleEn: "Lead converted to quotation",
      titleAr: "ØªÙ… ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø§Ù„Ù…Ø­ØªÙ…Ù„ Ø¥Ù„Ù‰ Ø¹Ø±Ø¶ Ø³Ø¹Ø±",
      bodyEn: `${lead.company} â†’ ${quotation.id} (${quotation.value})`,
      bodyAr: `${lead.company} â† ${quotation.id}`,
      href: `/admin/offers/${quotation.id}`,
      audience: lead.owner ? [lead.owner] : undefined,
    });
    return qid;
  },
  removeLead(leadId: string, actor?: string) {
    const company = state.leads.find((l) => l.id === leadId)?.company ?? leadId;
    set((s) => ({ ...s, leads: s.leads.filter((l) => l.id !== leadId) }));
    logHistory({ module: "lead", actor, target: company, action: "Deleted lead" });
    sb.sbDeleteLead(leadId);
  },
  // ---- Activity CRUD extras ----
  updateActivity(actId: string, patch: Partial<Activity>, actor?: string) {
    let title = actId;
    set((s) => ({
      ...s,
      activities: s.activities.map((a) => {
        if (a.id === actId) {
          title = patch.title ?? a.title;
          return { ...a, ...patch };
        }
        return a;
      }),
    }));
    logHistory({ module: "activity", actor, target: title, action: "Updated activity" });
    sb.sbUpdateActivity(actId, patch);
  },
  removeActivity(actId: string, actor?: string) {
    const title = state.activities.find((a) => a.id === actId)?.title ?? actId;
    set((s) => ({ ...s, activities: s.activities.filter((a) => a.id !== actId) }));
    logHistory({ module: "activity", actor, target: title, action: "Deleted activity" });
    sb.sbDeleteActivity(actId);
  },
  // ---- Projects CRUD ----
  addProject(input: Omit<Project, "id">, actor?: string) {
    const me = state.profile?.name && state.profile.name !== "â€”" ? state.profile.name : undefined;
    const project: Project = {
      createdByName: me,
      createdBy: state.profile?.userId,
      ...input,
      id: id("P"),
    };
    set((s) => ({ ...s, projects: [project, ...s.projects] }));
    logHistory({ module: "project", actor, target: project.name, action: "Project created" });
    sb.sbAddProject(project.id, project);
    pushNotificationInternal({
      type: "project",
      titleEn: "New project created",
      titleAr: "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø´Ø±ÙˆØ¹ Ø¬Ø¯ÙŠØ¯",
      bodyEn: `${project.name} Â· ${project.client}`,
      bodyAr: `${project.name} Â· ${project.client}`,
      href: `/admin/projects/${project.id}`,
      audience: project.teamMembers && project.teamMembers.length ? project.teamMembers : undefined,
    });
  },
  updateProject(projectId: string, patch: Partial<Project>, actor?: string) {
    let name = projectId;
    let prevStatus: string | undefined;
    let nextProject: Project | undefined;
    set((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.id === projectId) {
          name = patch.name ?? p.name;
          prevStatus = p.status;
          nextProject = { ...p, ...patch };
          return nextProject;
        }
        return p;
      }),
    }));
    logHistory({ module: "project", actor, target: name, action: "Updated project" });
    sb.sbUpdateProject(projectId, patch);
    if (nextProject && patch.status && prevStatus && patch.status !== prevStatus) {
      pushNotificationInternal({
        type: "project",
        titleEn: "Project status changed",
        titleAr: "ØªÙ… ØªØºÙŠÙŠØ± Ø­Ø§Ù„Ø© Ø§Ù„Ù…Ø´Ø±ÙˆØ¹",
        bodyEn: `${name}: ${prevStatus} â†’ ${patch.status}`,
        bodyAr: `${name}: ${prevStatus} â† ${patch.status}`,
        href: `/admin/projects/${projectId}`,
        audience:
          nextProject.teamMembers && nextProject.teamMembers.length
            ? nextProject.teamMembers
            : undefined,
      });
    } else if (nextProject) {
      pushNotificationInternal({
        type: "project",
        titleEn: "Project updated",
        titleAr: "ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø´Ø±ÙˆØ¹",
        bodyEn: `${name} updated by ${actor}`,
        bodyAr: `ØªÙ… ØªØ­Ø¯ÙŠØ« ${name} Ø¨ÙˆØ§Ø³Ø·Ø© ${actor}`,
        href: `/admin/projects/${projectId}`,
        audience:
          nextProject.teamMembers && nextProject.teamMembers.length
            ? nextProject.teamMembers
            : undefined,
      });
    }
  },
  removeProject(projectId: string, actor?: string) {
    const name = state.projects.find((p) => p.id === projectId)?.name ?? projectId;
    set((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== projectId) }));
    logHistory({ module: "project", actor, target: name, action: "Deleted project" });
    sb.sbDeleteProject(projectId);
  },
  // ---- Attendance CRUD ----
  addAttendance(input: Omit<AttendanceRecord, "id">, actor?: string) {
    const rec: AttendanceRecord = { ...input, id: id("AT") };
    set((s) => ({ ...s, attendance: [rec, ...s.attendance] }));
    logHistory({
      module: "employee",
      actor,
      target: rec.owner,
      action: "Attendance logged",
      details: `${rec.date} ${rec.checkIn}`,
    });
    sb.sbAddAttendance(rec.id, rec);
    pushNotificationInternal({
      type: "attendance",
      titleEn: "Check-in recorded",
      titleAr: "ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±",
      bodyEn: `${rec.owner} checked in at ${rec.checkIn} Â· ${rec.location}`,
      bodyAr: `${rec.owner} Ø³Ø¬Ù„ Ø§Ù„Ø­Ø¶ÙˆØ± ${rec.checkIn} Â· ${rec.location}`,
      href: "/admin/attendance",
    });
  },
  updateAttendance(recId: string, patch: Partial<AttendanceRecord>, actor?: string) {
    let owner = "";
    set((s) => ({
      ...s,
      attendance: s.attendance.map((a) => {
        if (a.id === recId) {
          owner = a.owner;
          return { ...a, ...patch };
        }
        return a;
      }),
    }));
    logHistory({ module: "employee", actor, target: recId, action: "Updated attendance" });
    sb.sbUpdateAttendance(recId, patch);
    if (patch.checkOut) {
      pushNotificationInternal({
        type: "attendance",
        titleEn: "Check-out recorded",
        titleAr: "ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø§Ù†ØµØ±Ø§Ù",
        bodyEn: `${owner} checked out at ${patch.checkOut}${patch.hours ? ` Â· ${patch.hours}` : ""}`,
        bodyAr: `${owner} Ø³Ø¬Ù„ Ø§Ù„Ø§Ù†ØµØ±Ø§Ù ${patch.checkOut}${patch.hours ? ` Â· ${patch.hours}` : ""}`,
        href: "/admin/attendance",
      });
    }
  },
  removeAttendance(recId: string, actor?: string) {
    set((s) => ({ ...s, attendance: s.attendance.filter((a) => a.id !== recId) }));
    logHistory({ module: "employee", actor, target: recId, action: "Removed attendance" });
  },
  // ---- Profile ----
  updateProfile(patch: Partial<Profile>, actor?: string) {
    set((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
    logHistory({
      module: "employee",
      actor,
      target: state.profile.name,
      action: "Updated profile",
    });
    sb.sbUpdateOwnProfile(patch);
  },
  // ---- Users CRUD ----
  addUser(input: Omit<AppUser, "id">, actor?: string) {
    const user: AppUser = { ...input, id: id("U") };
    set((s) => ({ ...s, users: [user, ...s.users] }));
    logHistory({
      module: "settings",
      actor,
      target: user.name,
      action: "User created",
      details: user.role,
    });
  },
  updateUser(userId: string, patch: Partial<AppUser>, actor?: string) {
    let name = userId;
    let profileId: string | undefined;
    let previousRole: UserRoleKey | undefined;
    let previousManagerId: string | undefined;
    set((s) => {
      const users = s.users.map((u) => {
        if (u.id === userId) {
          name = patch.name ?? u.name;
          profileId = u.profileId;
          previousRole = u.role;
          previousManagerId = u.managerId;
          return { ...u, ...patch };
        }
        return u;
      });
      // Mirror manager change onto the corresponding employee record so
      // useMyTeam() and other manager views reflect immediately without reload.
      const employees =
        patch.managerId !== undefined && profileId
          ? s.employees.map((e: any) =>
              e.id === profileId ? { ...e, managerId: patch.managerId || undefined } : e,
            )
          : s.employees;
      return { ...s, users, employees };
    });
    void sb.sbUpdateProfile(profileId, patch);
    if (patch.role && previousRole && patch.role !== previousRole) {
      void sb.sbAssignRole(userId, patch.role, previousRole);
    }
    // Audit manager reassignment with old/new manager names.
    if (patch.managerId !== undefined && patch.managerId !== previousManagerId) {
      const prevName = previousManagerId
        ? (state.users.find((u) => u.profileId === previousManagerId)?.name ?? "â€”")
        : "â€”";
      const newName = patch.managerId
        ? (state.users.find((u) => u.profileId === patch.managerId)?.name ?? "â€”")
        : "â€”";
      const details = `Manager: ${prevName} â†’ ${newName}`;
      logHistory({
        module: "employee",
        actor,
        target: name,
        action: "Manager reassigned",
        details,
      });
      void sb.sbAddHistory({
        module: "employee",
        actionEn: "Manager reassigned",
        actionAr: "ØªÙ…Øª Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ù…Ø¯ÙŠØ±",
        targetTable: "profiles",
        targetId: profileId,
        targetEn: name,
        targetAr: name,
        detailsEn: details,
        detailsAr: `Ø§Ù„Ù…Ø¯ÙŠØ±: ${prevName} â† ${newName}`,
      });
    }
    logHistory({ module: "settings", actor, target: name, action: "User updated" });
  },
  removeUser(userId: string, actor?: string) {
    const name = state.users.find((u) => u.id === userId)?.name ?? userId;
    set((s) => ({ ...s, users: s.users.filter((u) => u.id !== userId) }));
    logHistory({ module: "settings", actor, target: name, action: "User deleted" });
  },
  setRolePermission(role: UserRoleKey, page: AppPage, ops: CrudOp[]) {
    set((s) => {
      const perm = s.settings.permissions[role];
      const hasPage = ops.length > 0;
      const pages = hasPage
        ? Array.from(new Set([...perm.pages, page]))
        : perm.pages.filter((p) => p !== page);
      return {
        ...s,
        settings: {
          ...s.settings,
          permissions: {
            ...s.settings.permissions,
            [role]: { pages, crud: { ...perm.crud, [page]: ops } },
          },
        },
      };
    });
    logHistory({
      module: "settings",
      actor: "System",
      target: role,
      action: "Updated permissions",
      details: `${page}: ${ops.join(",") || "none"}`,
    });
    void sb.sbSaveRolePermission(role, page, ops);
  },
  // ---- Quotations ----
  updateQuotation(qId: string, patch: Partial<Quotation>, actor?: string) {
    let prev: Quotation | undefined;
    let next: Quotation | undefined;
    set((s) => ({
      ...s,
      quotations: s.quotations.map((q) => {
        if (q.id === qId) {
          prev = q;
          next = {
            ...q,
            ...patch,
            revisions:
              patch.value !== undefined && patch.value !== q.value ? q.revisions + 1 : q.revisions,
          };
          return next;
        }
        return q;
      }),
    }));
    if (!prev || !next) return;
    const details: string[] = [];
    if (patch.value !== undefined && patch.value !== prev.value)
      details.push(`Value ${prev.value} â†’ ${patch.value}`);
    if (patch.status && patch.status !== prev.status)
      details.push(`Status ${prev.status} â†’ ${patch.status}`);
    logHistory({
      module: "pipeline",
      actor,
      target: `${next.id} Â· ${next.client}`,
      action: "Quotation updated",
      details: details.join(" Â· "),
    });
    sb.sbUpdateQuotation(qId, patch);
    pushNotificationInternal({
      type: "quotation",
      titleEn: patch.status === "accepted" ? "Quotation approved" : "Quotation updated",
      titleAr: patch.status === "accepted" ? "ØªÙ…Øª Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø¹Ø±Ø¶" : "ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø¹Ø±Ø¶",
      bodyEn: `${next.id} Â· ${next.client} â€” ${details.join(" Â· ") || "updated"}`,
      bodyAr: `${next.id} Â· ${next.client} â€” ${details.join(" Â· ") || "ØªØ­Ø¯ÙŠØ«"}`,
      href: `/admin/offers/${next.id}`,
      audience: prev.owner !== actor ? [prev.owner] : undefined,
    });
  },
  approveQuotation(qId: string, actor?: string) {
    (actions as any).updateQuotation(qId, { status: "accepted" as const }, actor);
  },
  // ---- Bulk hydrate from Supabase (replaces selected slices) ----
  hydrateFromSupabase(slices: Partial<State> & { settings?: any }) {
    set((s) => {
      const nextSettings: any = { ...s.settings, ...(slices.settings ?? {}) };
      const rows = nextSettings.rolePermsRows as Array<any> | undefined;
      if (rows && rows.length) {
        const perms = { ...nextSettings.permissions };
        for (const r of rows) {
          if (!perms[r.role]) continue;
          const ops: CrudOp[] = [];
          if (r.can_create) ops.push('create');
          if (r.can_read) ops.push('read');
          if (r.can_update) ops.push('update');
          if (r.can_delete) ops.push('delete');
          const cur = perms[r.role as UserRoleKey];
          const pages = ops.length
            ? Array.from(new Set([...cur.pages, r.page]))
            : cur.pages.filter((p: AppPage) => p !== r.page);
          perms[r.role as UserRoleKey] = { pages, crud: { ...cur.crud, [r.page]: ops } };
        }
        nextSettings.permissions = perms;
        delete nextSettings.rolePermsRows;
      }
      return { ...s, ...slices, settings: nextSettings };
    });
  },
  // ---- Real-time presence ----
  setOnlineUsers(userIds: string[]) {
    set((s) => ({ ...s, onlineUserIds: userIds }));
  },
  // ---- Admin Tasks ----
  addAdminTask(task: Omit<AdminTask, "id" | "status">) {
    const newTask: AdminTask = { ...task, id: id("T"), status: "new" };
    set((s) => ({ ...s, adminTasks: [newTask, ...s.adminTasks] }));
    const actor: string = state.profile?.name ?? "System";
    logHistory({
      module: "settings", // using settings module for admin stuff
      actor,
      target: newTask.title,
      action: "Created To-Do Task",
    });
    void sb.sbAddAdminTask(newTask);
  },
  updateAdminTaskStatus(taskId: string, status: AdminTaskStatus) {
    let taskTitle = "";
    set((s) => ({
      ...s,
      adminTasks: s.adminTasks.map((t) => {
        if (t.id === taskId) {
          taskTitle = t.title;
          return { ...t, status };
        }
        return t;
      }),
    }));
    const actor: string = state.profile?.name ?? "System";
    logHistory({
      module: "settings",
      actor,
      target: taskTitle || taskId,
      action: `Updated To-Do Task status to ${status}`,
    });
    void sb.sbUpdateAdminTaskStatus(taskId, status);
  },
  addAdminTaskActivity(taskId: string, details: string) {
    const actor: string = state.profile?.name ?? "System";
    const act: AdminTaskActivity = { id: id("TA"), taskId, ts: now(), actor, details };
    set((s) => ({ ...s, adminTaskActivities: [act, ...s.adminTaskActivities] }));
    void sb.sbAddAdminTaskActivity(act);
  },
};

export type { Lead, LeadStatus };
