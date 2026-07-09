drop table if exists public.sticky_notes;

create table public.sticky_notes (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid references public.profiles(id) on delete cascade not null,
    title text,
    content text,
    color text default 'bg-yellow-200',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- RLS
alter table public.sticky_notes enable row level security;

create policy "Users can manage their own sticky notes"
    on public.sticky_notes for all
    using (profile_id in (select id from public.profiles where user_id = auth.uid()))
    with check (profile_id in (select id from public.profiles where user_id = auth.uid()));
