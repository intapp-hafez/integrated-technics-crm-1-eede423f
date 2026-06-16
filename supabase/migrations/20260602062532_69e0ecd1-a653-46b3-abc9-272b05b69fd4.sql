
-- Augment notification_templates
ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_notification_templates_updated_at ON public.notification_templates;
CREATE TRIGGER set_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates readable by authenticated" ON public.notification_templates;
CREATE POLICY "templates readable by authenticated"
  ON public.notification_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "templates admin write" ON public.notification_templates;
CREATE POLICY "templates admin write"
  ON public.notification_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed defaults if empty
INSERT INTO public.notification_templates (name_en, name_ar, channel, subject_en, subject_ar, body_en, body_ar)
SELECT * FROM (VALUES
  ('Welcome',          'ترحيب',              'Email',    'Welcome to INT-CRM',            'مرحبًا بك في INT-CRM',     'Hi {{name}}, welcome aboard!',                        'مرحبًا {{name}}، أهلاً بك!'),
  ('New Lead Assigned','تعيين عميل محتمل',   'Email',    'New lead assigned: {{lead}}',   'تم تعيين عميل: {{lead}}',  'A new lead {{lead}} was assigned to you.',            'تم تعيين العميل {{lead}} إليك.'),
  ('Quotation Sent',   'تم إرسال عرض السعر', 'Email',    'Your quotation {{code}}',       'عرض السعر {{code}}',       'Please review quotation {{code}} attached.',          'يرجى مراجعة عرض السعر {{code}} المرفق.'),
  ('Attendance Alert', 'تنبيه حضور',         'Push',     'Attendance reminder',           'تذكير الحضور',             'Don''t forget to check in today.',                    'لا تنسَ تسجيل الحضور اليوم.'),
  ('Chat Message',     'رسالة محادثة',       'Push',     'New message from {{sender}}',   'رسالة جديدة من {{sender}}','{{preview}}',                                         '{{preview}}')
) AS t(name_en, name_ar, channel, subject_en, subject_ar, body_en, body_ar)
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates);

-- SMTP settings (single row keyed by id=1)
CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id int PRIMARY KEY DEFAULT 1,
  provider text NOT NULL DEFAULT 'hostinger',
  host text NOT NULL DEFAULT 'smtp.hostinger.com',
  port int NOT NULL DEFAULT 465,
  secure boolean NOT NULL DEFAULT true,
  username text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  from_name text NOT NULL DEFAULT 'INT-CRM',
  reply_to text,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT smtp_settings_singleton CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON public.smtp_settings TO authenticated;
GRANT ALL ON public.smtp_settings TO service_role;

ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "smtp admin read" ON public.smtp_settings;
CREATE POLICY "smtp admin read"
  ON public.smtp_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "smtp admin write" ON public.smtp_settings;
CREATE POLICY "smtp admin write"
  ON public.smtp_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS set_smtp_settings_updated_at ON public.smtp_settings;
CREATE TRIGGER set_smtp_settings_updated_at
BEFORE UPDATE ON public.smtp_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.smtp_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
