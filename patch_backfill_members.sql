-- Backfill script to add missing project members for already approved requests
insert into public.project_members (project_id, profile_id)
select created_project_id, requested_by
from public.project_requests
where status = 'approved' 
  and created_project_id is not null
  and requested_by is not null
on conflict do nothing;
