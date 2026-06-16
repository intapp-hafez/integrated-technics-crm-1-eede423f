create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  check_in time,
  check_out time,
  hours numeric(5,2) generated always as (
    case when check_in is not null and check_out is not null
      then extract(epoch from (check_out - check_in))/3600.0
      else 0 end
  ) stored,
  status public.attendance_status not null default 'present',
  location_en text,
  location_ar text,
  lat numeric(9,6),
  lng numeric(9,6),
  created_at timestamptz not null default now(),
  unique(profile_id, date)
);
create index attendance_date_idx on public.attendance(date);
create index attendance_profile_idx on public.attendance(profile_id);
