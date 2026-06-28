import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  Mail,
  Phone,
  Briefcase,
  Pencil,
  X,
  User,
  Building,
  Target,
  KeyRound,
  RefreshCw,
  Users,
  Trophy,
  Star,
  Calendar,
  Clock,
  Activity,
  CheckCircle,
} from "lucide-react";
import { fmtMoney } from "@/lib/mock-data";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";

export const Route = createFileRoute("/employee/profile")({
  component: ProfilePage,
});

type EditableProfile = {
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
};

function ProfilePage() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const { user, refresh: refreshAuth } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const liveQuery = useQuery({
    enabled: !!user,
    queryKey: ["employee-profile-live", user?.id, lang],
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!user) return null;
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profileRow) return null;

      const [
        { data: leadsData, error: leadsError },
        { data: activitiesData, error: activitiesError },
        { data: attendanceData, error: attendanceError },
        { data: profilesData, error: profilesError },
      ] = await Promise.all([
        supabase
          .from("leads")
          .select("id,status,value,owner_id,created_by")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("activities")
          .select("id,status,owner_id,presales_team,due_date,est_minutes")
          .order("due_date", { ascending: false })
          .limit(1000),
        supabase
          .from("attendance")
          .select("id,date,hours,profile_id")
          .eq("profile_id", profileRow.id)
          .order("date", { ascending: false })
          .limit(200),
        supabase
          .from("profiles_directory" as any)
          .select("id,full_name_en,full_name_ar")
          .eq("active", true),
      ]);
      if (leadsError) throw leadsError;
      if (activitiesError) throw activitiesError;
      if (attendanceError) throw attendanceError;
      if (profilesError) throw profilesError;

      return {
        profile: profileRow as any,
        leads: (leadsData ?? []) as any[],
        activities: (activitiesData ?? []) as any[],
        attendance: (attendanceData ?? []) as any[],
        profiles: (profilesData ?? []) as any[],
      };
    },
  });

  const pick = (en: any, ar: any) => (lang === "ar" ? (ar ?? en) : (en ?? ar)) ?? "";
  const liveProfileRow = liveQuery.data?.profile;
  const profile: EditableProfile = liveProfileRow
    ? {
        name:
          liveProfileRow.full_name_en || liveProfileRow.full_name_ar || liveProfileRow.email || "—",
        nameAr: liveProfileRow.full_name_ar ?? "",
        title: pick(liveProfileRow.title_en, liveProfileRow.title_ar) || "—",
        department: pick(liveProfileRow.department_en, liveProfileRow.department_ar) || "—",
        email: liveProfileRow.email ?? "",
        phone: liveProfileRow.phone ?? "—",
        location: pick(liveProfileRow.location_en, liveProfileRow.location_ar) || "—",
        skills: (liveProfileRow.skills ?? []) as string[],
        manager: liveProfileRow.manager_id
          ? pick(
              liveQuery.data?.profiles.find((p: any) => p.id === liveProfileRow.manager_id)
                ?.full_name_en,
              liveQuery.data?.profiles.find((p: any) => p.id === liveProfileRow.manager_id)
                ?.full_name_ar,
            )
          : undefined,
        avatarUrl: liveProfileRow.avatar_url ?? undefined,
        targetValue: Number(liveProfileRow.annual_target ?? liveProfileRow.target_value ?? 0),
        targetType: (liveProfileRow.target_type ?? "yearly") as "yearly" | "quarterly" | "monthly",
      }
    : {
        name: "—",
        nameAr: "",
        title: "—",
        department: "—",
        email: "",
        phone: "—",
        location: "—",
        skills: [],
        avatarUrl: undefined,
        targetValue: 0,
        targetType: "yearly" as const,
      };
  const initials = profile.name
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2);

  const profileId = liveProfileRow?.id as string | undefined;
  const myLeads = (liveQuery.data?.leads ?? []).filter(
    (l: any) => l.owner_id === profileId || l.created_by === user?.id,
  );
  const wonLeads = myLeads.filter((l: any) => l.status === "won");
  const conversion = myLeads.length ? (wonLeads.length / myLeads.length) * 100 : 0;
  const achieved = wonLeads.reduce((s: number, l: any) => s + Number(l.value ?? 0), 0);
  const target = Number(profile.targetValue ?? 0);
  const score =
    target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : Math.round(conversion);
  const myActivities = (liveQuery.data?.activities ?? []).filter(
    (a: any) => a.owner_id === profileId || (a.presales_team ?? []).includes(profileId),
  );
  const doneActivities = myActivities.filter((a: any) => a.status === "done");
  const attendanceRecords = liveQuery.data?.attendance ?? [];
  const attendanceHours = attendanceRecords.reduce(
    (sum: number, row: any) => sum + Number(row.hours ?? 0),
    0,
  );
  const kpis = [
    {
      l: "Leads",
      v: String(myLeads.length),
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-600/10 dark:bg-blue-400/10",
    },
    {
      l: "Won",
      v: String(wonLeads.length),
      icon: Trophy,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-600/10 dark:bg-emerald-400/10",
    },
    {
      l: "Conversion",
      v: `${conversion.toFixed(1)}%`,
      icon: Target,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-600/10 dark:bg-purple-400/10",
    },
    {
      l: "Score",
      v: String(score),
      icon: Star,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-600/10 dark:bg-amber-400/10",
    },
    {
      l: "Attendance",
      v: String(attendanceRecords.length),
      icon: Calendar,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-600/10 dark:bg-indigo-400/10",
    },
    {
      l: "Hours",
      v: `${attendanceHours.toFixed(1)}h`,
      icon: Clock,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-600/10 dark:bg-rose-400/10",
    },
    {
      l: "Activities",
      v: String(myActivities.length),
      icon: Activity,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-600/10 dark:bg-sky-400/10",
    },
    {
      l: "Done",
      v: String(doneActivities.length),
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-600/10 dark:bg-emerald-400/10",
    },
  ];

  const refreshLiveData = async () => {
    await Promise.all([
      liveQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["supabase-sync"] }),
      refreshAuth(),
    ]);
  };

  return (
    <AppShell
      panel="employee"
      user={{ name: profile.name, role: t("employee"), initials }}
      pageTitle={t("profile")}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Card (Left) */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card text-center shadow-[var(--shadow-soft)]">
          {/* Cover Banner */}
          <div className="h-24 w-full bg-gradient-to-r from-primary/80 to-primary/40" />

          {/* Avatar (Floating) */}
          <div
            className="relative mx-auto -mt-12 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-card text-2xl font-bold text-primary-foreground shadow-sm"
            style={{ background: "var(--gradient-brand)" }}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="p-6 pt-4">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              {profile.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {profile.title} · {profile.department}
            </p>

            {/* Details List */}
            <div className="mt-6 flex flex-col gap-3 text-start text-sm">
              <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2.5 transition hover:bg-secondary/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email
                  </div>
                  <div className="truncate font-medium text-foreground">{profile.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2.5 transition hover:bg-secondary/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Phone
                  </div>
                  <div className="font-medium text-foreground">{profile.phone}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2.5 transition hover:bg-secondary/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Location
                  </div>
                  <div className="font-medium text-foreground">{profile.location}</div>
                </div>
              </div>

              {profile.manager && (
                <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2.5 transition hover:bg-secondary/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t("manager")}
                    </div>
                    <div className="font-medium text-foreground">{profile.manager}</div>
                  </div>
                </div>
              )}

              {profile.targetValue !== undefined && (
                <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2.5 transition hover:bg-secondary/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                    <Target className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Annual Target
                    </div>
                    <div className="font-mono font-bold text-amber-600">
                      {fmtMoney(profile.targetValue)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
              >
                <Pencil className="h-4 w-4" /> {t("editProfile")}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-[0.98]"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Password
                </button>
                <button
                  onClick={refreshLiveData}
                  disabled={liveQuery.isFetching}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-[0.98] disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${liveQuery.isFetching ? "animate-spin text-primary" : ""}`}
                  />{" "}
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs (Right) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold tracking-tight text-foreground">
              {t("kpis")}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div
                  key={k.l}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-brand)]"
                >
                  <div
                    className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${k.bg} ${k.color} transition-transform group-hover:scale-110 group-hover:rotate-3`}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-display text-2xl font-bold tracking-tight text-foreground">
                      {k.v}
                    </div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {k.l}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {editing && (
        <ProfileEditModal
          profile={profile}
          profileId={profileId}
          onSaved={refreshLiveData}
          onClose={() => setEditing(false)}
        />
      )}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </AppShell>
  );
}

function ProfileEditModal({
  profile,
  profileId,
  onSaved,
  onClose,
}: {
  profile: EditableProfile;
  profileId?: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(profile);
  const submit = async () => {
    if (profileId) {
      await supabase
        .from("profiles")
        .update({
          full_name_en: form.name,
          full_name_ar: form.nameAr || null,
          avatar_url: form.avatarUrl || null,
        })
        .eq("id", profileId);
      await onSaved();
    }
    onClose();
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{t("editProfile")}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("fullName")} (EN)
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("fullName")} (AR)
            </span>
            <input
              value={form.nameAr || ""}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              dir="rtl"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("title")}
            </span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">
              {form.title}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("department")}
            </span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">
              {form.department || "—"}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("manager")}
            </span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">
              {form.manager || "—"}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("email")}
            </span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">
              {form.email}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("phone")}
            </span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">
              {form.phone}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("location")}
            </span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">
              {form.location}
            </div>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Employee Image URL
            </span>
            <input
              value={form.avatarUrl || ""}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
              placeholder="https://images.unsplash.com/..."
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Annual Target
            </span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">
              {fmtMoney(form.targetValue ?? 0)}
            </div>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
          >
            {t("cancel")}
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
