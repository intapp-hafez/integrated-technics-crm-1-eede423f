
-- Project requests submitted by employees, approved by their manager or admin
create table if not exists public.project_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  -- project details
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  category_en text,
  category_ar text,
  project_type_en text,
  project_type_ar text,
  city_en text,
  city_ar text,
  district_en text,
  district_ar text,
  street_en text,
  street_ar text,
  budget numeric(14,2) default 0,
  offered_value numeric(14,2) default 0,
  start_date date,
  end_date date,
  competitors text[] default '{}',
  -- client / contact (used for dedup)
  client_name_en text not null,
  client_name_ar text,
  contact_name_en text not null,
  contact_name_ar text,
  email text not null,
  phone text not null,
  -- workflow
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decision_note text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_project_id uuid references public.projects(id) on delete set null,
  created_client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.project_requests to authenticated;
grant all on public.project_requests to service_role;

alter table public.project_requests enable row level security;

-- Employees: insert their own; select their own
create policy "pr_insert_own" on public.project_requests
  for insert to authenticated
  with check (requested_by = public.current_profile_id());

create policy "pr_select_own_or_priv" on public.project_requests
  for select to authenticated
  using (
    requested_by = public.current_profile_id()
    or public.has_role(auth.uid(),'admin')
    or exists (
      select 1 from public.profiles p
      where p.id = project_requests.requested_by
        and p.manager_id = public.current_profile_id()
    )
  );

create policy "pr_update_priv" on public.project_requests
  for update to authenticated
  using (
    public.has_role(auth.uid(),'admin')
    or exists (
      select 1 from public.profiles p
      where p.id = project_requests.requested_by
        and p.manager_id = public.current_profile_id()
    )
  );

create trigger trg_pr_updated_at before update on public.project_requests
  for each row execute function public.set_updated_at();

-- Approval RPC with dedup checks
create or replace function public.approve_project_request(_id uuid, _note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.project_requests%rowtype;
  caller_profile uuid;
  is_admin boolean;
  norm_email text;
  norm_phone text;
  norm_name text;
  norm_contact text;
  new_client uuid;
  new_project uuid;
begin
  select * into r from public.project_requests where id = _id for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'Request already %', r.status; end if;

  caller_profile := public.current_profile_id();
  is_admin := public.has_role(auth.uid(),'admin');

  if not is_admin then
    if not exists (
      select 1 from public.profiles p
      where p.id = r.requested_by and p.manager_id = caller_profile
    ) then
      raise exception 'Only the requester''s manager or an admin can approve';
    end if;
  end if;

  norm_email := lower(trim(r.email));
  norm_phone := regexp_replace(coalesce(r.phone,''), '\D', '', 'g');
  norm_name  := lower(trim(r.client_name_en));
  norm_contact := lower(trim(r.contact_name_en));

  -- Duplicate checks
  if exists (select 1 from public.projects where lower(trim(name_en)) = lower(trim(r.name_en))) then
    raise exception 'Duplicate: a project with this name already exists';
  end if;
  if exists (
    select 1 from public.project_requests
    where id <> r.id and status = 'pending'
      and (
        lower(trim(name_en)) = lower(trim(r.name_en))
        or lower(trim(email)) = norm_email
        or regexp_replace(coalesce(phone,''),'\D','','g') = norm_phone
        or lower(trim(contact_name_en)) = norm_contact
        or lower(trim(client_name_en)) = norm_name
      )
  ) then
    raise exception 'Duplicate: another pending request matches name/email/phone/contact';
  end if;
  if exists (
    select 1 from public.clients
    where lower(trim(coalesce(email,''))) = norm_email and norm_email <> ''
       or regexp_replace(coalesce(phone,''),'\D','','g') = norm_phone and norm_phone <> ''
       or lower(trim(coalesce(contact_name_en,''))) = norm_contact and norm_contact <> ''
       or lower(trim(coalesce(name_en,''))) = norm_name
  ) then
    raise exception 'Duplicate: a client with the same name/email/phone/contact already exists';
  end if;
  if exists (
    select 1 from public.leads
    where lower(trim(coalesce(email,''))) = norm_email and norm_email <> ''
       or regexp_replace(coalesce(phone,''),'\D','','g') = norm_phone and norm_phone <> ''
       or lower(trim(coalesce(contact_name_en,''))) = norm_contact and norm_contact <> ''
       or lower(trim(coalesce(company_en,''))) = norm_name
  ) then
    raise exception 'Duplicate: a lead with the same company/email/phone/contact already exists';
  end if;

  -- Create client
  insert into public.clients (name_en, name_ar, contact_name_en, contact_name_ar, email, phone,
    city_en, city_ar, district_en, district_ar, street_en, street_ar)
  values (r.client_name_en, r.client_name_ar, r.contact_name_en, r.contact_name_ar, r.email, r.phone,
    r.city_en, r.city_ar, r.district_en, r.district_ar, r.street_en, r.street_ar)
  returning id into new_client;

  -- Create project
  insert into public.projects (name_en, name_ar, description_en, description_ar, client_id,
    category_en, category_ar, project_type_en, project_type_ar,
    city_en, city_ar, district_en, district_ar, street_en, street_ar,
    budget, offered_value, competitors, start_date, end_date, manager_id)
  values (r.name_en, r.name_ar, r.description_en, r.description_ar, new_client,
    r.category_en, r.category_ar, r.project_type_en, r.project_type_ar,
    r.city_en, r.city_ar, r.district_en, r.district_ar, r.street_en, r.street_ar,
    coalesce(r.budget,0), coalesce(r.offered_value,0), coalesce(r.competitors,'{}'),
    r.start_date, r.end_date, caller_profile)
  returning id into new_project;

  -- Add requester as project member
  insert into public.project_members (project_id, profile_id)
  values (new_project, r.requested_by)
  on conflict do nothing;

  update public.project_requests
    set status='approved', decision_note=_note, decided_by=caller_profile,
        decided_at=now(), created_client_id=new_client, created_project_id=new_project
    where id = r.id;

  return new_project;
end;
$$;

create or replace function public.reject_project_request(_id uuid, _note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.project_requests%rowtype;
  caller_profile uuid;
  is_admin boolean;
begin
  select * into r from public.project_requests where id = _id for update;
  if not found then raise exception 'Request not found'; end if;
  if r.status <> 'pending' then raise exception 'Request already %', r.status; end if;

  caller_profile := public.current_profile_id();
  is_admin := public.has_role(auth.uid(),'admin');
  if not is_admin then
    if not exists (
      select 1 from public.profiles p where p.id = r.requested_by and p.manager_id = caller_profile
    ) then
      raise exception 'Only the requester''s manager or an admin can reject';
    end if;
  end if;

  update public.project_requests
    set status='rejected', decision_note=_note, decided_by=caller_profile, decided_at=now()
    where id = r.id;
end;
$$;

grant execute on function public.approve_project_request(uuid, text) to authenticated;
grant execute on function public.reject_project_request(uuid, text) to authenticated;
