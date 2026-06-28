import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "admin" | "manager" | "finance" | "employee";
export type Panel = Role;
// All roles in DB enum (including `hr`) that we surface as raw strings
export type DbRole = Role | "hr";

export const ROLE_PRIORITY: Role[] = ["admin", "manager", "finance", "employee"];
export const PANEL_PATH: Record<Panel, string> = {
  admin: "/admin",
  manager: "/manager",
  finance: "/finance",
  employee: "/employee",
};

const STORAGE_KEY = "int-crm:role";

export function getStoredRole(): Role | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v && (ROLE_PRIORITY as string[]).includes(v) ? (v as Role) : null;
}
export function setStoredRole(r: Role | null) {
  if (typeof window === "undefined") return;
  if (r) localStorage.setItem(STORAGE_KEY, r);
  else localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("int-crm:role-change", { detail: r }));
}

export interface Profile {
  id: string;
  user_id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string | null;
  avatar_url: string | null;
  title_en: string | null;
  title_ar: string | null;
}

interface AuthCtx {
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  role: Role | null;
  panel: Panel | null;
  isAdmin: boolean;
  isManager: boolean;
  isFinance: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const navigate = useNavigate();

  async function load(currentUser: User | null) {
    if (!currentUser) {
      setProfile(null);
      setRoles([]);
      setStoredRole(null);
      return;
    }
    const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,user_id,full_name_en,full_name_ar,email,avatar_url,title_en,title_ar")
        .eq("user_id", currentUser.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", currentUser.id),
    ]);
    setProfile((profileRow as Profile) ?? null);
    const allRoles = (roleRows ?? []).map((r) => r.role as string);
    const resolved = allRoles.filter((r): r is Role => (ROLE_PRIORITY as string[]).includes(r));
    setRoles(resolved);
    const top = ROLE_PRIORITY.find((r) => resolved.includes(r)) ?? null;
    setStoredRole(top);
  }

  useEffect(() => {
    // Listener FIRST to avoid missed events
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Defer reload to avoid deadlocks in onAuthStateChange
      setTimeout(() => {
        load(session?.user ?? null);
      }, 0);
    });
    // Then bootstrap initial session
    supabase.auth.getSession().then(async ({ data }) => {
      setUser(data.session?.user ?? null);
      await load(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const role = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null;
  const panel: Panel | null = role;

  const refresh = async () => {
    await load(user);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setStoredRole(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    navigate({ to: "/", replace: true });
  };

  return (
    <Ctx.Provider
      value={{
        loading,
        user,
        profile,
        roles,
        role,
        panel,
        isAdmin: role === "admin",
        isManager: role === "manager",
        isFinance: role === "finance",
        refresh,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
