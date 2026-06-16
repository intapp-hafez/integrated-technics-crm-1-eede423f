-- User roles MUST live on a dedicated table (never on profiles) to avoid
-- privilege-escalation attacks via row updates.

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,                        -- references auth.users(id)
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index user_roles_user_idx on public.user_roles(user_id);

-- SECURITY DEFINER helper used in every RLS policy to avoid recursion.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- Convenience: get the (highest-priority) role of a user.
create or replace function public.current_role_of(_user_id uuid)
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles
  where user_id = _user_id
  order by case role
    when 'admin' then 1
    when 'manager' then 2
    when 'finance' then 3
    when 'hr' then 4
    when 'employee' then 5
  end
  limit 1;
$$;
