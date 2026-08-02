drop policy if exists "activities: delete admin/manager" on public.activities;

create policy "activities: delete admin/manager/owner_pending"
on public.activities for delete to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'manager')
  or (owner_id = public.current_profile_id() and status = 'pending')
);
