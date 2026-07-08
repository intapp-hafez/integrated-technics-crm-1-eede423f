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

  norm_email := lower(trim(coalesce(r.email, '')));
  norm_phone := regexp_replace(coalesce(r.phone,''), '\D', '', 'g');

  -- Duplicate checks (only Email and Phone as requested)
  if exists (
    select 1 from public.project_requests
    where id <> r.id and status = 'pending'
      and (
        (norm_email <> '' and lower(trim(coalesce(email, ''))) = norm_email)
        or (norm_phone <> '' and regexp_replace(coalesce(phone,''),'\D','','g') = norm_phone)
      )
  ) then
    raise exception 'Duplicate: another pending request matches email or phone';
  end if;
  if exists (
    select 1 from public.clients
    where (norm_email <> '' and lower(trim(coalesce(email,''))) = norm_email)
       or (norm_phone <> '' and regexp_replace(coalesce(phone,''),'\D','','g') = norm_phone)
  ) then
    raise exception 'Duplicate: an existing client matches email or phone';
  end if;

  -- Ensure client exists or create new
  select id into new_client from public.clients
  where (norm_email <> '' and lower(trim(coalesce(email,''))) = norm_email)
     or (norm_phone <> '' and regexp_replace(coalesce(phone,''),'\D','','g') = norm_phone)
  limit 1;

  if new_client is null then
    insert into public.clients (name_en, contact_name_en, email, phone)
    values (r.client_name_en, r.contact_name_en, r.email, r.phone)
    returning id into new_client;
  end if;

  -- Create Project
  insert into public.projects (
    name_en, name_ar, description_en, category_en, category_ar,
    project_type_en, project_type_ar, city_en, city_ar,
    district_en, district_ar, street_en, street_ar,
    budget, offered_value, start_date, end_date,
    competitors, client_id, client_name, client_email, client_phone,
    status, progress, account_type, other_account_type,
    extra_contacts, manager_id
  ) values (
    r.name_en, r.name_ar, r.description_en, r.category_en, r.category_ar,
    r.project_type_en, r.project_type_ar, r.city_en, r.city_ar,
    r.district_en, r.district_ar, r.street_en, r.street_ar,
    r.budget, r.offered_value, r.start_date, r.end_date,
    r.competitors, new_client, r.client_name_en, r.email, r.phone,
    'On Track', 0, r.account_type, r.other_account_type,
    r.extra_contacts, caller_profile
  ) returning id into new_project;

  update public.project_requests
  set status = 'approved',
      decision_note = _note,
      decided_by = caller_profile,
      decided_at = now(),
      created_project_id = new_project,
      created_client_id = new_client
  where id = _id;

  -- Automatically add the requester as a team member so they can see their requested project
  if r.requested_by is not null then
    insert into public.project_members (project_id, profile_id)
    values (new_project, r.requested_by)
    on conflict do nothing;
  end if;

  return new_project;
end;
$$;
