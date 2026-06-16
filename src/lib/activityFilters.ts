// Shared "is this activity mine?" predicate.
// Always prefer IDs (profile.id, auth.user_id) over display names.
// Falls back to names only when the activity row lacks the ID metadata
// (e.g. legacy locally-created rows that haven't synced yet).

export interface ActivityLike {
  ownerId?: string;
  owner?: string;
  presalesIds?: string[];
  presalesTeam?: string[]; // legacy: names
  createdBy?: string; // auth user_id
  createdByName?: string;
}

export interface EmployeeIdentity {
  profileId?: string | null;
  userId?: string | null;
  name?: string | null;
}

/**
 * True when the activity is "assigned" to the employee:
 *  - employee is the owner (by profile.id), OR
 *  - employee is in the presales team (by profile.id)
 *
 * Does NOT include activities the employee merely created but left unassigned.
 */
export function isAssignedToEmployee(a: ActivityLike, who: EmployeeIdentity): boolean {
  if (!a || !who) return false;
  const pid = who.profileId;
  if (pid) {
    if (a.ownerId === pid) return true;
    if (Array.isArray(a.presalesIds) && a.presalesIds.includes(pid)) return true;
  }
  // Legacy name-based fallback (only when the activity has no ID metadata).
  const name = who.name;
  if (name && !a.ownerId) {
    if (a.owner === name) return true;
    if (Array.isArray(a.presalesTeam) && a.presalesTeam.includes(name)) return true;
  }
  return false;
}

/**
 * True when the employee is related to the activity in any way:
 *  - assigned (owner or presales), OR
 *  - created the activity (even if it's currently unassigned).
 * Use this for broader "employee profile" views; use isAssignedToEmployee
 * for strict "Assigned Activities" lists.
 */
export function isRelatedToEmployee(a: ActivityLike, who: EmployeeIdentity): boolean {
  if (isAssignedToEmployee(a, who)) return true;
  if (who.userId && a.createdBy === who.userId) return true;
  if (who.name && !a.createdBy && a.createdByName === who.name) return true;
  return false;
}
