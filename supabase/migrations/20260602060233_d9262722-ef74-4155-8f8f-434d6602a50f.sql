CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name_en text;
  sender_name_ar text;
BEGIN
  SELECT
    COALESCE(NULLIF(p.full_name_en, ''), p.email, 'Someone'),
    COALESCE(NULLIF(p.full_name_ar, ''), NULLIF(p.full_name_en, ''), p.email, 'Someone')
  INTO sender_name_en, sender_name_ar
  FROM public.profiles p
  WHERE p.id = NEW.sender_id
  LIMIT 1;

  INSERT INTO public.notifications (
    type,
    title_en,
    title_ar,
    body_en,
    body_ar,
    href,
    audience,
    unread_by,
    created_by
  )
  VALUES (
    'chat'::public.notification_type,
    'New message from ' || COALESCE(sender_name_en, 'Someone'),
    'رسالة جديدة من ' || COALESCE(sender_name_ar, sender_name_en, 'Someone'),
    LEFT(COALESCE(NEW.body, ''), 160),
    LEFT(COALESCE(NEW.body, ''), 160),
    '/chat',
    ARRAY[NEW.recipient_id]::uuid[],
    ARRAY[NEW.recipient_id]::uuid[],
    NEW.sender_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_notify_chat ON public.messages;
CREATE TRIGGER messages_notify_chat
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_message();

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

DROP POLICY IF EXISTS "notifications: read" ON public.notifications;
CREATE POLICY "notifications: read"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  public.current_profile_id() = ANY (COALESCE(audience, '{}'::uuid[]))
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (COALESCE(notifications.audience_roles, '{}'::public.app_role[]))
  )
);

DROP POLICY IF EXISTS "notifications: update self" ON public.notifications;
CREATE POLICY "notifications: update self"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  public.current_profile_id() = ANY (COALESCE(audience, '{}'::uuid[]))
  OR public.current_profile_id() = ANY (COALESCE(unread_by, '{}'::uuid[]))
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (COALESCE(notifications.audience_roles, '{}'::public.app_role[]))
  )
)
WITH CHECK (
  public.current_profile_id() = ANY (COALESCE(audience, '{}'::uuid[]))
  OR public.current_profile_id() = ANY (COALESCE(unread_by, '{}'::uuid[]))
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (COALESCE(notifications.audience_roles, '{}'::public.app_role[]))
  )
);

INSERT INTO public.notifications (
  type,
  title_en,
  title_ar,
  body_en,
  body_ar,
  href,
  audience,
  unread_by,
  created_by,
  created_at
)
SELECT
  'chat'::public.notification_type,
  'New message from ' || COALESCE(NULLIF(p.full_name_en, ''), p.email, 'Someone'),
  'رسالة جديدة من ' || COALESCE(NULLIF(p.full_name_ar, ''), NULLIF(p.full_name_en, ''), p.email, 'Someone'),
  LEFT(COALESCE(m.body, ''), 160),
  LEFT(COALESCE(m.body, ''), 160),
  '/chat',
  ARRAY[m.recipient_id]::uuid[],
  CASE WHEN m.read_at IS NULL THEN ARRAY[m.recipient_id]::uuid[] ELSE '{}'::uuid[] END,
  m.sender_id,
  m.created_at
FROM public.messages m
LEFT JOIN public.profiles p ON p.id = m.sender_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notifications n
  WHERE n.type = 'chat'::public.notification_type
    AND n.created_by = m.sender_id
    AND m.recipient_id = ANY (COALESCE(n.audience, '{}'::uuid[]))
    AND COALESCE(n.body_en, '') = LEFT(COALESCE(m.body, ''), 160)
    AND abs(EXTRACT(EPOCH FROM (n.created_at - m.created_at))) < 10
);