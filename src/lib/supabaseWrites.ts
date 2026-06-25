// Fire-and-forget Supabase write helpers that mirror local store mutations.
// All helpers are best-effort: failures are logged but never throw to callers,
// so the optimistic UI never blocks on the network.
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Lead, Quotation } from "./mock-data";
import type { Activity, AttendanceRecord, Profile, Project } from "./store";

// Profile map (name → id) populated by useSupabaseSync.
let profileByName = new Map<string, string>();
let currentProfileId: string | null = null;
let currentUserId: string | null = null;

export function setProfileMap(map: Map<string, string>, profileId: string | null, userId: string | null) {
  profileByName = map;
  currentProfileId = profileId;
  currentUserId = userId;
}

const ownerId = (name?: string) => (name ? profileByName.get(name) ?? null : null);
const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function warn(label: string, error: unknown) {
  console.warn(`[supabase] ${label} failed`, error);
  const msg = (error as any)?.message ?? String(error);
  toast.error(`${label}: ${msg}`);
}

// ---------------- Leads ----------------
export async function sbAddLead(id: string, l: Omit<Lead, "id" | "updatedAt">) {
  if (!currentUserId) return;
  const { error } = await supabase.from("leads").insert({
    id,
    company_en: l.company,
    contact_name_en: l.contact,
    email: l.email ?? null,
    source_en: l.source,
    industry_en: l.industry,
    status: l.status as any,
    value: l.value,
    owner_id: ownerId(l.owner),
    city_en: l.city || null,
    country: l.country || 'Egypt',
    street_en: l.street ?? null,
    lat: l.lat ?? null,
    lng: l.lng ?? null,
    probability: l.probability ?? 0,
    expected_close_date: l.expectedCloseDate ?? null,
    project_id: (l as any).projectId ?? null,
    created_by: currentUserId,
  });
  if (error) warn("Save lead", error);
}

export async function sbUpdateLead(id: string, patch: Partial<Lead>) {
  if (!isUuid(id)) return;
  const row: Record<string, any> = {};
  if (patch.company !== undefined) row.company_en = patch.company;
  if (patch.contact !== undefined) row.contact_name_en = patch.contact;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.source !== undefined) row.source_en = patch.source;
  if (patch.industry !== undefined) row.industry_en = patch.industry;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.value !== undefined) row.value = patch.value;
  if (patch.owner !== undefined) row.owner_id = ownerId(patch.owner);
  if (patch.city !== undefined) row.city_en = patch.city;
  if ((patch as any).country !== undefined) row.country = (patch as any).country;
  if (patch.street !== undefined) row.street_en = patch.street;
  if (patch.lat !== undefined) row.lat = patch.lat;
  if (patch.lng !== undefined) row.lng = patch.lng;
  if (patch.probability !== undefined) row.probability = patch.probability;
  if (patch.expectedCloseDate !== undefined) row.expected_close_date = patch.expectedCloseDate;
  if (patch.projectId !== undefined) row.project_id = patch.projectId ?? null;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("leads").update(row as any).eq("id", id);
  if (error) warn("Update lead", error);
}

export async function sbDeleteLead(id: string) {
  if (!isUuid(id)) return;
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) warn("Delete lead", error);
}

export async function sbSetLeadDistrict(id: string, district: string) {
  if (!isUuid(id)) return;
  const { error } = await supabase.from("leads").update({ district_en: district }).eq("id", id);
  if (error) warn("Update lead district", error);
}

// ---------------- Activities ----------------
export async function sbAddActivity(id: string, a: Activity) {
  if (!currentUserId) return;
  const { error } = await supabase.from("activities").insert({
    id,
    type: a.type as any,
    title_en: a.title,
    lead_id: a.leadId && isUuid(a.leadId) ? a.leadId : null,
    project_id: a.projectId && isUuid(a.projectId) ? a.projectId : null,
    due_date: a.dueDate,
    time: a.time && a.time !== "—" ? a.time : null,
    owner_id: ownerId(a.owner) ?? currentProfileId,
    status: a.status as any,
    notes_en: a.notes ?? null,
    est_minutes: a.estMinutes ?? 60,
    presales_team: (a.presalesTeam ?? []).map((n) => ownerId(n)).filter(Boolean) as string[],
    created_by: currentUserId,
    approval_status: a.approvalStatus ?? "approved",
  });
  if (error) warn("Save activity", error);
}

export async function sbUpdateActivity(id: string, patch: Partial<Activity>) {
  if (!isUuid(id)) return;
  const row: Record<string, any> = {};
  if (patch.type !== undefined) row.type = patch.type;
  if (patch.title !== undefined) row.title_en = patch.title;
  if (patch.leadId !== undefined) row.lead_id = patch.leadId && isUuid(patch.leadId) ? patch.leadId : null;
  if (patch.projectId !== undefined) row.project_id = patch.projectId && isUuid(patch.projectId) ? patch.projectId : null;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.time !== undefined) row.time = patch.time && patch.time !== "—" ? patch.time : null;
  if (patch.owner !== undefined) row.owner_id = ownerId(patch.owner);
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.notes !== undefined) row.notes_en = patch.notes;
  if (patch.estMinutes !== undefined) row.est_minutes = patch.estMinutes;
  if (patch.presalesTeam !== undefined) row.presales_team = patch.presalesTeam.map((n) => ownerId(n)).filter(Boolean);
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("activities").update(row as any).eq("id", id);
  if (error) warn("Update activity", error);
}

export async function sbDeleteActivity(id: string) {
  if (!isUuid(id)) return;
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) warn("Delete activity", error);
}

export async function sbApproveActivity(id: string, reviewNote?: string) {
  if (!isUuid(id) || !currentUserId) return;
  const patch: Record<string, any> = {
    approval_status: "approved",
    approved_by: currentUserId,
    approved_at: new Date().toISOString(),
    rejection_reason: null,
  };
  if (reviewNote !== undefined) patch.review_note = reviewNote || null;
  const { error } = await supabase.from("activities").update(patch as any).eq("id", id);
  if (error) warn("Approve activity", error);
}

export async function sbRejectActivity(id: string, reason: string) {
  if (!isUuid(id) || !currentUserId) return;
  const { error } = await supabase
    .from("activities")
    .update({ approval_status: "rejected", approved_by: currentUserId, approved_at: new Date().toISOString(), rejection_reason: reason } as any)
    .eq("id", id);
  if (error) warn("Reject activity", error);
}

export async function sbSetActivityReviewNote(id: string, note: string) {
  if (!isUuid(id)) return;
  const { error } = await supabase.from("activities").update({ review_note: note || null } as any).eq("id", id);
  if (error) warn("Save review note", error);
}

// ---------------- Projects ----------------
export async function sbAddProject(id: string, p: Project) {
  const { error } = await supabase.from("projects").insert({
    id,
    name_en: p.name,
    progress: p.progress,
    budget: p.budget,
    offered_value: p.offeredValue,
    status: p.status as any,
    category_en: p.category ?? null,
    competitors: p.competitors ?? [],
    project_type_en: (p as any).projectType ?? null,
    city_en: (p as any).city ?? null,
    district_en: (p as any).district ?? null,
    street_en: (p as any).street ?? null,
    start_date: (p as any).startDate || null,
    end_date: (p as any).endDate || null,
    account_type: (p as any).accountType || null,
    other_account_type: (p as any).otherAccountType || null,
    extra_contacts: (p as any).extraContacts?.length ? (p as any).extraContacts : null,
    client_name: p.client || null,
    client_email: p.clientEmail || null,
    client_phone: p.clientPhone || null,
  } as any);
  if (error) warn("Save project", error);
  else if (p.teamMembers && p.teamMembers.length > 0) {
    const inserts = p.teamMembers
      .map(name => profileByName.get(name))
      .filter(Boolean)
      .map(pid => ({ project_id: id, profile_id: pid as string }));
    if (inserts.length > 0) {
      await supabase.from("project_members").insert(inserts);
    }
  }
}

export async function sbUpdateProject(id: string, patch: Partial<Project>) {
  if (!isUuid(id)) return;
  const row: Record<string, any> = {};
  if (patch.name !== undefined) row.name_en = patch.name;
  if (patch.progress !== undefined) row.progress = patch.progress;
  if (patch.budget !== undefined) row.budget = patch.budget;
  if (patch.offeredValue !== undefined) row.offered_value = patch.offeredValue;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.category !== undefined) row.category_en = patch.category;
  if (patch.competitors !== undefined) row.competitors = patch.competitors;
  if ((patch as any).startDate !== undefined) row.start_date = (patch as any).startDate || null;
  if ((patch as any).endDate !== undefined) row.end_date = (patch as any).endDate || null;
  if (patch.accountType !== undefined) row.account_type = patch.accountType;
  if (patch.otherAccountType !== undefined) row.other_account_type = patch.otherAccountType;
  if (patch.extraContacts !== undefined) row.extra_contacts = patch.extraContacts?.length ? patch.extraContacts : null;
  if (patch.client !== undefined) row.client_name = patch.client;
  if (patch.clientEmail !== undefined) row.client_email = patch.clientEmail;
  if (patch.clientPhone !== undefined) row.client_phone = patch.clientPhone;
  if (Object.keys(row).length > 0) {
    const { error } = await supabase.from("projects").update(row as any).eq("id", id);
    if (error) warn("Update project", error);
  }
  if (patch.teamMembers !== undefined) {
    await supabase.from("project_members").delete().eq("project_id", id);
    const inserts = patch.teamMembers
      .map(name => profileByName.get(name))
      .filter(Boolean)
      .map(pid => ({ project_id: id, profile_id: pid as string }));
    if (inserts.length > 0) {
      await supabase.from("project_members").insert(inserts);
    }
  }
}

export async function sbDeleteProject(id: string) {
  if (!isUuid(id)) return;
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) warn("Delete project", error);
}

// ---------------- Notes (lead_notes) ----------------
export function getCurrentProfileId() { return currentProfileId; }
export function getCurrentUserId() { return currentUserId; }

export async function sbAddNote(id: string, leadId: string, text: string) {
  if (!isUuid(leadId) || !currentProfileId) {
    const msg = "Sign in required to save notes";
    toast.error(msg); throw new Error(msg);
  }
  const { error } = await supabase.from("lead_notes").insert({
    id, lead_id: leadId, text_en: text, author_id: currentProfileId,
  });
  if (error) { warn("Save note", error); throw error; }
}

export async function sbDeleteNote(id: string) {
  if (!isUuid(id)) return;
  const { error } = await supabase.from("lead_notes").delete().eq("id", id);
  if (error) warn("Delete note", error);
}

export async function sbListLeadNotes(leadId: string) {
  if (!isUuid(leadId)) return [];
  const { data, error } = await supabase
    .from("lead_notes")
    .select("id, text_en, text_ar, author_id, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) { warn("Load notes", error); return []; }
  return data ?? [];
}

// ---------------- Lead attachments (storage + attachments table) ----------------
const LEAD_BUCKET = "lead-attachments";

export async function sbListLeadAttachments(leadId: string) {
  if (!isUuid(leadId)) return [];
  const { data, error } = await supabase
    .from("attachments")
    .select("id, name_en, storage_path, mime, size_bytes, uploaded_by, created_at")
    .eq("parent_table", "lead")
    .eq("parent_id", leadId)
    .order("created_at", { ascending: false });
  if (error) { warn("Load attachments", error); return []; }
  return data ?? [];
}

export const LEAD_ATTACHMENT_MAX_BYTES = 3 * 1024 * 1024; // 3 MB
export const LEAD_ATTACHMENT_ALLOWED_MIME = [
  "application/pdf", "image/png", "image/jpeg", "image/jpg",
] as const;
export const LEAD_ATTACHMENT_ALLOWED_EXT = ["pdf", "png", "jpg", "jpeg"] as const;

export function validateLeadAttachment(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeOk = (LEAD_ATTACHMENT_ALLOWED_MIME as readonly string[]).includes(file.type);
  const extOk = (LEAD_ATTACHMENT_ALLOWED_EXT as readonly string[]).includes(ext);
  if (!mimeOk && !extOk) return "Only PDF, PNG, JPG, or JPEG files are allowed";
  if (file.size > LEAD_ATTACHMENT_MAX_BYTES) return "File is larger than 3 MB";
  if (file.size === 0) return "File is empty";
  return null;
}

export async function sbUploadLeadAttachment(leadId: string, file: File) {
  if (!isUuid(leadId) || !currentUserId) {
    const msg = "Sign in required to upload attachments";
    toast.error(msg); throw new Error(msg);
  }
  const invalid = validateLeadAttachment(file);
  if (invalid) { toast.error(invalid); throw new Error(invalid); }
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${currentUserId}/${leadId}/${Date.now()}-${safeName}`;
  const up = await supabase.storage.from(LEAD_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (up.error) { warn("Upload file", up.error); throw up.error; }
  const { data, error } = await supabase.from("attachments").insert({
    parent_table: "lead",
    parent_id: leadId,
    name_en: file.name,
    storage_path: path,
    mime: file.type || null,
    size_bytes: file.size,
    uploaded_by: currentUserId,
  }).select("id, name_en, storage_path, mime, size_bytes, uploaded_by, created_at").single();
  if (error) {
    warn("Save attachment", error);
    await supabase.storage.from(LEAD_BUCKET).remove([path]);
    throw error;
  }
  return data;
}

export async function sbDeleteLeadAttachment(attId: string, storagePath: string) {
  const { error } = await supabase.from("attachments").delete().eq("id", attId);
  if (error) { warn("Delete attachment", error); return false; }
  await supabase.storage.from(LEAD_BUCKET).remove([storagePath]);
  return true;
}

export async function sbSignedAttachmentUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from(LEAD_BUCKET).createSignedUrl(storagePath, 60 * 10);
  if (error) { warn("Sign URL", error); return null; }
  return data.signedUrl;
}

// ---------------- Attendance ----------------
export async function sbAddAttendance(id: string, r: AttendanceRecord) {
  if (!currentProfileId) return;
  const { error } = await supabase.from("attendance").insert({
    id,
    profile_id: currentProfileId,
    date: r.date,
    check_in: r.checkIn || null,
    check_out: r.checkOut || null,
    location_en: r.location || null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
  });
  if (error) warn("Save attendance", error);
}

export async function sbUpdateAttendance(id: string, patch: Partial<AttendanceRecord>) {
  if (!isUuid(id)) return;
  const row: Record<string, any> = {};
  if (patch.date !== undefined) row.date = patch.date;
  if (patch.checkIn !== undefined) row.check_in = patch.checkIn || null;
  if (patch.checkOut !== undefined) row.check_out = patch.checkOut || null;
  if (patch.location !== undefined) row.location_en = patch.location;
  if (patch.lat !== undefined) row.lat = patch.lat;
  if (patch.lng !== undefined) row.lng = patch.lng;
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("attendance").update(row as any).eq("id", id);
  if (error) warn("Update attendance", error);
}


// ---------------- Quotations ----------------
export async function sbUpdateQuotation(id: string, patch: Partial<Quotation>) {
  // id from local store may be the `code` not the uuid; resolve via code first.
  const row: Record<string, any> = {};
  if (patch.value !== undefined) row.value = patch.value;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.feedback !== undefined) row.description_en = patch.feedback;
  if (Object.keys(row).length === 0) return;
  const column = isUuid(id) ? "id" : "code";
  const { error } = await supabase.from("quotations").update(row as any).eq(column, id);
  if (error) warn("Update quotation", error);
}

export function newUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ---------------- Profiles / Users ----------------
import type { AppUser, UserRoleKey } from "./store";

// ---------------- History (audit log) ----------------
export type HistoryModuleDb = "lead" | "pipeline" | "project" | "employee" | "activity" | "settings" | "user";
export async function sbAddHistory(entry: {
  module: HistoryModuleDb;
  actionEn: string;
  actionAr?: string;
  targetTable?: string;
  targetId?: string;
  targetEn?: string;
  targetAr?: string;
  detailsEn?: string;
  detailsAr?: string;
}) {
  if (!currentProfileId) return;
  const { error } = await supabase.from("history").insert({
    module: entry.module as any,
    action_en: entry.actionEn,
    action_ar: entry.actionAr ?? entry.actionEn,
    actor_id: currentProfileId,
    target_table: entry.targetTable ?? null,
    target_id: entry.targetId ?? null,
    target_en: entry.targetEn ?? null,
    target_ar: entry.targetAr ?? null,
    details_en: entry.detailsEn ?? null,
    details_ar: entry.detailsAr ?? null,
  });
  if (error) console.warn("[supabase] sbAddHistory failed", error);
}

// Client-side validation mirroring the DB validate_profile_fields() trigger.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE_RE = /^[0-9 +()\-]{6,25}$/;

export function validateProfilePatch(patch: Partial<AppUser>, opts?: { selfProfileId?: string }): string | null {
  if (patch.email !== undefined) {
    const v = (patch.email ?? "").trim();
    if (!v) return "Email is required";
    if (!EMAIL_RE.test(v)) return "Email is not a valid address";
  }
  if (patch.phone !== undefined && patch.phone && !PHONE_RE.test(patch.phone)) {
    return "Phone must be 6-25 chars (digits, spaces, + - ( ))";
  }
  if (patch.locationEn !== undefined && patch.locationEn && patch.locationEn.length > 120) {
    return "Location (EN) must be 120 characters or less";
  }
  if (patch.locationAr !== undefined && patch.locationAr && patch.locationAr.length > 120) {
    return "Location (AR) must be 120 characters or less";
  }
  if (patch.managerId !== undefined && patch.managerId) {
    if (!isUuid(patch.managerId)) return "Manager reference is invalid";
    if (opts?.selfProfileId && patch.managerId === opts.selfProfileId) return "A user cannot be their own manager";
  }
  return null;
}

export async function sbUpdateProfile(profileId: string | undefined, patch: Partial<AppUser>) {
  if (!profileId || !isUuid(profileId)) return;
  const err = validateProfilePatch(patch, { selfProfileId: profileId });
  if (err) { toast.error(err); throw new Error(err); }
  const row: Record<string, any> = {};
  if (patch.name !== undefined) row.full_name_en = patch.name;
  if (patch.nameAr !== undefined) row.full_name_ar = patch.nameAr || null;
  if (patch.email !== undefined) row.email = patch.email.trim();
  if (patch.phone !== undefined) row.phone = patch.phone || null;
  if (patch.titleEn !== undefined) row.title_en = patch.titleEn || null;
  if (patch.titleAr !== undefined) row.title_ar = patch.titleAr || null;
  if (patch.departmentEn !== undefined) row.department_en = patch.departmentEn || null;
  if (patch.departmentAr !== undefined) row.department_ar = patch.departmentAr || null;
  if (patch.locationEn !== undefined) row.location_en = patch.locationEn || null;
  if (patch.locationAr !== undefined) row.location_ar = patch.locationAr || null;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl || null;
  if (patch.targetType !== undefined) row.target_type = patch.targetType;
  if (patch.targetValue !== undefined) row.target_value = patch.targetValue;
  if ((patch as any).annualTarget !== undefined) { row.target_value = Number((patch as any).annualTarget); row.annual_target = Number((patch as any).annualTarget); }
  if ((patch as any).q1Target !== undefined) row.q1_target = Number((patch as any).q1Target);
  if ((patch as any).q2Target !== undefined) row.q2_target = Number((patch as any).q2Target);
  if ((patch as any).q3Target !== undefined) row.q3_target = Number((patch as any).q3Target);
  if ((patch as any).q4Target !== undefined) row.q4_target = Number((patch as any).q4Target);
  if ((patch as any).weeklyMeetingsTarget !== undefined) row.weekly_meetings_target = Number((patch as any).weeklyMeetingsTarget);
  if ((patch as any).startDate !== undefined) row.start_date = (patch as any).startDate || null;
  if (patch.skills !== undefined) row.skills = patch.skills;
  if (patch.active !== undefined) row.active = patch.active;
  if (patch.managerId !== undefined) row.manager_id = patch.managerId || null;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("profiles").update(row as any).eq("id", profileId);
  if (error) { warn("Update profile", error); throw error; }
}

// ---------------- Role permissions ----------------
export async function sbSaveRolePermission(role: string, page: string, ops: string[]) {
  const row = {
    role: role as any,
    page,
    can_create: ops.includes("create"),
    can_read: ops.includes("read"),
    can_update: ops.includes("update"),
    can_delete: ops.includes("delete"),
  };
  const { error } = await supabase
    .from("role_permissions")
    .upsert(row as any, { onConflict: "role,page" });
  if (error) warn("Save role permission", error);
}

export async function sbUpdateOwnProfile(patch: Partial<Profile>) {
  if (!currentProfileId) return;
  const row: Record<string, any> = {};
  if (patch.name !== undefined) row.full_name_en = patch.name;
  if (patch.nameAr !== undefined) row.full_name_ar = patch.nameAr || null;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl || null;
  if (patch.skills !== undefined) row.skills = patch.skills;
  if (Object.keys(row).length === 0) return;
  const { error } = await supabase.from("profiles").update(row as any).eq("id", currentProfileId);
  if (error) warn("Update profile", error);
}

export async function sbAssignRole(userId: string, role: UserRoleKey, previousRole?: UserRoleKey) {
  if (!isUuid(userId)) return;
  if (previousRole && previousRole !== role) {
    const { error: rmErr } = await supabase.rpc("admin_remove_role", { _user_id: userId, _role: previousRole as any });
    if (rmErr) warn("Remove role", rmErr);
  }
  const { error } = await supabase.rpc("admin_assign_role", { _user_id: userId, _role: role as any });
  if (error) warn("Assign role", error);
}

// ---------------- Notifications ----------------
export async function sbMarkNotificationRead(notifId: string) {
  if (!currentProfileId || !isUuid(notifId)) return;
  const { data, error } = await supabase
    .from("notifications")
    .select("unread_by")
    .eq("id", notifId)
    .maybeSingle();
  if (error || !data) return;
  const next = (data.unread_by ?? []).filter((id: string) => id !== currentProfileId);
  const { error: upErr } = await supabase
    .from("notifications")
    .update({ unread_by: next })
    .eq("id", notifId);
  if (upErr) warn("Mark notification read", upErr);
}

export async function sbMarkAllNotificationsRead() {
  if (!currentProfileId) return;
  const { data, error } = await supabase
    .from("notifications")
    .select("id,unread_by")
    .contains("unread_by", [currentProfileId]);
  if (error || !data) return;
  await Promise.all(
    data.map((n: any) => {
      const next = (n.unread_by ?? []).filter((id: string) => id !== currentProfileId);
      return supabase.from("notifications").update({ unread_by: next }).eq("id", n.id);
    }),
  );
}

export async function sbDismissNotification(notifId: string) {
  // Soft dismiss = mark as read for current user (no delete RLS).
  await sbMarkNotificationRead(notifId);
}

export async function sbMarkNotificationUnread(notifId: string) {
  if (!currentProfileId || !isUuid(notifId)) return;
  const { data, error } = await supabase
    .from("notifications")
    .select("unread_by")
    .eq("id", notifId)
    .maybeSingle();
  if (error || !data) return;
  const existing = (data.unread_by ?? []) as string[];
  if (existing.includes(currentProfileId)) return;
  const next = [...existing, currentProfileId];
  const { error: upErr } = await supabase
    .from("notifications")
    .update({ unread_by: next })
    .eq("id", notifId);
  if (upErr) warn("Mark notification unread", upErr);
}

export async function sbPushNotification(input: {
  type: "lead" | "chat" | "activity" | "attendance" | "quotation";
  titleEn: string;
  titleAr?: string;
  bodyEn?: string;
  bodyAr?: string;
  href?: string;
  audienceRoles?: ("admin" | "manager" | "finance" | "hr" | "employee")[];
  audience?: string[]; // profile ids
}) {
  const audience = input.audience ?? [];
  const { error } = await supabase.from("notifications").insert({
    type: input.type as any,
    title_en: input.titleEn,
    title_ar: input.titleAr ?? input.titleEn,
    body_en: input.bodyEn ?? "",
    body_ar: input.bodyAr ?? input.bodyEn ?? "",
    href: input.href ?? null,
    audience_roles: (input.audienceRoles ?? []) as any,
    audience,
    unread_by: audience,
    created_by: currentUserId,
  } as any);
  if (error) warn("Push notification", error);
}
