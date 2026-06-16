-- Generic updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Get current user's profile id from auth.uid()
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- True when the current user is a member of the project
create or replace function public.is_project_member(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    join public.profiles p on p.id = pm.profile_id
    where pm.project_id = _project_id
      and p.user_id = auth.uid()
  );
$$;

-- Bilingual fallback helper for SQL views
create or replace function public.t(_en text, _ar text, _lang text default 'en')
returns text
language sql
immutable
as $$
  select case
    when _lang = 'ar' then coalesce(nullif(_ar,''), _en)
    else coalesce(nullif(_en,''), _ar)
  end;
$$;
