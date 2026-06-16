-- Enable RLS on every public table and add role-scoped policies.
-- Uses has_role() and is_project_member() to avoid recursion.

-- Helper macro pattern: admin/manager can do everything; others are scoped.

------------------------------------------------------------
-- profiles
------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: read all authenticated"
on public.profiles for select to authenticated using (true);

create policy "profiles: self update"
on public.profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "profiles: admin/hr full"
on public.profiles for all to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'hr'))
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'hr'));

------------------------------------------------------------
-- user_roles  (only admins manage; users can read their own)
------------------------------------------------------------
alter table public.user_roles enable row level security;

create policy "roles: read self or admin"
on public.user_roles for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "roles: admin manage"
on public.user_roles for all to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

------------------------------------------------------------
-- clients
------------------------------------------------------------
alter table public.clients enable row level security;

create policy "clients: read authenticated"
on public.clients for select to authenticated using (true);

create policy "clients: write admin/manager/employee"
on public.clients for insert to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'employee')
);

create policy "clients: update admin/manager"
on public.clients for update to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

create policy "clients: delete admin"
on public.clients for delete to authenticated
using (public.has_role(auth.uid(),'admin'));

------------------------------------------------------------
-- leads
------------------------------------------------------------
alter table public.leads enable row level security;

create policy "leads: read authenticated"
on public.leads for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'finance')
  or owner_id = public.current_profile_id()
  or created_by = auth.uid()
);

create policy "leads: insert any authenticated"
on public.leads for insert to authenticated
with check (
  created_by = auth.uid()
);

create policy "leads: update owner or manager/admin"
on public.leads for update to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or owner_id = public.current_profile_id()
);

create policy "leads: delete admin/manager"
on public.leads for delete to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

-- Lead notes — visible to anyone who can read the lead
alter table public.lead_notes enable row level security;
create policy "lead_notes: read via lead"
on public.lead_notes for select to authenticated
using (exists (select 1 from public.leads l where l.id = lead_id));
create policy "lead_notes: insert author"
on public.lead_notes for insert to authenticated
with check (author_id = public.current_profile_id());

------------------------------------------------------------
-- activities
------------------------------------------------------------
alter table public.activities enable row level security;

create policy "activities: read scoped"
on public.activities for select to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or owner_id = public.current_profile_id()
  or public.current_profile_id() = any (presales_team)
);

create policy "activities: insert authenticated"
on public.activities for insert to authenticated
with check (created_by = auth.uid());

create policy "activities: update owner/manager/admin"
on public.activities for update to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or owner_id = public.current_profile_id()
);

create policy "activities: delete admin/manager"
on public.activities for delete to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

------------------------------------------------------------
-- projects
------------------------------------------------------------
alter table public.projects enable row level security;

-- Employees see ONLY projects they are members of. Others see all.
create policy "projects: read"
on public.projects for select to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'finance')
  or public.is_project_member(id)
);

create policy "projects: write admin/manager"
on public.projects for all to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'))
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

alter table public.project_members enable row level security;
create policy "project_members: read"
on public.project_members for select to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or profile_id = public.current_profile_id()
);
create policy "project_members: write admin/manager"
on public.project_members for all to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'))
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));

------------------------------------------------------------
-- quotations
------------------------------------------------------------
alter table public.quotations enable row level security;

create policy "quotations: read"
on public.quotations for select to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'finance')
  or created_by = auth.uid()
);

create policy "quotations: insert authenticated"
on public.quotations for insert to authenticated
with check (created_by = auth.uid());

create policy "quotations: update finance/admin/manager"
on public.quotations for update to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'finance')
);

create policy "quotations: delete admin"
on public.quotations for delete to authenticated
using (public.has_role(auth.uid(),'admin'));

alter table public.quotation_items enable row level security;
create policy "quotation_items: via parent"
on public.quotation_items for all to authenticated
using (exists (select 1 from public.quotations q where q.id = quotation_id))
with check (exists (select 1 from public.quotations q where q.id = quotation_id));

------------------------------------------------------------
-- attendance
------------------------------------------------------------
alter table public.attendance enable row level security;

create policy "attendance: read self or admin/hr/manager"
on public.attendance for select to authenticated
using (
  profile_id = public.current_profile_id()
  or public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'hr')
  or public.has_role(auth.uid(),'manager')
);

create policy "attendance: self check-in/out"
on public.attendance for insert to authenticated
with check (profile_id = public.current_profile_id());

create policy "attendance: self update or hr/admin"
on public.attendance for update to authenticated
using (
  profile_id = public.current_profile_id()
  or public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'hr')
);

------------------------------------------------------------
-- notifications
------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications: read if audience"
on public.notifications for select to authenticated
using (
  audience = '{}' and audience_roles = '{}'                    -- broadcast
  or public.current_profile_id() = any (audience)
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = any (audience_roles)
  )
);

create policy "notifications: insert admin/manager/system"
on public.notifications for insert to authenticated
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
);

create policy "notifications: update (mark read) self"
on public.notifications for update to authenticated
using (public.current_profile_id() = any (unread_by));

------------------------------------------------------------
-- history
------------------------------------------------------------
alter table public.history enable row level security;
create policy "history: read admin/manager"
on public.history for select to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager'));
create policy "history: insert authenticated"
on public.history for insert to authenticated with check (true);

------------------------------------------------------------
-- attachments
------------------------------------------------------------
alter table public.attachments enable row level security;
create policy "attachments: read authenticated"
on public.attachments for select to authenticated using (true);
create policy "attachments: insert authenticated"
on public.attachments for insert to authenticated with check (uploaded_by = auth.uid());
create policy "attachments: delete owner/admin"
on public.attachments for delete to authenticated
using (uploaded_by = auth.uid() or public.has_role(auth.uid(),'admin'));

------------------------------------------------------------
-- settings tables — admin write, all read
------------------------------------------------------------
do $$
declare t text;
begin
  for t in select unnest(array[
    'pipeline_stages','activity_types_config','locations',
    'automation_rules','notification_templates','role_permissions'
  ]) loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$
      create policy "%1$s: read authenticated"
      on public.%1$s for select to authenticated using (true);
      create policy "%1$s: admin write"
      on public.%1$s for all to authenticated
      using (public.has_role(auth.uid(),'admin'))
      with check (public.has_role(auth.uid(),'admin'));
    $p$, t);
  end loop;
end $$;
