create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text unique,                               -- e.g. P-208
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  client_id uuid references public.clients(id) on delete set null,
  category_en text,
  category_ar text,
  status public.project_status not null default 'On Track',
  progress int check (progress between 0 and 100) default 0,
  budget numeric(14,2) default 0,
  offered_value numeric(14,2) default 0,
  competitors text[] default '{}',
  project_type_en text,
  project_type_ar text,
  city_en text,
  city_ar text,
  district_en text,
  district_ar text,
  street_en text,
  street_ar text,
  manager_id uuid references public.profiles(id) on delete set null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project membership: drives "my projects" filter on the employee panel.
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_en text default 'Member',
  role_ar text,
  added_at timestamptz not null default now(),
  unique(project_id, profile_id)
);
create index project_members_profile_idx on public.project_members(profile_id);
create index project_members_project_idx on public.project_members(project_id);

-- Late FK from activities.project_id
alter table public.activities
  add constraint activities_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;
