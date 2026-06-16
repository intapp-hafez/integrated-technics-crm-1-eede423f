
create or replace function public.reject_project_request(_id uuid, _note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _req public.project_requests%rowtype;
  _is_admin boolean;
  _requester_manager uuid;
begin
  if _note is null or btrim(_note) = '' then
    raise exception 'A rejection reason is required.';
  end if;

  select * into _req from public.project_requests where id = _id for update;
  if not found then raise exception 'Request not found'; end if;
  if _req.status <> 'pending' then raise exception 'Request already %', _req.status; end if;

  select public.has_role(auth.uid(), 'admin') into _is_admin;
  select manager_id into _requester_manager from public.profiles where id = _req.requested_by;

  if not (_is_admin or _requester_manager = auth.uid()) then
    raise exception 'Not authorized to reject this request';
  end if;

  update public.project_requests
     set status = 'rejected',
         decision_note = btrim(_note),
         decided_by = auth.uid(),
         decided_at = now()
   where id = _id;
end;
$$;
