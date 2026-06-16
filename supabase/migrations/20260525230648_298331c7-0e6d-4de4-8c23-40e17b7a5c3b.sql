
-- Departments
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  created_at timestamptz not null default now()
);
alter table public.departments enable row level security;
create policy "departments: read" on public.departments for select to authenticated using (true);
create policy "departments: admin write" on public.departments for all to authenticated
  using (has_role(auth.uid(),'admin'::app_role)) with check (has_role(auth.uid(),'admin'::app_role));

-- Positions
create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text,
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.positions enable row level security;
create policy "positions: read" on public.positions for select to authenticated using (true);
create policy "positions: admin write" on public.positions for all to authenticated
  using (has_role(auth.uid(),'admin'::app_role)) with check (has_role(auth.uid(),'admin'::app_role));

-- Seed
insert into public.departments (name_en, name_ar) values
  ('Sales','المبيعات'),
  ('Engineering','الهندسة'),
  ('Finance','المالية'),
  ('Human Resources','الموارد البشرية'),
  ('Operations','العمليات'),
  ('Marketing','التسويق')
on conflict do nothing;

insert into public.positions (name_en, name_ar) values
  ('Sales Manager','مدير مبيعات'),
  ('Sales Executive','تنفيذي مبيعات'),
  ('Account Manager','مدير حسابات'),
  ('Project Manager','مدير مشروع'),
  ('Senior Engineer','مهندس أول'),
  ('Engineer','مهندس'),
  ('Finance Manager','مدير مالي'),
  ('Accountant','محاسب'),
  ('HR Manager','مدير موارد بشرية'),
  ('HR Specialist','أخصائي موارد بشرية'),
  ('Operations Manager','مدير عمليات'),
  ('Marketing Specialist','أخصائي تسويق')
on conflict do nothing;
