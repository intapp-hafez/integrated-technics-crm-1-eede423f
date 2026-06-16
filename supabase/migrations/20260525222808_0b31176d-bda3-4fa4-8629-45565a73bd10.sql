
-- 1) ATTACHMENTS: replace permissive read policy
drop policy if exists "attachments: read" on public.attachments;

create policy "attachments: read scoped"
on public.attachments
for select
to authenticated
using (
  uploaded_by = auth.uid()
  or public.has_role(auth.uid(), 'admin'::public.app_role)
  or (
    parent_table = 'leads' and exists (
      select 1 from public.leads l
      where l.id = attachments.parent_id
        and (
          public.has_role(auth.uid(),'admin'::public.app_role)
          or public.has_role(auth.uid(),'manager'::public.app_role)
          or public.has_role(auth.uid(),'finance'::public.app_role)
          or l.owner_id = public.current_profile_id()
          or l.created_by = auth.uid()
        )
    )
  )
  or (
    parent_table = 'projects' and exists (
      select 1 from public.projects p
      where p.id = attachments.parent_id
        and (
          public.has_role(auth.uid(),'admin'::public.app_role)
          or public.has_role(auth.uid(),'manager'::public.app_role)
          or public.has_role(auth.uid(),'finance'::public.app_role)
          or public.is_project_member(p.id)
        )
    )
  )
  or (
    parent_table = 'quotations' and exists (
      select 1 from public.quotations q
      where q.id = attachments.parent_id
        and (
          public.has_role(auth.uid(),'admin'::public.app_role)
          or public.has_role(auth.uid(),'manager'::public.app_role)
          or public.has_role(auth.uid(),'finance'::public.app_role)
          or q.created_by = auth.uid()
        )
    )
  )
  or (
    parent_table = 'clients' and exists (
      select 1 from public.clients c where c.id = attachments.parent_id
    )
    and (
      public.has_role(auth.uid(),'admin'::public.app_role)
      or public.has_role(auth.uid(),'manager'::public.app_role)
      or public.has_role(auth.uid(),'finance'::public.app_role)
      or public.has_role(auth.uid(),'employee'::public.app_role)
    )
  )
);

-- 2) LEAD NOTES: tighten read
drop policy if exists "lead_notes: read via lead" on public.lead_notes;

create policy "lead_notes: read scoped"
on public.lead_notes
for select
to authenticated
using (
  exists (
    select 1 from public.leads l
    where l.id = lead_notes.lead_id
      and (
        public.has_role(auth.uid(),'admin'::public.app_role)
        or public.has_role(auth.uid(),'manager'::public.app_role)
        or public.has_role(auth.uid(),'finance'::public.app_role)
        or l.owner_id = public.current_profile_id()
        or l.created_by = auth.uid()
      )
  )
);

-- 3) QUOTATION ITEMS: split into read/write and check parent access
drop policy if exists "quotation_items: via parent" on public.quotation_items;

create policy "quotation_items: read"
on public.quotation_items
for select
to authenticated
using (
  exists (
    select 1 from public.quotations q
    where q.id = quotation_items.quotation_id
      and (
        public.has_role(auth.uid(),'admin'::public.app_role)
        or public.has_role(auth.uid(),'manager'::public.app_role)
        or public.has_role(auth.uid(),'finance'::public.app_role)
        or q.created_by = auth.uid()
      )
  )
);

create policy "quotation_items: write"
on public.quotation_items
for all
to authenticated
using (
  exists (
    select 1 from public.quotations q
    where q.id = quotation_items.quotation_id
      and (
        public.has_role(auth.uid(),'admin'::public.app_role)
        or public.has_role(auth.uid(),'manager'::public.app_role)
        or public.has_role(auth.uid(),'finance'::public.app_role)
      )
  )
)
with check (
  exists (
    select 1 from public.quotations q
    where q.id = quotation_items.quotation_id
      and (
        public.has_role(auth.uid(),'admin'::public.app_role)
        or public.has_role(auth.uid(),'manager'::public.app_role)
        or public.has_role(auth.uid(),'finance'::public.app_role)
      )
  )
);

-- 4) HISTORY: restrict client inserts to rows tied to the current user
drop policy if exists "history: insert" on public.history;

create policy "history: insert scoped"
on public.history
for insert
to authenticated
with check (
  actor_id is null
  or actor_id = public.current_profile_id()
  or public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 5) set_updated_at: fix mutable search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin new.updated_at = now(); return new; end;
$$;

-- 6) Revoke execute on sensitive SECURITY DEFINER functions from anon/public
revoke execute on function public.admin_users_list() from anon, public;
revoke execute on function public.admin_assign_role(uuid, public.app_role) from anon, public;
revoke execute on function public.admin_remove_role(uuid, public.app_role) from anon, public;
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.current_profile_id() from anon, public;
revoke execute on function public.current_role_of(uuid) from anon, public;
revoke execute on function public.roles_of(uuid) from anon, public;
revoke execute on function public.is_project_member(uuid) from anon, public;

grant execute on function public.admin_users_list() to authenticated;
grant execute on function public.admin_assign_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_remove_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_role_of(uuid) to authenticated;
grant execute on function public.roles_of(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
