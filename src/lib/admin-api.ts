// Client wrappers around the `admin-users` edge function. Replaces the
// former TanStack server functions so the app builds as a pure SPA.
import { supabase } from "@/integrations/supabase/client";

async function call(action: string, data: Record<string, unknown>) {
  const { data: res, error } = await supabase.functions.invoke("admin-users", {
    body: { action, data },
  });
  if (error) throw new Error(error.message ?? String(error));
  if (res && typeof res === "object" && "error" in res && res.error) {
    throw new Error(String((res as any).error));
  }
  return res;
}

export type CreateUserInput = {
  email: string;
  password: string;
  full_name_en: string;
  full_name_ar?: string | null;
  phone?: string | null;
  role: "admin" | "manager" | "hr" | "finance" | "employee";
  title_en?: string | null;
  title_ar?: string | null;
  department_en?: string | null;
  department_ar?: string | null;
  location_en?: string | null;
  location_ar?: string | null;
  avatar_url?: string | null;
  target_type?: "yearly" | "quarterly" | "monthly" | null;
  target_value?: number | null;
  start_date?: string | null;
  annual_target?: number | null;
  q1_target?: number | null;
  q2_target?: number | null;
  q3_target?: number | null;
  q4_target?: number | null;
  weekly_meetings_target?: number | null;
  skills?: string[] | null;
  active?: boolean;
  manager_id?: string | null;
};

export const adminCreateUser = (data: CreateUserInput) => call("create_user", data);
export const adminAddDepartment = (data: { name_en: string; name_ar?: string | null }) =>
  call("add_department", data);
export const adminDeleteDepartment = (data: { id: string }) => call("delete_department", data);
export const adminAddPosition = (data: { name_en: string; name_ar?: string | null }) =>
  call("add_position", data);
export const adminDeletePosition = (data: { id: string }) => call("delete_position", data);
