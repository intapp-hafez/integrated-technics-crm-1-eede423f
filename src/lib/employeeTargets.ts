export interface EmployeeIdentity {
  profileId?: string | null;
  userId?: string | null;
  name?: string | null;
}

export interface LeadIdentityLike {
  ownerId?: string | null;
  owner?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
}

export function isLeadRelatedToEmployee(lead: LeadIdentityLike, employee: EmployeeIdentity): boolean {
  if (!lead || !employee) return false;
  if (employee.profileId && lead.ownerId === employee.profileId) return true;
  if (employee.userId && lead.createdBy === employee.userId) return true;

  const name = employee.name;
  if (!name) return false;
  if (!lead.ownerId && lead.owner === name) return true;
  if (!lead.createdBy && lead.createdByName === name) return true;
  return false;
}