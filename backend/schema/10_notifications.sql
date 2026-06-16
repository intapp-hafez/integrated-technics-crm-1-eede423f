create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type public.notification_type not null,
  title_en text not null,
  title_ar text,
  body_en text,
  body_ar text,
  href text,
  audience uuid[] default '{}',                   -- profile ids; empty = everyone
  audience_roles public.app_role[] default '{}',  -- broadcast by role
  unread_by uuid[] default '{}',                  -- profile ids that still have it unread
  created_by uuid,
  created_at timestamptz not null default now()
);
create index notifications_created_idx on public.notifications(created_at desc);
