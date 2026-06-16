-- Public profile mirrored from auth.users (never FK to auth.users in app tables)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,                 -- references auth.users(id)
  full_name_en text not null,
  full_name_ar text,
  title_en text,
  title_ar text,
  department_en text,
  department_ar text,
  email text not null unique,
  phone text,
  location_en text,
  location_ar text,
  avatar_url text,
  manager_id uuid references public.profiles(id) on delete set null,
  skills text[] default '{}',
  target_value numeric(14,2) default 0,
  target_type text check (target_type in ('yearly','quarterly','monthly')) default 'yearly',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_user_id_idx on public.profiles(user_id);
create index profiles_manager_idx on public.profiles(manager_id);
