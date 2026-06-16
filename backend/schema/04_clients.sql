-- Client / company directory (bilingual)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  industry_en text,
  industry_ar text,
  contact_name_en text,
  contact_name_ar text,
  email text,
  phone text,
  city_en text,
  city_ar text,
  district_en text,
  district_ar text,
  street_en text,
  street_ar text,
  lat numeric(9,6),
  lng numeric(9,6),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_name_en_trgm on public.clients using gin (name_en gin_trgm_ops);
create index clients_name_ar_trgm on public.clients using gin (name_ar gin_trgm_ops);
