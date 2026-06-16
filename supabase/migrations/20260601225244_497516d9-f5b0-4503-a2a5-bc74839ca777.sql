ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Allow recipients to mark messages as delivered (the existing update policy already permits recipients)
-- Index for quick lookups of undelivered/unread per recipient
CREATE INDEX IF NOT EXISTS idx_messages_recipient_delivered ON public.messages (recipient_id) WHERE delivered_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON public.messages (recipient_id) WHERE read_at IS NULL;