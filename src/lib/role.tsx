// Compatibility shim: existing imports of useRole/RoleProvider/setStoredRole/Role keep working.
// The real auth+role source of truth now lives in `@/lib/auth`.
import type { ReactNode } from "react";
import { AuthProvider, useAuth, setStoredRole, getStoredRole } from "./auth";
import type { Role as AuthRole } from "./auth";

export type Role = AuthRole;
export { setStoredRole, getStoredRole };

export function RoleProvider({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function useRole() {
  const { role, isAdmin, isManager, isFinance } = useAuth();
  // Default to "employee" if no role yet so legacy components don't crash before auth resolves
  const r: Role = role ?? "employee";
  return {
    role: r,
    setRole: (_r: Role) => setStoredRole(_r),
    isAdmin,
    isManager,
    isFinance,
  };
}
