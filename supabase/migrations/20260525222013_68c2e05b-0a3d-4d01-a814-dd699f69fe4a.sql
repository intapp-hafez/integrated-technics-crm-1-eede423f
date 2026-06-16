
-- Enforce unique emails on profiles (auth.users already enforces unique email, this keeps the mirror consistent)
update public.profiles p
set email = lower(p.email)
where email is not null;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email))
  where email is not null and email <> '';

-- Helper to fetch all role rows for a user with full ordering
create or replace function public.roles_of(_user_id uuid)
returns table(role public.app_role)
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = _user_id
$$;

-- Allow admins to read every user_roles row (already covered) and add list of all auth users via a safe view
create or replace view public.admin_users_view as
select
  u.id              as user_id,
  u.email           as email,
  u.created_at      as auth_created_at,
  u.last_sign_in_at as last_sign_in_at,
  p.id              as profile_id,
  p.full_name_en    as full_name_en,
  p.full_name_ar    as full_name_ar,
  p.avatar_url      as avatar_url,
  p.active          as active,
  coalesce(
    (select array_agg(ur.role order by ur.role)
       from public.user_roles ur
      where ur.user_id = u.id), '{}'::public.app_role[]
  )                 as roles
from auth.users u
left join public.profiles p on p.user_id = u.id;

revoke all on public.admin_users_view from anon, authenticated;
grant select on public.admin_users_view to authenticated;

-- Lock down the view via security barrier function used as a guard policy proxy
create or replace function public.admin_users_list()
returns setof public.admin_users_view
language sql
stable
security definer
set search_path = public
as $$
  select * from public.admin_users_view
  where public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- Admin RPC: assign role (idempotent)
create or replace function public.admin_assign_role(_user_id uuid, _role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins can assign roles';
  end if;
  insert into public.user_roles (user_id, role)
  values (_user_id, _role)
  on conflict (user_id, role) do nothing;

  insert into public.history (module, action_en, action_ar, actor_id, target_table, target_id, details_en, details_ar)
  values ('user','Role assigned','تم تعيين صلاحية',
    public.current_profile_id(),'user_roles', _user_id,
    'Assigned role ' || _role::text, 'تم تعيين الدور ' || _role::text);
end;
$$;

-- Admin RPC: remove role (prevents removing last admin)
create or replace function public.admin_remove_role(_user_id uuid, _role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare admin_count int;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins can remove roles';
  end if;
  if _role = 'admin'::public.app_role then
    select count(*) into admin_count from public.user_roles where role = 'admin'::public.app_role;
    if admin_count <= 1 then
      raise exception 'Cannot remove the last admin role';
    end if;
  end if;
  delete from public.user_roles where user_id = _user_id and role = _role;

  insert into public.history (module, action_en, action_ar, actor_id, target_table, target_id, details_en, details_ar)
  values ('user','Role removed','تمت إزالة الصلاحية',
    public.current_profile_id(),'user_roles', _user_id,
    'Removed role ' || _role::text, 'تمت إزالة الدور ' || _role::text);
end;
$$;

grant execute on function public.admin_assign_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_remove_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_users_list() to authenticated;
