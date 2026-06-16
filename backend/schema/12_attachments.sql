-- Files attached to a lead, project, or quotation (stored in Supabase Storage)
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  parent_table text not null check (parent_table in ('lead','project','quotation','activity')),
  parent_id uuid not null,
  name_en text not null,
  name_ar text,
  storage_path text not null,                     -- bucket/key
  mime text,
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
create index attachments_parent_idx on public.attachments(parent_table, parent_id);
