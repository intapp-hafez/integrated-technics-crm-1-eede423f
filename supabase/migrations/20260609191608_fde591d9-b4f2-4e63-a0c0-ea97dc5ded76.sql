ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'meeting_scheduled';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'proposal_sent';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'archived';