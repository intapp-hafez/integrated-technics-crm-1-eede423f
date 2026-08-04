import type { Project, Profile } from "@/lib/store";

/**
 * Determine whether a project should appear in the current employee's
 * "My Projects" list. Membership is matched against any of the available
 * identifiers (profile id, auth user id, or display name) so we stay
 * consistent across panels regardless of which field the sync populated.
 */
export function isProjectMemberOf(
  p: Project,
  me: Pick<Profile, "profileId" | "userId" | "name">,
): boolean {
  const pid = me.profileId;
  const uid = me.userId;
  const name = (me.name ?? "").trim().toLowerCase();

  const hasAssignedMembers =
    (p.memberProfileIds && p.memberProfileIds.length > 0) ||
    (p.memberUserIds && p.memberUserIds.length > 0) ||
    (p.teamMembers && p.teamMembers.length > 0);

  if (hasAssignedMembers) {
    if (pid && (p.memberProfileIds ?? []).includes(pid)) return true;
    if (uid && (p.memberUserIds ?? []).includes(uid)) return true;
    if (name && (p.teamMembers ?? []).some((n) => n.trim().toLowerCase() === name)) return true;
    if (pid && p.managerId === pid) return true;
    if (uid && p.managerId === uid) return true;
    return false;
  }

  if (pid && p.managerId === pid) return true;
  if (uid && p.managerId === uid) return true;
  if (name && p.createdByName?.trim().toLowerCase() === name) return true;
  return false;
}

export function getProjectOwner(p: Project, users?: any[], employees?: any[]): string {
  if (p.teamMembers && p.teamMembers.length > 0) {
    const validMembers = p.teamMembers.filter((m) => m && !m.includes("-"));
    if (validMembers.length > 0) {
      return validMembers.join(", ");
    }
    const resolved = p.teamMembers
      .map((tm) => {
        const e = employees?.find(
          (emp: any) => emp.id === tm || emp.profileId === tm || emp.name === tm,
        );
        if (e?.name && !e.name.includes("-")) return e.name;
        const u = users?.find(
          (usr: any) => usr.id === tm || usr.profileId === tm || usr.name === tm,
        );
        if (u?.name && !u.name.includes("-")) return u.name;
        return !tm.includes("-") ? tm : "";
      })
      .filter(Boolean);
    if (resolved.length > 0) return resolved.join(", ");
  }

  if (p.createdByName && !p.createdByName.includes("-")) {
    return p.createdByName;
  }
  if (p.createdBy) {
    const u = users?.find((usr: any) => usr.id === p.createdBy || usr.profileId === p.createdBy);
    if (u?.name && !u.name.includes("-")) return u.name;
    const e = employees?.find(
      (emp: any) => emp.id === p.createdBy || emp.profileId === p.createdBy,
    );
    if (e?.name && !e.name.includes("-")) return e.name;
  }
  if (p.createdByName) return p.createdByName;
  return "—";
}

export function filterMyProjects(
  projects: Project[],
  me: Pick<Profile, "profileId" | "userId" | "name">,
): Project[] {
  return projects.filter((p) => isProjectMemberOf(p, me));
}
