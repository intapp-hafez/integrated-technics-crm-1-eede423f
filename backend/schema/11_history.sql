-- Generic audit / history feed (bilingual descriptions optional)
create table public.history (
  id uuid primary key default gen_random_uuid(),
  module public.history_module not null,
  action_en text not null,
  action_ar text,
  actor_id uuid references public.profiles(id) on delete set null,
  target_en text,
  target_ar text,
  target_table text,
  target_id uuid,
  details_en text,
  details_ar text,
  created_at timestamptz not null default now()
);
create index history_module_idx on public.history(module);
create index history_created_idx on public.history(created_at desc);
