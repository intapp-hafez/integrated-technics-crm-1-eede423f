import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { actions } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { setProfileMap } from "@/lib/supabaseWrites";

// Maps Supabase rows to the local store shape so existing pages render real data.
export function useSupabaseSync() {
  const { lang } = useI18n();
  const { user } = useAuth();

  const syncQuery = useQuery({
    enabled: !!user,
    queryKey: ["supabase-sync"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [
        leadsRes, projectsRes, quotationsRes, activitiesRes, profilesRes,
        attendanceRes, historyRes, notificationsRes, locationsRes, stagesRes,
        usersRes, departmentsRes, positionsRes, clientsRes, projectMembersRes,
        quotationItemsRes, rolePermsRes,
      ] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("quotations").select("*").order("created_at", { ascending: false }),
        supabase.from("activities").select("*").order("due_date", { ascending: false }),
        supabase.from("profiles").select("*").eq("active", true),
        supabase.from("attendance").select("*").order("date", { ascending: false }).limit(200),
        supabase.from("history").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("locations").select("*"),
        supabase.from("pipeline_stages").select("*").order("sort_order"),
        supabase.rpc("admin_users_list").then(async (res: any) => {
          if (res?.data && (res.data as any[]).length) return res;
          // Fallback for non-admin users: use chat_directory so every panel can see peers.
          const dir = await supabase.rpc("chat_directory" as any);
          if (!dir?.data) return res;
          return {
            ...dir,
            data: (dir.data as any[]).map((r) => ({
              user_id: r.user_id,
              profile_id: r.profile_id,
              email: r.email,
              full_name_en: r.full_name_en,
              full_name_ar: r.full_name_ar,
              avatar_url: r.avatar_url,
              active: r.active,
              roles: r.role ? [r.role] : [],
            })),
          };
        }),
        supabase.from("departments" as any).select("*").order("name_en"),
        supabase.from("positions" as any).select("*").order("name_en"),
        supabase.from("clients").select("*"),
        supabase.from("project_members").select("*"),
        supabase.from("quotation_items").select("*").order("sort_order"),
        supabase.from("role_permissions").select("*"),
      ]);
      return {
        leads: leadsRes.data ?? [],
        projects: projectsRes.data ?? [],
        quotations: quotationsRes.data ?? [],
        activities: activitiesRes.data ?? [],
        profiles: profilesRes.data ?? [],
        attendance: attendanceRes.data ?? [],
        history: historyRes.data ?? [],
        notifications: notificationsRes.data ?? [],
        locations: locationsRes.data ?? [],
        stages: stagesRes.data ?? [],
        users: (usersRes as any)?.data ?? [],
        departments: (departmentsRes as any)?.data ?? [],
        positions: (positionsRes as any)?.data ?? [],
        clients: clientsRes.data ?? [],
        projectMembers: projectMembersRes.data ?? [],
        quotationItems: quotationItemsRes.data ?? [],
        rolePerms: (rolePermsRes as any)?.data ?? [],
      };
    },
  });


  const { data, refetch } = syncQuery;

  // Realtime: invalidate the sync query when relevant tables change so
  // attendance check-in/out, manager assignments, leads, and activities
  // refresh instantly across panels without a manual reload.
  useEffect(() => {
    if (!user) return;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => { void refetch(); }, 250);
    };
    const tables = ["attendance", "profiles", "leads", "activities", "projects", "history", "notifications"];
    const channel = supabase.channel("app-sync");
    for (const table of tables) {
      channel.on("postgres_changes" as any, { event: "*", schema: "public", table }, trigger);
    }
    channel.subscribe();
    return () => {
      if (pending) clearTimeout(pending);
      void supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  useEffect(() => {
    if (!data) return;

    const ar = lang === "ar";
    const pick = (en: any, arVal: any) => (ar ? (arVal ?? en) : (en ?? arVal)) ?? "";
    const directoryProfiles = [
      ...(data.profiles as any[]),
      ...(data.users as any[]).map((u) => ({
        id: u.profile_id,
        user_id: u.user_id,
        full_name_en: u.full_name_en,
        full_name_ar: u.full_name_ar,
        avatar_url: u.avatar_url,
        active: u.active,
      })),
    ].filter((p) => p.id || p.user_id);
    const profileById = new Map(directoryProfiles.filter((p: any) => p.id).map((p: any) => [p.id, p]));
    const profileByCreatedUserId = new Map<string, any>(directoryProfiles.filter((p: any) => p.user_id).map((p: any) => [p.user_id, p]));
    const nameOf = (id: string | null) => {
      if (!id) return "Unassigned";
      const p: any = profileById.get(id);
      if (!p) return "Unassigned";
      return pick(p.full_name_en, p.full_name_ar);
    };

    // Push profile name→id map + current user/profile to the write layer.
    const nameToId = new Map<string, string>();
    for (const p of directoryProfiles as any[]) {
      const en = p.full_name_en ?? "";
      const arName = p.full_name_ar ?? "";
      if (en) nameToId.set(en, p.id);
      if (arName) nameToId.set(arName, p.id);
    }
    const me = (data.profiles as any[]).find((p) => p.user_id === user?.id);
    setProfileMap(nameToId, me?.id ?? null, user?.id ?? null);


    const leadDistricts: Record<string, string> = {};
    const leads = data.leads.map((l: any) => {
      const district = pick(l.district_en, l.district_ar);
      const creatorProfile: any = profileByCreatedUserId.get(l.created_by);
      if (district) leadDistricts[l.id] = district;
      const effectiveOwnerProfile: any = l.owner_id
        ? profileById.get(l.owner_id)
        : creatorProfile;
      const effectiveOwnerName = effectiveOwnerProfile
        ? pick(effectiveOwnerProfile.full_name_en, effectiveOwnerProfile.full_name_ar)
        : "Unassigned";
      return {
        id: l.id,
        company: pick(l.company_en, l.company_ar),
        contact: pick(l.contact_name_en, l.contact_name_ar),
        source: pick(l.source_en, l.source_ar) || "—",
        status: l.status,
        owner: effectiveOwnerName,
        ownerId: effectiveOwnerProfile?.id ?? undefined,
        ownerPhoto: effectiveOwnerProfile?.avatar_url ?? undefined,
        value: Number(l.value ?? 0),
        industry: pick(l.industry_en, l.industry_ar) || "—",
        updatedAt: new Date(l.updated_at).toLocaleString(),
        updatedAtIso: l.updated_at ?? undefined,
        createdBy: l.created_by ?? undefined,
        createdByName: creatorProfile ? pick(creatorProfile.full_name_en, creatorProfile.full_name_ar) : undefined,
        createdByPhoto: creatorProfile?.avatar_url ?? undefined,
        city: pick(l.city_en, l.city_ar) || "—",
        country: l.country ?? "Egypt",
        lat: Number(l.lat ?? 30.0444),
        lng: Number(l.lng ?? 31.2357),
        email: l.email ?? undefined,
        street: pick(l.street_en, l.street_ar) || undefined,
        probability: l.probability ?? undefined,
        expectedCloseDate: l.expected_close_date ?? undefined,
        projectId: l.project_id ?? undefined,
      };
    });

    const clientById = new Map<string, any>((data.clients as any[]).map((c) => [c.id, c]));
    const memberCountByProject = new Map<string, number>();
    const memberNamesByProject = new Map<string, string[]>();
    const memberProfileIdsByProject = new Map<string, string[]>();
    const memberUserIdsByProject = new Map<string, string[]>();
    for (const m of (data.projectMembers as any[])) {
      memberCountByProject.set(m.project_id, (memberCountByProject.get(m.project_id) ?? 0) + 1);
      const prof: any = profileById.get(m.profile_id);
      const pids = memberProfileIdsByProject.get(m.project_id) ?? [];
      pids.push(m.profile_id);
      memberProfileIdsByProject.set(m.project_id, pids);
      if (prof) {
        const arr = memberNamesByProject.get(m.project_id) ?? [];
        arr.push(pick(prof.full_name_en, prof.full_name_ar));
        memberNamesByProject.set(m.project_id, arr);
        if (prof.user_id) {
          const uids = memberUserIdsByProject.get(m.project_id) ?? [];
          uids.push(prof.user_id);
          memberUserIdsByProject.set(m.project_id, uids);
        }
      }
    }
    const projectLocations: Record<string, { city: string; district: string }> = {};
    const projects = data.projects.map((p: any) => {
      const city = pick(p.city_en, p.city_ar);
      const district = pick(p.district_en, p.district_ar);
      if (city || district) projectLocations[p.id] = { city, district };
      const client = p.client_id ? clientById.get(p.client_id) : undefined;
      return {
        id: p.id,
        name: pick(p.name_en, p.name_ar),
        client: p.client_name ?? (client ? pick(client.name_en, client.name_ar) : ""),
        clientEmail: p.client_email ?? client?.email ?? undefined,
        clientPhone: p.client_phone ?? client?.phone ?? undefined,
        progress: p.progress ?? 0,
        budget: Number(p.budget ?? 0),
        offeredValue: Number(p.offered_value ?? 0),
        status: p.status,
        team: memberCountByProject.get(p.id) ?? 0,
        teamMembers: memberNamesByProject.get(p.id) ?? [],
        memberProfileIds: memberProfileIdsByProject.get(p.id) ?? [],
        memberUserIds: memberUserIdsByProject.get(p.id) ?? [],
        category: pick(p.category_en, p.category_ar) || "—",
        competitors: p.competitors ?? [],
        lastUpdate: p.updated_at?.slice(0, 10) ?? "",
        projectType: pick(p.project_type_en, p.project_type_ar) || undefined,
        city: city || undefined,
        district: district || undefined,
        street: pick(p.street_en, p.street_ar) || undefined,
        startDate: p.start_date ?? undefined,
        endDate: p.end_date ?? undefined,
        accountType: p.account_type ?? undefined,
        otherAccountType: p.other_account_type ?? undefined,
        extraContacts: (() => {
          const raw = p.extra_contacts;
          if (!raw) return undefined;
          if (Array.isArray(raw)) return raw;
          try { return JSON.parse(raw); } catch { return undefined; }
        })(),
      };
    });

    const itemsByQuotation = new Map<string, any[]>();
    for (const it of (data.quotationItems as any[]) ?? []) {
      const arr = itemsByQuotation.get(it.quotation_id) ?? [];
      arr.push(it);
      itemsByQuotation.set(it.quotation_id, arr);
    }
    const profileByUserIdEarly = profileByCreatedUserId;
    const leadById = new Map<string, any>(leads.map((l: any) => [l.id, l]));
    const quotations = data.quotations.map((q: any) => {
      const creatorProfile: any = profileByUserIdEarly.get(q.created_by);
      const approverProfile: any = profileByUserIdEarly.get(q.approved_by);
      const lead = leadById.get(q.lead_id);
      const ownerProfile: any = lead?.ownerId ? profileById.get(lead.ownerId) : creatorProfile;
      const items = (itemsByQuotation.get(q.id) ?? []).map((it: any) => ({
        id: it.id,
        nameEn: it.name_en ?? "",
        nameAr: it.name_ar ?? undefined,
        descriptionEn: it.description_en ?? undefined,
        descriptionAr: it.description_ar ?? undefined,
        qty: Number(it.qty ?? 1),
        unitPrice: Number(it.unit_price ?? 0),
        total: Number(it.total ?? Number(it.qty ?? 1) * Number(it.unit_price ?? 0)),
      }));
      const ownerName = ownerProfile
        ? (pick(ownerProfile.full_name_en, ownerProfile.full_name_ar) || "Unassigned")
        : lead?.owner || "Unassigned";
      return {
        id: q.code ?? q.id,
        uuid: q.id,
        code: q.code ?? undefined,
        leadId: q.lead_id ?? "",
        projectId: q.project_id ?? undefined,
        clientId: q.client_id ?? undefined,
        client: pick(q.title_en, q.title_ar),
        titleEn: q.title_en ?? undefined,
        titleAr: q.title_ar ?? undefined,
        descriptionEn: q.description_en ?? undefined,
        descriptionAr: q.description_ar ?? undefined,
        submissionDate: q.submission_date ?? q.created_at?.slice(0, 10),
        validUntil: q.valid_until ?? undefined,
        currency: q.currency ?? "SAR",
        value: Number(q.value ?? 0),
        status: q.status,
        revisions: 0,
        owner: ownerName,
        ownerId: ownerProfile?.id ?? lead?.ownerId ?? undefined,
        ownerPhoto: ownerProfile?.avatar_url ?? lead?.ownerPhoto ?? undefined,
        createdById: q.created_by ?? undefined,
        approvedAt: q.approved_at ?? undefined,
        approvedByName: approverProfile ? pick(approverProfile.full_name_en, approverProfile.full_name_ar) : undefined,
        createdAt: q.created_at ?? undefined,
        updatedAt: q.updated_at ?? undefined,
        feedback: pick(q.description_en, q.description_ar) || undefined,
        items,
      };
    });

    const profileByUserId = new Map<string, any>(
      (data.profiles as any[]).map((p) => [p.user_id, p]),

    );
    const profileFromUserId = (uid: string | null | undefined) => (uid ? profileByUserId.get(uid) : undefined);
    const activities = data.activities.map((a: any) => {
      const creator = profileFromUserId(a.created_by);
      const approver = profileFromUserId(a.approved_by);
      return {
        id: a.id,
        type: (String(a.type).charAt(0).toUpperCase() + String(a.type).slice(1)) as any,
        title: pick(a.title_en, a.title_ar),
        leadId: a.lead_id ?? undefined,
        projectId: a.project_id ?? undefined,
        dueDate: a.due_date,
        time: a.time ? String(a.time).slice(0, 5) : "—",
        owner: nameOf(a.owner_id),
        ownerId: a.owner_id ?? undefined,
        presalesIds: (a.presales_team ?? []) as string[],
        status: a.status,
        notes: pick(a.notes_en, a.notes_ar) || undefined,
        estMinutes: a.est_minutes ?? 60,
        createdAt: a.created_at,
        presalesTeam: (a.presales_team ?? []).map((pid: string) => nameOf(pid)),
        approvalStatus: a.approval_status ?? "approved",
        approvedBy: a.approved_by ?? undefined,
        approvedByName: approver ? pick(approver.full_name_en, approver.full_name_ar) : undefined,
        approvedByPhoto: approver?.avatar_url ?? undefined,
        approvedAt: a.approved_at ?? undefined,
        rejectionReason: a.rejection_reason ?? undefined,
        reviewNote: a.review_note ?? undefined,
        createdBy: a.created_by ?? undefined,
        createdByName: creator ? pick(creator.full_name_en, creator.full_name_ar) : (a.owner_id ? nameOf(a.owner_id) : undefined),
        createdByPhoto: creator?.avatar_url ?? undefined,
      };
    });

    const attendance = data.attendance.map((r: any) => ({
      id: r.id,
      date: r.date,
      checkIn: r.check_in ? String(r.check_in).slice(0, 5) : "",
      checkOut: r.check_out ? String(r.check_out).slice(0, 5) : "",
      hours: r.hours ? `${Number(r.hours).toFixed(1)}h` : "—",
      location: pick(r.location_en, r.location_ar) || "—",
      owner: nameOf(r.profile_id),
      lat: r.lat !== null && r.lat !== undefined ? Number(r.lat) : null,
      lng: r.lng !== null && r.lng !== undefined ? Number(r.lng) : null,
    }));


    const history = data.history.map((h: any) => ({
      id: h.id,
      ts: h.created_at,
      module: h.module,
      action: pick(h.action_en, h.action_ar),
      actor: nameOf(h.actor_id),
      target: pick(h.target_en, h.target_ar) || h.target_table || "",
      targetId: h.target_id ?? undefined,
      targetTable: h.target_table ?? undefined,
      details: pick(h.details_en, h.details_ar) || undefined,
    }));


    const myProfileId = me?.id ?? null;
    const myDisplayName = me ? pick(me.full_name_en, me.full_name_ar) : "";
    const notifications = data.notifications.map((n: any) => {
      const aud = (n.audience ?? []) as string[];
      const targeted = aud.length > 0;
      // If row is targeted to specific profile(s), expose ME in audience so the
      // role-agnostic gating in NotificationsMenu/Page lets me see it.
      const audience = targeted && myProfileId && aud.includes(myProfileId) && myDisplayName
        ? [myDisplayName]
        : undefined;
      return {
        id: n.id,
        type: n.type,
        titleEn: n.title_en,
        titleAr: n.title_ar ?? n.title_en,
        bodyEn: n.body_en ?? "",
        bodyAr: n.body_ar ?? n.body_en ?? "",
        ts: n.created_at,
        unread: myProfileId ? (n.unread_by ?? []).includes(myProfileId) : (n.unread_by ?? []).length > 0,
        href: n.href ?? undefined,
        audience,
      };
    });

    const locations = data.locations.length
      ? data.locations.map((l: any) => ({
          name: pick(l.city_en, l.city_ar),
          districts: ar ? (l.districts_ar ?? l.districts_en ?? []) : (l.districts_en ?? l.districts_ar ?? []),
        }))
      : undefined;

    const stages = data.stages.length
      ? data.stages.map((s: any) => ({ key: s.key, label: pick(s.label_en, s.label_ar), color: s.color }))
      : undefined;

    // Derive employees array (Employee shape) from profiles + leads aggregates.
    // Only include profiles whose user has the 'employee' role.
    const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "??";
    const employeeUserIds = new Set<string>(
      (data.users as any[])
        .filter((u) => (u.roles ?? []).includes("employee"))
        .map((u) => u.user_id),
    );
    const employeeProfiles = (data.users as any[]).length
      ? (data.profiles as any[]).filter((p) => employeeUserIds.has(p.user_id))
      : (data.profiles as any[]); // fallback when admin RPC unavailable
    const employees = employeeProfiles.map((p) => {
      const name = pick(p.full_name_en, p.full_name_ar);
      const myLeads = leads.filter((l) => l.owner === name);
      const won = myLeads.filter((l: any) => l.status === "won");
      const achieved = won.reduce((s, l: any) => s + Number(l.value ?? 0), 0);
      const perf = myLeads.length ? Math.round((won.length / myLeads.length) * 100) : 0;
      return {
        id: p.id,
        userId: p.user_id,
        managerId: p.manager_id ?? undefined,
        name,
        role: pick(p.title_en, p.title_ar) || "—",
        department: pick(p.department_en, p.department_ar) || "—",
        perf,
        leads: myLeads.length,
        won: won.length,
        avatar: initialsOf(name),
        photo: p.avatar_url ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        annualTarget: Number(p.target_value ?? 0),
        targetType: (p.target_type ?? "yearly") as "yearly" | "quarterly" | "monthly",
        achievedTarget: achieved,
      } as any;
    });

    // Users from admin RPC (admin-only). Fallback: derive from profiles when unavailable.
    const profileByUser = new Map<string, any>(
      (data.profiles as any[]).map((p) => [p.user_id, p]),
    );
    const mapUser = (u: any, p: any | undefined) => ({
      id: u.user_id ?? p?.user_id,
      profileId: u.profile_id ?? p?.id,
      name: pick(p?.full_name_en ?? u.full_name_en, p?.full_name_ar ?? u.full_name_ar) || (u.email ?? "—"),
      nameAr: p?.full_name_ar ?? u.full_name_ar ?? "",
      email: u.email ?? p?.email ?? "",
      phone: p?.phone ?? "",
      role: ((u.roles ?? [])[0] ?? "employee") as any,
      active: (u.active ?? p?.active ?? true) as boolean,
      titleEn: p?.title_en ?? "",
      titleAr: p?.title_ar ?? "",
      departmentEn: p?.department_en ?? "",
      departmentAr: p?.department_ar ?? "",
      locationEn: p?.location_en ?? "",
      locationAr: p?.location_ar ?? "",
      avatarUrl: p?.avatar_url ?? "",
      targetType: (p?.target_type ?? "yearly") as any,
      targetValue: Number(p?.target_value ?? 0),
      skills: (p?.skills ?? []) as string[],
      managerId: p?.manager_id ?? undefined,
    });
    const users = (data.users as any[]).length
      ? (data.users as any[]).map((u) => mapUser(u, profileByUser.get(u.user_id)))
      : (data.profiles as any[]).map((p) =>
          mapUser({ user_id: p.user_id, profile_id: p.id, email: p.email, roles: ["employee"], active: p.active }, p),
        );

    const meProfile = (data.profiles as any[]).find((p) => p.user_id === user?.id);
    const profileSlice = meProfile
      ? {
          profileId: meProfile.id,
          userId: meProfile.user_id,
          name: meProfile.full_name_en || meProfile.full_name_ar || meProfile.email || "—",
          nameAr: meProfile.full_name_ar ?? "",
          title: pick(meProfile.title_en, meProfile.title_ar) || "—",
          department: pick(meProfile.department_en, meProfile.department_ar) || "—",
          email: meProfile.email ?? "",
          phone: meProfile.phone ?? "",
          location: pick(meProfile.location_en, meProfile.location_ar) || "—",
          skills: (meProfile.skills ?? []) as string[],
          manager: meProfile.manager_id ? nameOf(meProfile.manager_id) : undefined,
          avatarUrl: meProfile.avatar_url ?? undefined,
          targetValue: Number(meProfile.target_value ?? 0),
          targetType: (meProfile.target_type ?? "yearly") as any,
        }
      : undefined;

    actions.hydrateFromSupabase({
      leads,
      projects: projects as any,
      quotations: quotations as any,
      activities: activities as any,
      attendance,
      history,
      notifications,
      leadDistricts,
      projectLocations,
      employees,
      users,
      ...(profileSlice ? { profile: profileSlice as any } : {}),
      settings: {
        ...(locations ? { locations } : {}),
        ...(stages ? { stages } : {}),
        departments: (data.departments as any[]).map((d) => ({ id: d.id, nameEn: d.name_en ?? "", nameAr: d.name_ar ?? "" })),
        positions: (data.positions as any[]).map((p) => ({ id: p.id, nameEn: p.name_en ?? "", nameAr: p.name_ar ?? "" })),
        ...((data as any).rolePerms?.length ? { rolePermsRows: (data as any).rolePerms } : {}),
      } as any,

    });
  }, [data, lang, user?.id]);

  return syncQuery;
}
