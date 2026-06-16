
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Authenticated users can read realtime messages') THEN
    EXECUTE 'DROP POLICY "Authenticated users can read realtime messages" ON realtime.messages';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='Authenticated users can read realtime messages') THEN
    EXECUTE 'DROP POLICY "Authenticated users can read realtime messages" ON public.messages';
  END IF;
END $$;
