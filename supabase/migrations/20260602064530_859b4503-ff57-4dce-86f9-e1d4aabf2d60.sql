-- Email jobs (queue + scheduling)
create table if not exists public.email_jobs (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.notification_templates(id) on delete set null,
  recipients text[] not null default '{}',
  subject text not null default '',
  body text not null default '',
  scheduled_for timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','canceled')),
  error text,
  sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_jobs_status_idx on public.email_jobs(status, scheduled_for);

grant select, insert, update, delete on public.email_jobs to authenticated;
grant all on public.email_jobs to service_role;

alter table public.email_jobs enable row level security;

create policy "Admins read email_jobs"   on public.email_jobs for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Admins insert email_jobs" on public.email_jobs for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "Admins update email_jobs" on public.email_jobs for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins delete email_jobs" on public.email_jobs for delete to authenticated using (public.has_role(auth.uid(),'admin'));

drop trigger if exists set_email_jobs_updated_at on public.email_jobs;
create trigger set_email_jobs_updated_at before update on public.email_jobs
for each row execute function public.set_updated_at();

-- Seed more notification templates (idempotent by name_en)
insert into public.notification_templates (name_en, name_ar, channel, subject_en, subject_ar, body_en, body_ar, enabled)
select * from (values
  ('Password Reset','إعادة تعيين كلمة المرور','Email','Reset your password','إعادة تعيين كلمة المرور',
    'Hi {{name}}, click the link to reset your password: {{link}}',
    'مرحبًا {{name}}، اضغط على الرابط لإعادة تعيين كلمة المرور: {{link}}', true),
  ('Activity Assigned','تم تعيين نشاط','Push','New activity assigned','تم تعيين نشاط جديد',
    'You have a new activity: {{title}} scheduled on {{date}}.',
    'لديك نشاط جديد: {{title}} في {{date}}.', true),
  ('Meeting Reminder','تذكير اجتماع','Email','Upcoming meeting reminder','تذكير بالاجتماع القادم',
    'Reminder: {{title}} starts at {{time}} with {{client}}.',
    'تذكير: {{title}} يبدأ في {{time}} مع {{client}}.', true),
  ('Task Overdue','مهمة متأخرة','Email','Task is overdue','مهمة متأخرة',
    'The task "{{title}}" is overdue since {{date}}. Please take action.',
    'المهمة "{{title}}" متأخرة منذ {{date}}. يرجى اتخاذ إجراء.', true),
  ('Project Status Update','تحديث حالة المشروع','Email','Project {{project}} status update','تحديث حالة المشروع {{project}}',
    'Project {{project}} moved to status: {{status}}.',
    'تم نقل المشروع {{project}} إلى الحالة: {{status}}.', true),
  ('Invoice Issued','إصدار فاتورة','Email','Invoice {{number}} issued','تم إصدار الفاتورة {{number}}',
    'Hi {{name}}, invoice {{number}} for {{amount}} has been issued. Due: {{due}}.',
    'مرحبًا {{name}}، تم إصدار الفاتورة {{number}} بقيمة {{amount}}. تاريخ الاستحقاق: {{due}}.', true),
  ('Payment Received','تم استلام الدفع','Email','Payment received','تم استلام الدفع',
    'We received your payment of {{amount}} for invoice {{number}}. Thank you!',
    'تم استلام دفعتك بقيمة {{amount}} للفاتورة {{number}}. شكرًا لك!', true),
  ('Lead Status Changed','تغيير حالة العميل المحتمل','Push','Lead {{lead}} updated','تم تحديث العميل المحتمل {{lead}}',
    'Lead {{lead}} moved from {{from}} to {{to}}.',
    'تم نقل العميل المحتمل {{lead}} من {{from}} إلى {{to}}.', true),
  ('Daily Summary','الملخص اليومي','Email','Your daily summary','ملخصك اليومي',
    'Today: {{leads}} new leads, {{activities}} activities, {{quotations}} quotations.',
    'اليوم: {{leads}} عميل محتمل جديد، {{activities}} نشاط، {{quotations}} عرض سعر.', true),
  ('Approval Needed','يتطلب موافقة','Push','Approval needed: {{title}}','مطلوب موافقة: {{title}}',
    '{{requester}} requested approval for {{title}}. Please review.',
    'طلب {{requester}} الموافقة على {{title}}. يرجى المراجعة.', true)
) as v(name_en,name_ar,channel,subject_en,subject_ar,body_en,body_ar,enabled)
where not exists (
  select 1 from public.notification_templates t where t.name_en = v.name_en
);
