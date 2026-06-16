import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Mail, Phone, Briefcase, Pencil, X, User, Building, Target, KeyRound, RefreshCw } from "lucide-react";
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

      const [{ data: leadsData, error: leadsError }, { data: activitiesData, error: activitiesError }, { data: attendanceData, error: attendanceError }, { data: profilesData, error: profilesError }] = await Promise.all([
        supabase.from("leads").select("id,status,value,owner_id,created_by").order("created_at", { ascending: false }).limit(1000),
        supabase.from("activities").select("id,status,owner_id,presales_team,due_date,est_minutes").order("due_date", { ascending: false }).limit(1000),
        supabase.from("attendance").select("id,date,hours,profile_id").eq("profile_id", profileRow.id).order("date", { ascending: false }).limit(200),
        supabase.from("profiles_directory" as any).select("id,full_name_en,full_name_ar").eq("active", true),
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
        name: liveProfileRow.full_name_en || liveProfileRow.full_name_ar || liveProfileRow.email || "—",
        nameAr: liveProfileRow.full_name_ar ?? "",
        title: pick(liveProfileRow.title_en, liveProfileRow.title_ar) || "—",
        department: pick(liveProfileRow.department_en, liveProfileRow.department_ar) || "—",
        email: liveProfileRow.email ?? "",
        phone: liveProfileRow.phone ?? "—",
        location: pick(liveProfileRow.location_en, liveProfileRow.location_ar) || "—",
        skills: (liveProfileRow.skills ?? []) as string[],
        manager: liveProfileRow.manager_id
          ? pick(liveQuery.data?.profiles.find((p: any) => p.id === liveProfileRow.manager_id)?.full_name_en, liveQuery.data?.profiles.find((p: any) => p.id === liveProfileRow.manager_id)?.full_name_ar)
          : undefined,
        avatarUrl: liveProfileRow.avatar_url ?? undefined,
        targetValue: Number(liveProfileRow.annual_target ?? liveProfileRow.target_value ?? 0),
        targetType: (liveProfileRow.target_type ?? "yearly") as "yearly" | "quarterly" | "monthly",
      }
    : { name: "—", nameAr: "", title: "—", department: "—", email: "", phone: "—", location: "—", skills: [], avatarUrl: undefined, targetValue: 0, targetType: "yearly" as const };
  const initials = profile.name.split(" ").map((s: string) => s[0]).join("").slice(0, 2);

  const profileId = liveProfileRow?.id as string | undefined;
  const myLeads = (liveQuery.data?.leads ?? []).filter((l: any) => l.owner_id === profileId || l.created_by === user?.id);
  const wonLeads = myLeads.filter((l: any) => l.status === "won");
  const conversion = myLeads.length ? (wonLeads.length / myLeads.length) * 100 : 0;
  const achieved = wonLeads.reduce((s: number, l: any) => s + Number(l.value ?? 0), 0);
  const target = Number(profile.targetValue ?? 0);
  const score = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : Math.round(conversion);
  const myActivities = (liveQuery.data?.activities ?? []).filter((a: any) => a.owner_id === profileId || (a.presales_team ?? []).includes(profileId));
  const doneActivities = myActivities.filter((a: any) => a.status === "done");
  const attendanceRecords = liveQuery.data?.attendance ?? [];
  const attendanceHours = attendanceRecords.reduce((sum: number, row: any) => sum + Number(row.hours ?? 0), 0);
  const kpis = [
    { l: "Leads", v: String(myLeads.length) },
    { l: "Won", v: String(wonLeads.length) },
    { l: "Conversion", v: `${conversion.toFixed(1)}%` },
    { l: "Score", v: String(score) },
    { l: "Attendance", v: String(attendanceRecords.length) },
    { l: "Hours", v: `${attendanceHours.toFixed(1)}h` },
    { l: "Activities", v: String(myActivities.length) },
    { l: "Done", v: String(doneActivities.length) },
  ];

  const refreshLiveData = async () => {
    await Promise.all([
      liveQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["supabase-sync"] }),
      refreshAuth(),
    ]);
  };


  return (
    <AppShell panel="employee" user={{ name: profile.name, role: t("employee"), initials }} pageTitle={t("profile")}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-2xl font-bold text-primary-foreground shadow-[var(--shadow-brand)] relative overflow-hidden" style={{ background: "var(--gradient-brand)" }}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="h-full w-full object-cover" />
            ) : initials}
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-foreground">{profile.name}</h2>
          <p className="text-sm text-muted-foreground">{profile.title} · {profile.department}</p>
          <div className="mt-6 space-y-2.5 text-start text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground"><Mail className="h-4 w-4 shrink-0 text-primary/70" /> <span className="truncate">{profile.email}</span></div>
            <div className="flex items-center gap-2.5 text-muted-foreground"><Phone className="h-4 w-4 shrink-0 text-primary/70" /> {profile.phone}</div>
            <div className="flex items-center gap-2.5 text-muted-foreground"><Briefcase className="h-4 w-4 shrink-0 text-primary/70" /> {profile.location}</div>
            {profile.department && (
              <div className="flex items-center gap-2.5 text-muted-foreground"><Building className="h-4 w-4 shrink-0 text-primary/70" /> {profile.department}</div>
            )}
            {profile.manager && (
              <div className="flex items-center gap-2.5 text-muted-foreground"><User className="h-4 w-4 shrink-0 text-primary/70" /> <span>{t("manager")}: <span className="font-semibold text-foreground">{profile.manager}</span></span></div>
            )}
            {profile.targetValue !== undefined && (
              <div className="flex items-center gap-2.5 text-muted-foreground"><Target className="h-4 w-4 shrink-0 text-primary/70" /> <span>Annual Target: <span className="font-mono font-bold text-primary">{fmtMoney(profile.targetValue)}</span></span></div>
            )}
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent w-full justify-center">
              <Pencil className="h-3.5 w-3.5" /> {t("editProfile")}
            </button>
            <button onClick={() => setShowChangePassword(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent w-full justify-center">
              <KeyRound className="h-3.5 w-3.5" /> {t("changePassword")}
            </button>
            <button onClick={refreshLiveData} disabled={liveQuery.isFetching} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 w-full justify-center">
              <RefreshCw className={`h-3.5 w-3.5 ${liveQuery.isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-display text-base font-bold text-foreground">{t("kpis")}</h3>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.l} className="rounded-xl bg-secondary/50 p-4 text-center">
                  <div className="font-display text-2xl font-bold text-foreground">{k.v}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editing && <ProfileEditModal profile={profile} profileId={profileId} onSaved={refreshLiveData} onClose={() => setEditing(false)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </AppShell>
  );
}

function ProfileEditModal({ profile, profileId, onSaved, onClose }: { profile: EditableProfile; profileId?: string; onSaved: () => Promise<void>; onClose: () => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState(profile);
  const submit = async () => {
    if (profileId) {
      await supabase.from("profiles").update({ full_name_en: form.name, full_name_ar: form.nameAr || null, avatar_url: form.avatarUrl || null }).eq("id", profileId);
      await onSaved();
    }
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{t("editProfile")}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("fullName")} (EN)</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("fullName")} (AR)</span>
            <input value={form.nameAr || ""} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" dir="rtl" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("title")}</span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">{form.title}</div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("department")}</span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">{form.department || "—"}</div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("manager")}</span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">{form.manager || "—"}</div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("email")}</span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">{form.email}</div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("phone")}</span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">{form.phone}</div>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("location")}</span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">{form.location}</div>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Employee Image URL</span>
            <input value={form.avatarUrl || ""} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm" placeholder="https://images.unsplash.com/..." />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Annual Target</span>
            <div className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-sm leading-9 text-muted-foreground">{fmtMoney(form.targetValue ?? 0)}</div>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent">{t("cancel")}</button>
          <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("save")}</button>
        </div>
      </div>
    </div>
  );
}