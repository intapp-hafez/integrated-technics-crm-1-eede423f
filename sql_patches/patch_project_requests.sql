-- 1. Ensure reject_project_request correctly assigns profiles.id
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

  -- Ensure we fetch the actual profile id, bypassing any potential issues with current_profile_id
  select id into caller_profile from public.profiles where user_id = auth.uid() limit 1;
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

-- 2. Add review_project_request RPC to allow admins to request changes without rejecting
create or replace function public.review_project_request(_id uuid, _note text default null)
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

  select id into caller_profile from public.profiles where user_id = auth.uid() limit 1;
  is_admin := public.has_role(auth.uid(),'admin');
  
  if not is_admin then
    if not exists (
      select 1 from public.profiles p where p.id = r.requested_by and p.manager_id = caller_profile
    ) then
      raise exception 'Only the requester''s manager or an admin can review';
    end if;
  end if;

  -- Just update the note but keep it pending
  update public.project_requests
    set decision_note=_note, updated_at=now()
    where id = r.id;
end;
$$;

-- Grant execute permissions
grant execute on function public.reject_project_request(uuid, text) to authenticated;
grant execute on function public.review_project_request(uuid, text) to authenticated;

-- 3. Add RLS policy to allow the creator to update their own pending request
create policy "pr_update_own" on public.project_requests
  for update to authenticated
  using (
    requested_by = (select id from public.profiles where user_id = auth.uid() limit 1)
    and status = 'pending'
  )
  with check (
    requested_by = (select id from public.profiles where user_id = auth.uid() limit 1)
    and status = 'pending'
  );
