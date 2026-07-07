-- Fix invalid enum value 'user' for history_module in role assignment/removal RPCs

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
  values ('settings','Role assigned','تم تعيين صلاحية',
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
  values ('settings','Role removed','تمت إزالة الصلاحية',
    public.current_profile_id(),'user_roles', _user_id,
    'Removed role ' || _role::text, 'تمت إزالة الدور ' || _role::text);
end;
$$;
