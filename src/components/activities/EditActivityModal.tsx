import { useState, useMemo } from "react";
import {
  X,
  Pencil,
  Calendar,
  Clock,
  Timer,
  Building2,
  Briefcase,
  User,
  FileText,
  Phone,
  Mail,
  Users2,
  MapPin,
  RefreshCw,
  ClipboardCheck,
  Circle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { actions, useStoreState, type Activity, type ActivityType, type ActivityStatus } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/role";
import { useAuth } from "@/lib/auth";
import { shortId } from "@/lib/utils";

const TYPE_ICONS: Record<string, any> = {
  Call: Phone,
  Email: Mail,
  Meeting: Users2,
  "Site Visit": MapPin,
  "Follow-up": RefreshCw,
  Inspection: ClipboardCheck,
};

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

interface Props {
  activity: Activity;
  onClose: () => void;
  onSaved?: (updated: Activity) => void;
}

export function EditActivityModal({ activity, onClose, onSaved }: Props) {
  const { t, lang, dir } = useI18n();
  const isAr = lang === "ar" || dir === "rtl";
  const { settings, leads, projects, employees } = useStoreState();
  const { isAdmin, isManager } = useRole();
  const { profile, user: authUser } = useAuth();

  const currentUserName =
    profile?.full_name_en || profile?.full_name_ar || authUser?.email || "User";

  const [title, setTitle] = useState(activity.title || "");
  const [type, setType] = useState<ActivityType>(activity.type);
  const [status, setStatus] = useState<ActivityStatus>(activity.status || "pending");
  const [dueDate, setDueDate] = useState(activity.dueDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(activity.time || "10:00");
  const [estMinutes, setEstMinutes] = useState<number>(activity.estMinutes ?? 30);
  const [projectId, setProjectId] = useState<string>(activity.projectId || "");
  const [leadId, setLeadId] = useState<string>(activity.leadId || "");
  const [owner, setOwner] = useState<string>(activity.owner || "");
  const [notes, setNotes] = useState<string>(activity.notes || "");
  const [isGeneral, setIsGeneral] = useState<boolean>(() =>
    Boolean(activity.isGeneral || (!activity.leadId && activity.notes?.includes("General"))),
  );
  const [saving, setSaving] = useState(false);

  // Available leads (prioritizing the currently selected or active leads)
  const availableLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.id === activity.leadId) return true;
      if (projectId && (l.projectId === projectId || (l as any).project_id === projectId)) return true;
      return true;
    });
  }, [leads, activity.leadId, projectId]);

  // Unique owners from employees
  const employeeOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e: any) => {
      if (e?.name) set.add(e.name);
    });
    if (activity.owner) set.add(activity.owner);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [employees, activity.owner]);

  const Icon = TYPE_ICONS[type] ?? Circle;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(isAr ? "يرجى كتابة عنوان النشاط" : "Please enter activity title");
      return;
    }
    if (!dueDate) {
      toast.error(isAr ? "يرجى تحديد تاريخ النشاط" : "Please specify due date");
      return;
    }

    setSaving(true);
    try {
      const patch: Partial<Activity> = {
        title: title.trim(),
        type,
        status,
        dueDate,
        time: time || "—",
        estMinutes: Number(estMinutes) || 0,
        projectId: projectId || undefined,
        leadId: !isGeneral && leadId ? leadId : undefined,
        isGeneral: isGeneral || !leadId,
        owner: (isAdmin || isManager) && owner ? owner : activity.owner,
        notes: notes.trim(),
      };

      actions.updateActivity(activity.id, patch, currentUserName);

      toast.success(isAr ? "تم تحديث النشاط بنجاح" : "Activity updated successfully");

      if (onSaved) {
        onSaved({ ...activity, ...patch });
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "حدث خطأ أثناء التحديث" : "Failed to update activity"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">
                  {isAr ? "تعديل النشاط" : "Edit Activity"}
                </h3>
                <span className="font-mono text-xs text-muted-foreground">
                  ({shortId(activity.id)})
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "تحديث بيانات النشاط، التوقيت، الحساب والملاحظات"
                  : "Update activity details, schedule, account and notes"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            title={isAr ? "إغلاق" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              {isAr ? "عنوان النشاط" : "Activity Title"} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isAr ? "مثال: اجتماع مراجعة العرض المالي" : "e.g., Financial Proposal Review Meeting"}
              className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Type & Status Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                {isAr ? "نوع النشاط" : "Activity Type"}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {settings.activityTypes.map((tItem) => (
                  <option key={tItem} value={tItem}>
                    {tItem}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                {isAr ? "حالة النشاط" : "Activity Status"}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ActivityStatus)}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="pending">{isAr ? "مؤجل (Postponed / Pending)" : "Postponed / Pending"}</option>
                <option value="in_progress">{isAr ? "قيد التنفيذ (In Progress)" : "In Progress"}</option>
                <option value="done">{isAr ? "تم الحضور / منجز (Done / Attended)" : "Done / Attended"}</option>
                <option value="cancelled">{isAr ? "غير منجز / ملغي (Not Done / Cancelled)" : "Not Done / Cancelled"}</option>
                <option value="delayed">{isAr ? "متأخر (Delayed)" : "Delayed"}</option>
              </select>
            </div>
          </div>

          {/* Schedule: Date, Time & Duration */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {isAr ? "التاريخ" : "Date"}
                </span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {isAr ? "الوقت" : "Time"}
                </span>
              </label>
              <input
                type="time"
                value={time === "—" ? "" : time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                <span className="inline-flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                  {isAr ? "المدة (دقائق)" : "Duration (mins)"}
                </span>
              </label>
              <input
                type="number"
                min={0}
                step={5}
                value={estMinutes}
                onChange={(e) => setEstMinutes(Number(e.target.value))}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Quick Duration Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {isAr ? "فترات سريعة:" : "Presets:"}
            </span>
            {DURATION_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setEstMinutes(m)}
                className={`rounded-lg px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  estMinutes === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>

          {/* Account / Project & Lead */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  {isAr ? "الحساب / المشروع" : "Account / Project"}
                </span>
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectId(val);
                }}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{isAr ? "— بدون حساب محدد —" : "— None / Not tied to account —"}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.client ? `(${p.client})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {isAr ? "الصفقة / العميل" : "Lead / Client"}
                </span>
              </label>
              <select
                disabled={isGeneral}
                value={leadId}
                onChange={(e) => {
                  const val = e.target.value;
                  setLeadId(val);
                  if (val) setIsGeneral(false);
                }}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
              >
                <option value="">{isAr ? "— بدون صفقة محددة —" : "— No specific lead —"}</option>
                {availableLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {[l.code, l.company, l.contact].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* General Activity Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3.5 py-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isGeneral}
                onChange={(e) => {
                  setIsGeneral(e.target.checked);
                  if (e.target.checked) setLeadId("");
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-xs font-semibold text-foreground">
                {isAr ? "نشاط عام (غير مرتبط بصفقة محددة)" : "General activity (not tied to a specific lead)"}
              </span>
            </label>
            {isGeneral && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                General ✓
              </span>
            )}
          </div>

          {/* Owner / Assignee (if admin or manager) */}
          {(isAdmin || isManager) && (
            <div>
              <label className="mb-1 block text-xs font-bold text-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {isAr ? "المسؤول / الموظف" : "Assigned Owner"}
                </span>
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {employeeOptions.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                {isAr ? "الملاحظات وتفاصيل النشاط" : "Notes & Details"}
              </span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAr ? "أضف أية تفاصيل أو نتائج أو مخرجات لهذا النشاط..." : "Add details, outcomes, or notes for this activity..."}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition resize-y"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent transition"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{isAr ? "جاري الحفظ..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{isAr ? "حفظ التعديلات" : "Save Changes"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
