-- Profile field validation trigger (server-side guard for phone, email, location, manager_id)
create or replace function public.validate_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  email_re text := '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
  phone_re text := '^[0-9 +()\-]{6,25}$';
begin
  if new.email is null or length(trim(new.email)) = 0 then
    raise exception 'profiles.email is required';
  end if;
  if new.email !~ email_re then
    raise exception 'profiles.email is not a valid email address';
  end if;
  if new.phone is not null and length(trim(new.phone)) > 0 and new.phone !~ phone_re then
    raise exception 'profiles.phone must contain 6-25 chars (digits, spaces, + - ( ))';
  end if;
  if new.location_en is not null and length(new.location_en) > 120 then
    raise exception 'profiles.location_en must be 120 chars or less';
  end if;
  if new.location_ar is not null and length(new.location_ar) > 120 then
    raise exception 'profiles.location_ar must be 120 chars or less';
  end if;
  if new.manager_id is not null then
    if new.manager_id = new.id then
      raise exception 'profiles.manager_id cannot reference itself';
    end if;
    if not exists (select 1 from public.profiles p where p.id = new.manager_id) then
      raise exception 'profiles.manager_id must reference an existing profile';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_validate_fields on public.profiles;
create trigger profiles_validate_fields
before insert or update on public.profiles
for each row execute function public.validate_profile_fields();
