ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'pending_approval';

INSERT INTO public.pipeline_stages (key, label_en, label_ar, color, sort_order)
VALUES 
  ('new', 'New', 'جديد', '#64748b', 1),
  ('qualified', 'Qualified', 'مؤهل', '#8b5cf6', 2),
  ('contacted', 'Contacted', 'تم التواصل', '#3b82f6', 3),
  ('meeting_scheduled', 'Meeting Scheduled', 'تم تحديد موعد', '#0ea5e9', 4),
  ('proposal_sent', 'Proposal Sent', 'تم إرسال العرض', '#f59e0b', 5),
  ('negotiation', 'Negotiation', 'تفاوض', '#ec4899', 6),
  ('pending_approval', 'Waiting for Admin Approval', 'بانتظار موافقة الإدارة', '#eab308', 7),
  ('won', 'Won', 'تم الكسب', '#10b981', 8),
  ('lost', 'Lost', 'مفقود', '#ef4444', 9),
  ('archived', 'Archived', 'مؤرشف', '#9ca3af', 10)
ON CONFLICT (key) DO NOTHING;