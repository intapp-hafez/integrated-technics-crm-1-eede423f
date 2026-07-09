alter table public.profiles
  add column if not exists kpi_target_weight numeric(5,2) default 33.33,
  add column if not exists kpi_activities_weight numeric(5,2) default 33.33,
  add column if not exists kpi_attendance_weight numeric(5,2) default 33.34;
