alter table public.catalog_categories add column if not exists managers jsonb default '[]'::jsonb;
