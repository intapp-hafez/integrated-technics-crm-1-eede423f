-- 1. PROFILES: restrict full row, expose directory view
drop policy if exists "profiles: read all authenticated" on public.profiles;

create policy "profiles: self read"
on public.profiles for select to authenticated
using (user_id = auth.uid());

create policy "profiles: admin/hr/manager read"
on public.profiles for select to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'hr')
  or public.has_role(auth.uid(),'manager')
);

-- Directory view with only safe columns; runs as definer to bypass RLS on profiles
create or replace view public.profiles_directory
with (security_invoker = false) as
select
  id, user_id, full_name_en, full_name_ar, avatar_url,
  title_en, title_ar, department_en, department_ar, active
from public.profiles;

grant select on public.profiles_directory to authenticated;

-- 2. CLIENTS: restrict reads
drop policy if exists "clients: read authenticated" on public.clients;

create policy "clients: read privileged"
on public.clients for select to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'finance')
);

-- 3. NOTIFICATIONS: drop empty-audience broadcast loophole
drop policy if exists "notifications: read" on public.notifications;

create policy "notifications: read"
on public.notifications for select to authenticated
using (
  (public.current_profile_id() = any (audience))
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = any (notifications.audience_roles)
  )
);

-- 4. Function search_path hardening for `t`
create or replace function public.t(_en text, _ar text, _lang text default 'en')
returns text
language sql
immutable
set search_path = public
as $$
  select case when _lang = 'ar' then coalesce(nullif(_ar,''), _en)
              else coalesce(nullif(_en,''), _ar) end;
$$;

-- 5. Revoke EXECUTE on sensitive SECURITY DEFINER functions from anon
revoke execute on function public.admin_assign_role(uuid, public.app_role) from anon, public;
revoke execute on function public.admin_remove_role(uuid, public.app_role) from anon, public;
revoke execute on function public.admin_users_list() from anon, public;
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.roles_of(uuid) from anon, public;
revoke execute on function public.current_profile_id() from anon, public;
revoke execute on function public.current_role_of(uuid) from anon, public;
revoke execute on function public.is_project_member(uuid) from anon, public;