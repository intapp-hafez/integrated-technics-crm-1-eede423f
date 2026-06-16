-- Drop existing overly-broad policies on realtime.messages from prior migrations
DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages;

-- Ensure RLS is enabled
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Per-topic policy: a user can only read/write Realtime Broadcast/Presence
-- messages on a topic that explicitly carries their own auth.uid().
-- Allowed topic formats (case-sensitive):
--   user:{auth.uid()}             -- private user topic
--   user:{auth.uid()}:*           -- private user sub-topics
--   chat:{a}:{b}                  -- 1:1 chat where {a} or {b} == auth.uid()
-- Any other topic is denied for both reads and writes.

CREATE POLICY "Per-topic read for authenticated"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
  OR (
    realtime.topic() LIKE 'chat:%'
    AND (
      split_part(realtime.topic(), ':', 2) = auth.uid()::text
      OR split_part(realtime.topic(), ':', 3) = auth.uid()::text
    )
  )
);

CREATE POLICY "Per-topic insert for authenticated"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
  OR (
    realtime.topic() LIKE 'chat:%'
    AND (
      split_part(realtime.topic(), ':', 2) = auth.uid()::text
      OR split_part(realtime.topic(), ':', 3) = auth.uid()::text
    )
  )
);