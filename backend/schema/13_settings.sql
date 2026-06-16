-- Configurable settings: pipeline stages, statuses, activity types, locations,
-- automations, notification templates, permissions.

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label_en text not null,
  label_ar text,
  color text not null default '#64748b',
  sort_order int not null default 0
);

create table public.activity_types_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label_en text not null,
  label_ar text
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  city_en text not null,
  city_ar text,
  districts_en text[] default '{}',
  districts_ar text[] default '{}',
  unique(city_en)
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  trigger_en text not null,
  trigger_ar text,
  action_en text not null,
  action_ar text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  channel text not null check (channel in ('Email','SMS','WhatsApp','Push')),
  subject_en text,
  subject_ar text,
  body_en text not null,
  body_ar text
);

-- Role / page permissions matrix
create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  page text not null,                             -- dashboard|leads|pipeline|...
  can_create boolean default false,
  can_read   boolean default true,
  can_update boolean default false,
  can_delete boolean default false,
  unique(role, page)
);
