
-- 1) Notify on new lead intake
create or replace function public.notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audience_ids uuid[] := '{}'::uuid[];
begin
  if new.owner_id is not null then
    audience_ids := array[new.owner_id];
  end if;

  insert into public.notifications (type, title_en, title_ar, body_en, body_ar, href, audience, audience_roles, unread_by, created_by)
  values (
    'lead',
    'New lead: ' || coalesce(new.company_en, new.contact_name_en, 'Untitled'),
    'عميل محتمل جديد: ' || coalesce(new.company_ar, new.company_en, new.contact_name_en, 'بدون اسم'),
    coalesce(new.source_en, 'New lead intake'),
    coalesce(new.source_ar, new.source_en, 'عميل محتمل جديد'),
    '/admin/leads/' || new.id::text,
    audience_ids,
    array['admin','manager']::public.app_role[],
    audience_ids,
    auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists trg_lead_intake_notify on public.leads;
create trigger trg_lead_intake_notify
after insert on public.leads
for each row execute function public.notify_new_lead();

-- 2) Notify on activity creation (reminder to owner + admins)
create or replace function public.notify_new_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audience_ids uuid[] := '{}'::uuid[];
  when_label text;
begin
  if new.owner_id is not null then
    audience_ids := array[new.owner_id];
  end if;

  when_label := coalesce(to_char(new.due_date, 'YYYY-MM-DD'), 'soon');

  insert into public.notifications (type, title_en, title_ar, body_en, body_ar, href, audience, audience_roles, unread_by, created_by)
  values (
    'activity',
    'Activity scheduled: ' || coalesce(new.title_en, 'Untitled'),
    'نشاط مجدول: ' || coalesce(new.title_ar, new.title_en, 'بدون عنوان'),
    'Due ' || when_label,
    'مستحق ' || when_label,
    '/admin/activities/' || new.id::text,
    audience_ids,
    array['admin','manager']::public.app_role[],
    audience_ids,
    auth.uid()
  );
  return new;
end;
$$;

drop trigger if exists trg_activity_created_notify on public.activities;
create trigger trg_activity_created_notify
after insert on public.activities
for each row execute function public.notify_new_activity();

-- 3) Daily scan: overdue follow-ups + activity reminders for today/tomorrow
create or replace function public.run_notification_scans()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  last_act_at timestamptz;
  href text;
begin
  -- Overdue follow-ups: leads in active stages with no activity in 14+ days
  for r in
    select l.id, l.company_en, l.company_ar, l.owner_id
    from public.leads l
    where l.status not in ('won','lost')
  loop
    select max(a.created_at) into last_act_at from public.activities a where a.lead_id = r.id;
    if last_act_at is null or last_act_at < now() - interval '14 days' then
      href := '/admin/leads/' || r.id::text;
      -- dedupe: skip if a similar notification was created in last 24h
      if not exists (
        select 1 from public.notifications n
        where n.href = href and n.type = 'lead'
          and n.title_en like 'Overdue follow-up%'
          and n.created_at > now() - interval '24 hours'
      ) then
        insert into public.notifications (type, title_en, title_ar, body_en, body_ar, href, audience, audience_roles, unread_by, created_by)
        values (
          'lead',
          'Overdue follow-up: ' || coalesce(r.company_en, 'Lead'),
          'متابعة متأخرة: ' || coalesce(r.company_ar, r.company_en, 'عميل محتمل'),
          'No activity logged in 14+ days.',
          'لم يتم تسجيل أي نشاط منذ 14 يومًا أو أكثر.',
          href,
          case when r.owner_id is not null then array[r.owner_id] else '{}'::uuid[] end,
          array['admin','manager']::public.app_role[],
          case when r.owner_id is not null then array[r.owner_id] else '{}'::uuid[] end,
          null
        );
      end if;
    end if;
  end loop;

  -- Activity reminders: pending activities due today or tomorrow
  for r in
    select a.id, a.title_en, a.title_ar, a.owner_id, a.due_date
    from public.activities a
    where a.status = 'pending'
      and a.due_date between current_date and current_date + interval '1 day'
  loop
    href := '/admin/activities/' || r.id::text;
    if not exists (
      select 1 from public.notifications n
      where n.href = href and n.type = 'activity'
        and n.title_en like 'Reminder%'
        and n.created_at > now() - interval '24 hours'
    ) then
      insert into public.notifications (type, title_en, title_ar, body_en, body_ar, href, audience, audience_roles, unread_by, created_by)
      values (
        'activity',
        'Reminder: ' || coalesce(r.title_en, 'Activity due'),
        'تذكير: ' || coalesce(r.title_ar, r.title_en, 'نشاط مستحق'),
        'Due ' || to_char(r.due_date, 'YYYY-MM-DD'),
        'مستحق ' || to_char(r.due_date, 'YYYY-MM-DD'),
        href,
        case when r.owner_id is not null then array[r.owner_id] else '{}'::uuid[] end,
        array['admin','manager']::public.app_role[],
        case when r.owner_id is not null then array[r.owner_id] else '{}'::uuid[] end,
        null
      );
    end if;
  end loop;
end;
$$;

grant execute on function public.run_notification_scans() to service_role;
