-- Create table for Activities Monitoring Settings
CREATE TABLE IF NOT EXISTS public.activities_monitoring_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  no_activity_threshold_days INT DEFAULT 3,
  frequency TEXT[] DEFAULT ARRAY['daily', 'weekly'],
  working_days TEXT[] DEFAULT ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  working_hours_start TIME DEFAULT '08:00:00',
  working_hours_end TIME DEFAULT '18:00:00',
  ignore_closed BOOLEAN DEFAULT true,
  ignore_won BOOLEAN DEFAULT true,
  ignore_lost BOOLEAN DEFAULT true,
  ignore_archived BOOLEAN DEFAULT true,
  ignore_others_activities BOOLEAN DEFAULT false,
  include_sub_activities BOOLEAN DEFAULT true,
  pause_holidays BOOLEAN DEFAULT false,
  auto_create_followup BOOLEAN DEFAULT false,
  escalation_rules JSONB DEFAULT '[
    {"days": 3, "role": "Employee"},
    {"days": 5, "role": "Manager"},
    {"days": 7, "role": "Sales Manager"},
    {"days": 14, "role": "CRM Admin"}
  ]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial monitoring settings row
INSERT INTO public.activities_monitoring_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.activities_monitoring_settings);

-- Create table for Notification Templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial notification templates
INSERT INTO public.notification_templates (type, subject, body)
VALUES
  ('employee_warning', 'Action Required: Lead {lead_name} has been inactive', 'Lead {lead_name} ({company}) assigned to you has been inactive for {inactive_days} days. Please log an activity soon.'),
  ('manager_escalation', 'Escalation Alert: Lead {lead_name} requires attention', 'Escalation Alert: Lead {lead_name} assigned to {owner_name} requires attention ({inactive_days} days inactive).'),
  ('sales_manager_escalation', 'High Priority Inactivity: {company} has recorded 0 activities', 'High Priority Inactivity: {company} assigned to {owner_name} has recorded 0 activities for {inactive_days} days.'),
  ('admin_escalation', 'Critical Inactivity Alert: {lead_name} is stagnant', 'Critical Inactivity Alert: {lead_name} ({company}) is stagnant for {inactive_days} days without any logged activity.')
ON CONFLICT (type) DO NOTHING;

-- Create policies if necessary, assuming anon and authenticated can read, authenticated can write
ALTER TABLE public.activities_monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to activities_monitoring_settings" ON public.activities_monitoring_settings FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow anon read access to activities_monitoring_settings" ON public.activities_monitoring_settings FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access to notification_templates" ON public.notification_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow anon read access to notification_templates" ON public.notification_templates FOR SELECT USING (true);

-- Enable realtime for both tables
alter publication supabase_realtime add table public.activities_monitoring_settings;
alter publication supabase_realtime add table public.notification_templates;
