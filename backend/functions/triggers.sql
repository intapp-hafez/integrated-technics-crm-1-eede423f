-- Auto-create profile + default 'employee' role when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name_en, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
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

-- updated_at triggers
do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','clients','leads','activities','projects',
    'quotations'
  ]) loop
    execute format($f$
      drop trigger if exists trg_%1$s_updated_at on public.%1$s;
      create trigger trg_%1$s_updated_at
      before update on public.%1$s
      for each row execute function public.set_updated_at();
    $f$, t);
  end loop;
end $$;

-- When a lead transitions to 'won', auto-create a draft quotation and a history entry.
create or replace function public.on_lead_won()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_qid uuid;
begin
  if new.status = 'won' and (old.status is distinct from 'won') then
    insert into public.quotations (
      code, lead_id, client_id, title_en, title_ar,
      value, status, created_by
    ) values (
      'Q-' || to_char(now(), 'YYYYMMDDHH24MISS'),
      new.id, new.client_id,
      coalesce(new.company_en,'Quotation') || ' — Draft',
      coalesce(new.company_ar, new.company_en) || ' — مسودة',
      coalesce(new.value, 0),
      'draft',
      auth.uid()
    )
    returning id into new_qid;

    insert into public.history (module, action_en, action_ar, actor_id, target_table, target_id, details_en, details_ar)
    values (
      'lead',
      'Lead won — quotation draft created',
      'تم كسب الفرصة — تم إنشاء مسودة عرض سعر',
      public.current_profile_id(),
      'leads', new.id,
      'Auto-generated quotation ' || new_qid::text,
      'تم إنشاء عرض السعر تلقائيًا ' || new_qid::text
    );

    insert into public.notifications (type, title_en, title_ar, body_en, body_ar, href, audience_roles, created_by)
    values (
      'quotation',
      'New quotation draft',
      'مسودة عرض سعر جديدة',
      'Lead ' || coalesce(new.company_en,'') || ' was won — draft quotation created.',
      'تم كسب الفرصة ' || coalesce(new.company_ar, new.company_en, '') || ' — تم إنشاء مسودة عرض السعر.',
      '/admin/offers/' || new_qid::text,
      array['admin','finance','manager']::public.app_role[],
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lead_won on public.leads;
create trigger trg_lead_won
after update of status on public.leads
for each row execute function public.on_lead_won();

-- Block employees from setting project_id on lead inserts (defense in depth — UI already enforces)
create or replace function public.guard_employee_lead_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.has_role(auth.uid(), 'employee')
     and not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'))
  then
    -- Employees cannot link a lead to a project at creation time
    if tg_op = 'INSERT' and exists (
      select 1 from public.activities a where a.lead_id = new.id and a.project_id is not null
    ) then
      raise exception 'Employees cannot link leads to projects';
    end if;
  end if;
  return new;
end;
$$;
