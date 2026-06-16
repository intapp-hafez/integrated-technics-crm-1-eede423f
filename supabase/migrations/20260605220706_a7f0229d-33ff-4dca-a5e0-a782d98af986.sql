
-- 1) Explicit deny for client INSERTs into audit logs
CREATE POLICY "No client inserts to audit logs"
ON public.security_audit_logs FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2) Drop the over-broad profiles directory read policy
DROP POLICY IF EXISTS "profiles: directory read" ON public.profiles;

-- 3) Lock down realtime.messages: only authenticated users may subscribe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Authenticated users can read realtime messages'
    ) THEN
      EXECUTE $p$CREATE POLICY "Authenticated users can read realtime messages" ON realtime.messages FOR SELECT TO authenticated USING (true)$p$;
    END IF;
  END IF;
END $$;
