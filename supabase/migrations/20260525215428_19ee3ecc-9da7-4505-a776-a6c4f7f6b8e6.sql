-- Required extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Enums
create type public.app_role as enum ('admin','manager','hr','finance','employee');
create type public.lead_status as enum ('new','contacted','qualified','proposal','negotiation','won','lost');
create type public.activity_type as enum ('Call','Meeting','Site Visit','Follow-up','Inspection','Email');
create type public.activity_status as enum ('pending','in_progress','done','cancelled');
create type public.quotation_status as enum ('draft','pending_approval','sent','negotiating','accepted','rejected');
create type public.project_status as enum ('On Track','At Risk','Delayed','Completed','On Hold');
create type public.attendance_status as enum ('present','late','absent','leave');
create type public.notification_type as enum ('lead','chat','activity','attendance','quotation','project','system');
create type public.history_module as enum ('lead','pipeline','project','employee','activity','settings','quotation','attendance');

-- Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
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

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_idx on public.user_roles(user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.current_role_of(_user_id uuid)
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = _user_id
  order by case role when 'admin' then 1 when 'manager' then 2 when 'finance' then 3 when 'hr' then 4 when 'employee' then 5 end
  limit 1;
$$;

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name_en text not null, name_ar text,
  industry_en text, industry_ar text,
  contact_name_en text, contact_name_ar text,
  email text, phone text,
  city_en text, city_ar text,
  district_en text, district_ar text,
  street_en text, street_ar text,
  lat numeric(9,6), lng numeric(9,6),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_name_en_trgm on public.clients using gin (name_en gin_trgm_ops);
create index clients_name_ar_trgm on public.clients using gin (name_ar gin_trgm_ops);

-- Leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  client_id uuid references public.clients(id) on delete set null,
  company_en text not null, company_ar text,
  contact_name_en text, contact_name_ar text,
  email text, phone text,
  source_en text, source_ar text,
  industry_en text, industry_ar text,
  status public.lead_status not null default 'new',
  owner_id uuid references public.profiles(id) on delete set null,
  value numeric(14,2) default 0,
  probability int check (probability between 0 and 100) default 0,
  expected_close_date date,
  city_en text, city_ar text,
  district_en text, district_ar text,
  street_en text, street_ar text,
  lat numeric(9,6), lng numeric(9,6),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_status_idx on public.leads(status);
create index leads_owner_idx on public.leads(owner_id);
create index leads_company_trgm on public.leads using gin (company_en gin_trgm_ops);

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  text_en text, text_ar text,
  created_at timestamptz not null default now()
);
create index lead_notes_lead_idx on public.lead_notes(lead_id);

-- Activities
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  type public.activity_type not null,
  title_en text not null, title_ar text,
  notes_en text, notes_ar text,
  lead_id uuid references public.leads(id) on delete set null,
  project_id uuid,
  owner_id uuid references public.profiles(id) on delete set null,
  due_date date not null,
  time time,
  status public.activity_status not null default 'pending',
  est_minutes int default 60,
  presales_team uuid[] default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activities_owner_idx on public.activities(owner_id);
create index activities_due_idx on public.activities(due_date);
create index activities_lead_idx on public.activities(lead_id);

-- Projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name_en text not null, name_ar text,
  description_en text, description_ar text,
  client_id uuid references public.clients(id) on delete set null,
  category_en text, category_ar text,
  status public.project_status not null default 'On Track',
  progress int check (progress between 0 and 100) default 0,
  budget numeric(14,2) default 0,
  offered_value numeric(14,2) default 0,
  competitors text[] default '{}',
  project_type_en text, project_type_ar text,
  city_en text, city_ar text,
  district_en text, district_ar text,
  street_en text, street_ar text,
  manager_id uuid references public.profiles(id) on delete set null,
  start_date date, end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_en text default 'Member', role_ar text,
  added_at timestamptz not null default now(),
  unique(project_id, profile_id)
);
create index project_members_profile_idx on public.project_members(profile_id);
create index project_members_project_idx on public.project_members(project_id);

alter table public.activities
  add constraint activities_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;

-- Quotations
create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  lead_id uuid references public.leads(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  title_en text not null, title_ar text,
  description_en text, description_ar text,
  submission_date date not null default current_date,
  valid_until date,
  value numeric(14,2) not null default 0,
  currency text not null default 'SAR',
  status public.quotation_status not null default 'draft',
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotations_status_idx on public.quotations(status);
create index quotations_lead_idx on public.quotations(lead_id);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  name_en text not null, name_ar text,
  description_en text, description_ar text,
  qty numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) generated always as (qty * unit_price) stored,
  sort_order int default 0
);
create index quotation_items_q_idx on public.quotation_items(quotation_id);

-- Attendance
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  check_in time, check_out time,
  hours numeric(5,2) generated always as (
    case when check_in is not null and check_out is not null
      then extract(epoch from (check_out - check_in))/3600.0
      else 0 end
  ) stored,
  status public.attendance_status not null default 'present',
  location_en text, location_ar text,
  lat numeric(9,6), lng numeric(9,6),
  created_at timestamptz not null default now(),
  unique(profile_id, date)
);
create index attendance_date_idx on public.attendance(date);
create index attendance_profile_idx on public.attendance(profile_id);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type public.notification_type not null,
  title_en text not null, title_ar text,
  body_en text, body_ar text,
  href text,
  audience uuid[] default '{}',
  audience_roles public.app_role[] default '{}',
  unread_by uuid[] default '{}',
  created_by uuid,
  created_at timestamptz not null default now()
);
create index notifications_created_idx on public.notifications(created_at desc);

-- History
create table public.history (
  id uuid primary key default gen_random_uuid(),
  module public.history_module not null,
  action_en text not null, action_ar text,
  actor_id uuid references public.profiles(id) on delete set null,
  target_en text, target_ar text,
  target_table text, target_id uuid,
  details_en text, details_ar text,
  created_at timestamptz not null default now()
);
create index history_module_idx on public.history(module);
create index history_created_idx on public.history(created_at desc);

-- Attachments
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  parent_table text not null check (parent_table in ('lead','project','quotation','activity')),
  parent_id uuid not null,
  name_en text not null, name_ar text,
  storage_path text not null,
  mime text, size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
create index attachments_parent_idx on public.attachments(parent_table, parent_id);

-- Settings tables
create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label_en text not null, label_ar text,
  color text not null default '#64748b',
  sort_order int not null default 0
);

create table public.activity_types_config (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label_en text not null, label_ar text
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  city_en text not null, city_ar text,
  districts_en text[] default '{}',
  districts_ar text[] default '{}',
  unique(city_en)
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  name_en text not null, name_ar text,
  trigger_en text not null, trigger_ar text,
  action_en text not null, action_ar text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  name_en text not null, name_ar text,
  channel text not null check (channel in ('Email','SMS','WhatsApp','Push')),
  subject_en text, subject_ar text,
  body_en text not null, body_ar text
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  page text not null,
  can_create boolean default false,
  can_read   boolean default true,
  can_update boolean default false,
  can_delete boolean default false,
  unique(role, page)
);

-- Helper functions / triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_project_member(_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members pm
    join public.profiles p on p.id = pm.profile_id
    where pm.project_id = _project_id and p.user_id = auth.uid()
  );
$$;

create or replace function public.t(_en text, _ar text, _lang text default 'en')
returns text language sql immutable as $$
  select case when _lang = 'ar' then coalesce(nullif(_ar,''), _en)
              else coalesce(nullif(_en,''), _ar) end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name_en, email)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'employee')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

do $$
declare t text;
begin
  for t in select unnest(array['profiles','clients','leads','activities','projects','quotations']) loop
    execute format($f$
      drop trigger if exists trg_%1$s_updated_at on public.%1$s;
      create trigger trg_%1$s_updated_at before update on public.%1$s
      for each row execute function public.set_updated_at();
    $f$, t);
  end loop;
end $$;

create or replace function public.on_lead_won()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_qid uuid;
begin
  if new.status = 'won' and (old.status is distinct from 'won') then
    insert into public.quotations (code, lead_id, client_id, title_en, title_ar, value, status, created_by)
    values (
      'Q-' || to_char(now(), 'YYYYMMDDHH24MISS'),
      new.id, new.client_id,
      coalesce(new.company_en,'Quotation') || ' — Draft',
      coalesce(new.company_ar, new.company_en) || ' — مسودة',
      coalesce(new.value, 0), 'draft', auth.uid()
    ) returning id into new_qid;

    insert into public.history (module, action_en, action_ar, actor_id, target_table, target_id, details_en, details_ar)
    values ('lead','Lead won — quotation draft created','تم كسب الفرصة — تم إنشاء مسودة عرض سعر',
      public.current_profile_id(),'leads', new.id,
      'Auto-generated quotation ' || new_qid::text,
      'تم إنشاء عرض السعر تلقائيًا ' || new_qid::text);

    insert into public.notifications (type, title_en, title_ar, body_en, body_ar, href, audience_roles, created_by)
    values ('quotation','New quotation draft','مسودة عرض سعر جديدة',
      'Lead ' || coalesce(new.company_en,'') || ' was won — draft quotation created.',
      'تم كسب الفرصة ' || coalesce(new.company_ar, new.company_en, '') || ' — تم إنشاء مسودة عرض السعر.',
      '/admin/offers/' || new_qid::text,
      array['admin','finance','manager']::public.app_role[],
      auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lead_won on public.leads;
create trigger trg_lead_won after update of status on public.leads
for each row execute function public.on_lead_won();

create or replace function public.guard_employee_lead_project()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.has_role(auth.uid(),'employee')
     and not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')) then
    if tg_op = 'INSERT' and exists (
      select 1 from public.activities a where a.lead_id = new.id and a.project_id is not null
    ) then
      raise exception 'Employees cannot link leads to projects';
    end if;
  end if;
  return new;
end;
$$;

-- RLS
alter table public.profiles enable row level security;
create policy "profiles: read all authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles: self update" on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles: admin/hr full" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'hr'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'hr'));

alter table public.user_roles enable row level security;
create policy "roles: read self or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "roles: admin manage" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

alter table public.clients enable row level security;
create policy "clients: read authenticated" on public.clients for select to authenticated using (true);
create policy "clients: write" on public.clients for insert to authenticated with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'employee')
);
create policy "clients: update am" on public.clients for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));
create policy "clients: delete admin" on public.clients for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

alter table public.leads enable row level security;
create policy "leads: read" on public.leads for select to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'finance')
  or owner_id = public.current_profile_id() or created_by = auth.uid()
);
create policy "leads: insert" on public.leads for insert to authenticated with check (created_by = auth.uid());
create policy "leads: update" on public.leads for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or owner_id = public.current_profile_id()
);
create policy "leads: delete" on public.leads for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

alter table public.lead_notes enable row level security;
create policy "lead_notes: read via lead" on public.lead_notes for select to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_id));
create policy "lead_notes: insert author" on public.lead_notes for insert to authenticated
  with check (author_id = public.current_profile_id());

alter table public.activities enable row level security;
create policy "activities: read" on public.activities for select to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
  or owner_id = public.current_profile_id() or public.current_profile_id() = any (presales_team)
);
create policy "activities: insert" on public.activities for insert to authenticated with check (created_by = auth.uid());
create policy "activities: update" on public.activities for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or owner_id = public.current_profile_id()
);
create policy "activities: delete" on public.activities for delete to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

alter table public.projects enable row level security;
create policy "projects: read" on public.projects for select to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'finance')
  or public.is_project_member(id)
);
create policy "projects: write" on public.projects for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

alter table public.project_members enable row level security;
create policy "project_members: read" on public.project_members for select to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or profile_id = public.current_profile_id()
);
create policy "project_members: write" on public.project_members for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

alter table public.quotations enable row level security;
create policy "quotations: read" on public.quotations for select to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'finance')
  or created_by = auth.uid()
);
create policy "quotations: insert" on public.quotations for insert to authenticated with check (created_by = auth.uid());
create policy "quotations: update" on public.quotations for update to authenticated using (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'finance')
);
create policy "quotations: delete" on public.quotations for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

alter table public.quotation_items enable row level security;
create policy "quotation_items: via parent" on public.quotation_items for all to authenticated
  using (exists (select 1 from public.quotations q where q.id = quotation_id))
  with check (exists (select 1 from public.quotations q where q.id = quotation_id));

alter table public.attendance enable row level security;
create policy "attendance: read" on public.attendance for select to authenticated using (
  profile_id = public.current_profile_id() or public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'hr') or public.has_role(auth.uid(),'manager')
);
create policy "attendance: insert self" on public.attendance for insert to authenticated
  with check (profile_id = public.current_profile_id());
create policy "attendance: update" on public.attendance for update to authenticated using (
  profile_id = public.current_profile_id() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'hr')
);

alter table public.notifications enable row level security;
create policy "notifications: read" on public.notifications for select to authenticated using (
  (audience = '{}' and audience_roles = '{}')
  or public.current_profile_id() = any (audience)
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = any (audience_roles))
);
create policy "notifications: insert" on public.notifications for insert to authenticated with check (
  public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
);
create policy "notifications: update self" on public.notifications for update to authenticated
  using (public.current_profile_id() = any (unread_by));

alter table public.history enable row level security;
create policy "history: read" on public.history for select to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));
create policy "history: insert" on public.history for insert to authenticated with check (true);

alter table public.attachments enable row level security;
create policy "attachments: read" on public.attachments for select to authenticated using (true);
create policy "attachments: insert" on public.attachments for insert to authenticated with check (uploaded_by = auth.uid());
create policy "attachments: delete" on public.attachments for delete to authenticated
  using (uploaded_by = auth.uid() or public.has_role(auth.uid(),'admin'));

do $$
declare t text;
begin
  for t in select unnest(array['pipeline_stages','activity_types_config','locations','automation_rules','notification_templates','role_permissions']) loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$
      create policy "%1$s: read" on public.%1$s for select to authenticated using (true);
      create policy "%1$s: admin write" on public.%1$s for all to authenticated
        using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
    $p$, t);
  end loop;
end $$;