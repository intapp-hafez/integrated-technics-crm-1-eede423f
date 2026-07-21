DELETE FROM public.pipeline_stages WHERE key = 'pending_approval';

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS pending_won_approval boolean DEFAULT false;
