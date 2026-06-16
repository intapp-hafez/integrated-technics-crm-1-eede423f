
-- 1) Storage policies for activity-attachments bucket
drop policy if exists "activity-attachments read" on storage.objects;
drop policy if exists "activity-attachments upload" on storage.objects;

create policy "activity-attachments read scoped"
on storage.objects for select to authenticated
using (
  bucket_id = 'activity-attachments'
  and (
    owner = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'manager'::public.app_role)
    or exists (
      select 1 from public.activities a
      where a.id::text = (storage.foldername(name))[1]
        and (
          a.created_by = auth.uid()
          or a.owner_id = public.current_profile_id()
          or public.current_profile_id() = any (coalesce(a.presales_team, '{}'::uuid[]))
        )
    )
  )
);

create policy "activity-attachments upload scoped"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'activity-attachments'
  and owner = auth.uid()
  and exists (
    select 1 from public.activities a
    where a.id::text = (storage.foldername(name))[1]
      and (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        or public.has_role(auth.uid(), 'manager'::public.app_role)
        or a.created_by = auth.uid()
        or a.owner_id = public.current_profile_id()
        or public.current_profile_id() = any (coalesce(a.presales_team, '{}'::uuid[]))
      )
  )
);

-- 2) Attachments insert policies: drop broad + replace scoped with all-parent coverage
drop policy if exists "attachments: insert" on public.attachments;
drop policy if exists "attachments: insert activity scoped" on public.attachments;

create policy "attachments: insert scoped"
on public.attachments for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'manager'::public.app_role)
    or (
      parent_table = 'activity' and exists (
        select 1 from public.activities a
        where a.id = parent_id
          and (
            a.created_by = auth.uid()
            or a.owner_id = public.current_profile_id()
            or public.current_profile_id() = any (coalesce(a.presales_team, '{}'::uuid[]))
          )
      )
    )
    or (
      parent_table = 'lead' and exists (
        select 1 from public.leads l
        where l.id = parent_id
          and (l.created_by = auth.uid() or l.owner_id = public.current_profile_id()
               or public.has_role(auth.uid(), 'finance'::public.app_role))
      )
    )
    or (
      parent_table = 'project' and exists (
        select 1 from public.projects p
        where p.id = parent_id
          and (public.is_project_member(p.id)
               or public.has_role(auth.uid(), 'finance'::public.app_role))
      )
    )
    or (
      parent_table = 'quotation' and exists (
        select 1 from public.quotations q
        where q.id = parent_id
          and (q.created_by = auth.uid()
               or public.has_role(auth.uid(), 'finance'::public.app_role))
      )
    )
    or (
      parent_table = 'client' and (
        public.has_role(auth.uid(), 'employee'::public.app_role)
        or public.has_role(auth.uid(), 'finance'::public.app_role)
      )
    )
  )
);

-- 3) history: require actor_id to match current profile (no NULL bypass)
drop policy if exists "history: insert scoped" on public.history;
drop policy if exists "history: insert authenticated" on public.history;

create policy "history: insert scoped"
on public.history for insert to authenticated
with check (
  actor_id = public.current_profile_id()
  or public.has_role(auth.uid(), 'admin'::public.app_role)
);
