create table if not exists public.catalog_categories (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    created_at timestamptz not null default now()
);

-- enable RLS
alter table public.catalog_categories enable row level security;

-- policies
create policy "Allow read access to authenticated users"
    on public.catalog_categories for select
    to authenticated
    using (true);

create policy "Allow insert access to admins"
    on public.catalog_categories for insert
    to authenticated
    with check (
        exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid() and ur.role = 'admin'
        )
    );

create policy "Allow update access to admins"
    on public.catalog_categories for update
    to authenticated
    using (
        exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid() and ur.role = 'admin'
        )
    );

create policy "Allow delete access to admins"
    on public.catalog_categories for delete
    to authenticated
    using (
        exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid() and ur.role = 'admin'
        )
    );
