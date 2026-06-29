import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useStoreState } from "@/lib/store";
import { isLeadRelatedToEmployee } from "@/lib/employeeTargets";
import { isAssignedToEmployee } from "@/lib/activityFilters";

/**
 * Returns the employees that report to the current manager (by profiles.manager_id),
 * along with helpers to filter leads/activities/attendance to that team.
 *
 * Admins see all employees.
 */
export function useMyTeam(options?: { forceTeam?: boolean }) {
  const { user, role } = useAuth();
  const { employees, users } = useStoreState();
  const forceTeam = options?.forceTeam ?? false;

  return useMemo(() => {
    const me = users.find((u) => u.id === user?.id);
    const myProfileId = me?.profileId;

    const isAdmin = role === "admin" && !forceTeam;
    const teamEmployees = isAdmin
      ? employees
      : myProfileId
        ? employees.filter((e: any) => e.managerId === myProfileId || e.id === myProfileId)
        : [];

    const teamNames = new Set(teamEmployees.map((e) => e.name));
    const includesOwner = (owner?: string) => !owner || teamNames.has(owner);

    const teamIdentities = teamEmployees.map((e: any) => ({
      profileId: e.id,
      userId: e.userId,
      name: e.name,
    }));

    const includesLead = (lead: any) => {
      // If it doesn't belong to any specific owner, show it? Or only if no owner fields at all.
      if (!lead.ownerId && !lead.owner && !lead.createdBy && !lead.createdByName) return true;
      return teamIdentities.some((identity) => isLeadRelatedToEmployee(lead, identity));
    };

    const includesActivity = (act: any) => {
      if (!act.ownerId && !act.owner && !act.presalesIds?.length && !act.presalesTeam?.length)
        return true;
      return teamIdentities.some((identity) => isAssignedToEmployee(act, identity));
    };

    return {
      teamEmployees,
      teamNames,
      includesOwner,
      includesLead,
      includesActivity,
      myProfileId,
    };
  }, [employees, users, user?.id, role, forceTeam]);
}
