create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  code text unique,                               -- e.g. Q-3001
  lead_id uuid references public.leads(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  title_en text not null,
  title_ar text,
  description_en text,
  description_ar text,
  submission_date date not null default current_date,
  valid_until date,
  value numeric(14,2) not null default 0,
  currency text not null default 'SAR',
  status public.quotation_status not null default 'draft',
  created_by uuid,                                -- auth.users.id
  approved_by uuid,                               -- finance/admin profile
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotations_status_idx on public.quotations(status);
create index quotations_lead_idx on public.quotations(lead_id);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  qty numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) generated always as (qty * unit_price) stored,
  sort_order int default 0
);
create index quotation_items_q_idx on public.quotation_items(quotation_id);
