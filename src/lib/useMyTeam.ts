import { useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useStoreState } from "@/lib/store";

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

    return { teamEmployees, teamNames, includesOwner, myProfileId };
  }, [employees, users, user?.id, role, forceTeam]);
}
