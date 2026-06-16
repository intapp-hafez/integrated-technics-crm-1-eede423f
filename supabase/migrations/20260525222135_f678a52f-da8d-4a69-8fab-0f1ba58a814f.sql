
drop function if exists public.admin_users_list();
drop view if exists public.admin_users_view;

create or replace function public.admin_users_list()
returns table(
  user_id uuid,
  email text,
  auth_created_at timestamptz,
  last_sign_in_at timestamptz,
  profile_id uuid,
  full_name_en text,
  full_name_ar text,
  avatar_url text,
  active boolean,
  roles public.app_role[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Only admins can list users';
  end if;

  return query
  select
    u.id, u.email::text, u.created_at, u.last_sign_in_at,
    p.id, p.full_name_en, p.full_name_ar, p.avatar_url, p.active,
    coalesce(
      (select array_agg(ur.role order by ur.role)
         from public.user_roles ur where ur.user_id = u.id),
      '{}'::public.app_role[]
    )
  from auth.users u
  left join public.profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$;

revoke execute on function public.admin_users_list() from anon, public;
grant execute on function public.admin_users_list() to authenticated;

revoke execute on function public.admin_assign_role(uuid, public.app_role) from anon, public;
revoke execute on function public.admin_remove_role(uuid, public.app_role) from anon, public;
grant execute on function public.admin_assign_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_remove_role(uuid, public.app_role) to authenticated;
