import type { Project, Profile } from "@/lib/store";

/**
 * Determine whether a project should appear in the current employee's
 * "My Projects" list. Membership is matched against any of the available
 * identifiers (profile id, auth user id, or display name) so we stay
 * consistent across panels regardless of which field the sync populated.
 */
export function isProjectMemberOf(p: Project, me: Pick<Profile, "profileId" | "userId" | "name">): boolean {
  const pid = me.profileId;
  const uid = me.userId;
  const name = (me.name ?? "").trim().toLowerCase();
  if (pid && (p.memberProfileIds ?? []).includes(pid)) return true;
  if (uid && (p.memberUserIds ?? []).includes(uid)) return true;
  if (name && (p.teamMembers ?? []).some((n) => n.trim().toLowerCase() === name)) return true;
  return false;
}

export function filterMyProjects(projects: Project[], me: Pick<Profile, "profileId" | "userId" | "name">): Project[] {
  return projects.filter((p) => isProjectMemberOf(p, me));
}
