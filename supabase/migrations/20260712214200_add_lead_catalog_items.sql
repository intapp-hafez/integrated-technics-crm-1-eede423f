create table if not exists public.lead_catalog_items (
    id uuid primary key,
    lead_id uuid not null references public.leads(id) on delete cascade,
    catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
    quantity numeric not null default 1,
    created_at timestamp with time zone default now() not null
);

alter table public.lead_catalog_items enable row level security;

create policy "Allow insert access to admins managers employees"
    on public.lead_catalog_items for insert
    to authenticated
    with check (
        exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid() and ur.role in ('admin', 'manager', 'employee')
        )
    );

create policy "Allow update access to admins managers employees"
    on public.lead_catalog_items for update
    to authenticated
    using (
        exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid() and ur.role in ('admin', 'manager', 'employee')
        )
    );

create policy "Allow delete access to admins managers employees"
    on public.lead_catalog_items for delete
    to authenticated
    using (
        exists (
            select 1 from public.user_roles ur
            where ur.user_id = auth.uid() and ur.role in ('admin', 'manager', 'employee')
        )
    );

create policy "Allow select access to authenticated users"
    on public.lead_catalog_items for select
    to authenticated
    using (true);

-- Enable real-time
alter publication supabase_realtime add table public.lead_catalog_items;

