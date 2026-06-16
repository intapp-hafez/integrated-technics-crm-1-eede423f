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

DROP POLICY IF EXISTS "notifications: read" ON public.notifications;
CREATE POLICY "notifications: read"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  current_profile_id() = ANY (audience)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (notifications.audience_roles)
  )
);

DROP POLICY IF EXISTS "notifications: update self" ON public.notifications;
CREATE POLICY "notifications: update self"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  current_profile_id() = ANY (audience)
  OR current_profile_id() = ANY (unread_by)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (notifications.audience_roles)
  )
)
WITH CHECK (
  current_profile_id() = ANY (audience)
  OR current_profile_id() = ANY (unread_by)
  OR EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = ANY (notifications.audience_roles)
  )
);