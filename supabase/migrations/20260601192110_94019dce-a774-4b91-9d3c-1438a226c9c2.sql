CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  read_at timestamp with time zone
);

CREATE INDEX idx_messages_pair_created ON public.messages (
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);
CREATE INDEX idx_messages_recipient_unread ON public.messages (recipient_id) WHERE read_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: read own conversations"
ON public.messages FOR SELECT TO authenticated
USING (sender_id = public.current_profile_id() OR recipient_id = public.current_profile_id());

CREATE POLICY "messages: insert as sender"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = public.current_profile_id());

CREATE POLICY "messages: mark read as recipient"
ON public.messages FOR UPDATE TO authenticated
USING (recipient_id = public.current_profile_id())
WITH CHECK (recipient_id = public.current_profile_id());

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;