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

export function isLeadRelatedToEmployee(
  lead: LeadIdentityLike,
  employee: EmployeeIdentity,
): boolean {
  if (!lead || !employee) return false;
  if (employee.profileId && lead.ownerId === employee.profileId) return true;
  if (employee.userId && lead.createdBy === employee.userId) return true;

  const name = employee.name;
  if (!name) return false;
  if (!lead.ownerId && lead.owner === name) return true;
  if (!lead.createdBy && lead.createdByName === name) return true;
  return false;
}

import { getKpiPeriodDates, sumWonInPeriod } from "./targetPeriod";

export function computeEmployeeKpis(
  emp: any,
  empActivities: any[],
  empLeads: any[],
  storeAttendance: any[],
) {
  const nowLocal = new Date();
  const curYear = nowLocal.getFullYear();
  const curMonth = nowLocal.getMonth();

  const tP = getKpiPeriodDates(emp?.kpiTargetPeriod || "monthly", curYear, curMonth, 0);
  const acP = getKpiPeriodDates(emp?.kpiActivitiesPeriod || "monthly", curYear, curMonth, 0);
  const atP = getKpiPeriodDates(emp?.kpiAttendancePeriod || "monthly", curYear, curMonth, 0);

  const actsInMonth = empActivities.filter((a) => {
    if (!a.dueDate) return true;
    const d = new Date(a.dueDate).getTime();
    return d >= acP.start.getTime() && d <= acP.end.getTime();
  });
  const totalActs = actsInMonth.length;
  const completedActs = actsInMonth.filter((a) => a.status === "done").length;
  const activityScore = totalActs > 0 ? (completedActs / totalActs) * 100 : 100;

  const annualTarget = Number(emp?.annualTarget ?? 0);
  const kpiMonthlyTarget = annualTarget / tP.divisor;
  const kpiMonthlyAchieved = sumWonInPeriod(empLeads as any, {
    periodStartMs: tP.start.getTime(),
    periodEndMs: tP.end.getTime(),
  });
  const achieveRate = kpiMonthlyTarget > 0 ? (kpiMonthlyAchieved / kpiMonthlyTarget) * 100 : 0;
  const targetScore = Math.min(100, achieveRate);

  const presentDays = storeAttendance.filter((r) => {
    if (r.owner !== emp?.name) return false;
    const d = new Date(r.date);
    return d >= atP.start && d <= atP.end;
  }).length;
  const targetDay =
    atP.start.getTime() <= nowLocal.getTime() && nowLocal.getTime() <= atP.end.getTime()
      ? nowLocal
      : atP.end;
  let workingDays = 0;
  for (let d = new Date(atP.start); d <= targetDay; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 5 && wd !== 6) workingDays++;
  }
  const attendanceRate = workingDays > 0 ? Math.min(100, (presentDays / workingDays) * 100) : 0;

  const tW = emp?.kpiTargetWeight ?? 33.33;
  const acW = emp?.kpiActivitiesWeight ?? 33.33;
  const atW = emp?.kpiAttendanceWeight ?? 33.34;

  const overallKpi = Math.round(
    targetScore * (tW / 100) + activityScore * (acW / 100) + attendanceRate * (atW / 100),
  );

  return {
    targetScore: Math.round(targetScore),
    activityScore: Math.round(activityScore),
    attendanceRate: Math.round(attendanceRate),
    overallKpi,
  };
}
