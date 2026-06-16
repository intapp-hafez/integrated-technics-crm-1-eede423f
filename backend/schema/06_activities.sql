create table public.activities (
  id uuid primary key default gen_random_uuid(),
  type public.activity_type not null,
  title_en text not null,
  title_ar text,
  notes_en text,
  notes_ar text,
  lead_id uuid references public.leads(id) on delete set null,
  project_id uuid,                                -- FK added after projects table
  owner_id uuid references public.profiles(id) on delete set null,
  due_date date not null,
  time time,
  status public.activity_status not null default 'pending',
  est_minutes int default 60,
  presales_team uuid[] default '{}',              -- array of profile ids
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_owner_idx on public.activities(owner_id);
create index activities_due_idx on public.activities(due_date);
create index activities_lead_idx on public.activities(lead_id);
