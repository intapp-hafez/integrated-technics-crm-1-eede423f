import type { ChatContact } from "@/components/ChatWithContacts";
import type { AppUser, Employee } from "@/lib/store";

type Role = "admin" | "manager" | "finance" | "employee" | "hr" | string | null | undefined;

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "??"
  );
}

function toContact(u: AppUser): ChatContact {
  return {
    profileId: u.profileId!,
    name: u.name,
    role: u.role,
    photo: u.avatarUrl,
    initials: initialsOf(u.name),
  };
}

/**
 * Role-based chat directory:
 * - admin    → all active users
 * - manager  → admins + employees whose manager is me
 * - employee → admins + my direct manager
 * - finance  → admins only
 * - hr       → admins + all employees
 */
export function chatContactsFor(
  role: Role,
  myProfileId: string | undefined,
  users: AppUser[],
  employees: Employee[],
): ChatContact[] {
  const pool = users.filter((u) => u.profileId && u.active && u.profileId !== myProfileId);
  const admins = pool.filter((u) => u.role === "admin");

  if (role === "admin") {
    return pool.map(toContact);
  }

  if (role === "manager") {
    const teamEmpProfileIds = new Set(
      employees
        .filter((e: any) => e.managerId && e.managerId === myProfileId)
        .map((e: any) => e.id as string),
    );
    const team = pool.filter((u) => teamEmpProfileIds.has(u.profileId!));
    // de-dup admins + team
    const seen = new Set<string>();
    return [...admins, ...team]
      .filter((u) => (seen.has(u.profileId!) ? false : (seen.add(u.profileId!), true)))
      .map(toContact);
  }

  if (role === "employee") {
    const me: any = employees.find((e: any) => e.id === myProfileId);
    const myManagerId: string | undefined = me?.managerId;
    const mgr = myManagerId ? pool.find((u) => u.profileId === myManagerId) : undefined;
    const seen = new Set<string>();
    return [...admins, ...(mgr ? [mgr] : [])]
      .filter((u) => (seen.has(u.profileId!) ? false : (seen.add(u.profileId!), true)))
      .map(toContact);
  }

  if (role === "finance") {
    return admins.map(toContact);
  }

  if (role === "hr") {
    const emps = pool.filter((u) => u.role === "employee");
    const seen = new Set<string>();
    return [...admins, ...emps]
      .filter((u) => (seen.has(u.profileId!) ? false : (seen.add(u.profileId!), true)))
      .map(toContact);
  }

  return admins.map(toContact);
}
