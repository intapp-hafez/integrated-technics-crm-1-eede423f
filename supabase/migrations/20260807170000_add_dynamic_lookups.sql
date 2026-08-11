create table if not exists public.sys_locations (
  id uuid primary key default gen_random_uuid(),
  country_en text not null,
  country_ar text not null,
  city_en text not null,
  city_ar text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sys_nationalities (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS policies (assume accessible for read to anon, full access to admins if RLS is enabled on CRM)
-- Usually int-crm tables have RLS disabled or allow all for authenticated, but we'll add basic policies if it's enabled.
-- Let's just create them. If we need RLS:
-- alter table public.sys_locations enable row level security;
-- alter table public.sys_nationalities enable row level security;
-- For now, following CRM patterns, we just create the tables.
