create table public.leads (
  id uuid primary key default gen_random_uuid(),
  code text unique,                              -- human readable e.g. L-1042
  client_id uuid references public.clients(id) on delete set null,
  company_en text not null,
  company_ar text,
  contact_name_en text,
  contact_name_ar text,
  email text,
  phone text,
  source_en text,
  source_ar text,
  industry_en text,
  industry_ar text,
  status public.lead_status not null default 'new',
  owner_id uuid references public.profiles(id) on delete set null,
  value numeric(14,2) default 0,
  probability int check (probability between 0 and 100) default 0,
  expected_close_date date,
  city_en text,
  city_ar text,
  district_en text,
  district_ar text,
  street_en text,
  street_ar text,
  lat numeric(9,6),
  lng numeric(9,6),
  created_by uuid,                               -- auth.users.id
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_status_idx on public.leads(status);
create index leads_owner_idx on public.leads(owner_id);
create index leads_company_trgm on public.leads using gin (company_en gin_trgm_ops);

-- Notes on leads
create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  text_en text,
  text_ar text,
  created_at timestamptz not null default now()
);
create index lead_notes_lead_idx on public.lead_notes(lead_id);
