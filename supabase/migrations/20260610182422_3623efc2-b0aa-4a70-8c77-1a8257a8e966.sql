
-- 1) IP blocklist
CREATE TABLE IF NOT EXISTS public.ip_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip inet NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT '',
  triggered_by text NOT NULL DEFAULT 'manual',
  hits integer NOT NULL DEFAULT 1,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_blocklist TO authenticated;
GRANT ALL ON public.ip_blocklist TO service_role;
ALTER TABLE public.ip_blocklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage blocklist" ON public.ip_blocklist
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS ip_blocklist_expires_idx ON public.ip_blocklist(expires_at);

-- 2) IP whitelist
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip inet NOT NULL UNIQUE,
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ip_whitelist TO authenticated;
GRANT ALL ON public.ip_whitelist TO service_role;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage whitelist" ON public.ip_whitelist
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3) Rate limit counters
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  ip inet NOT NULL,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, bucket, window_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_counters TO authenticated;
GRANT ALL ON public.rate_limit_counters TO service_role;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read rate counters" ON public.rate_limit_counters
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS rate_counters_window_idx ON public.rate_limit_counters(window_start);

-- 4) Security events
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip inet,
  event_type text NOT NULL,
  path text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  severity text NOT NULL DEFAULT 'info',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read security events" ON public.security_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS security_events_ip_idx ON public.security_events(ip);
CREATE INDEX IF NOT EXISTS security_events_type_idx ON public.security_events(event_type);

-- 5) Security scan runs
CREATE TABLE IF NOT EXISTS public.security_scan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  score integer,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.security_scan_runs TO authenticated;
GRANT ALL ON public.security_scan_runs TO service_role;
ALTER TABLE public.security_scan_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage scan runs" ON public.security_scan_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS scan_runs_started_idx ON public.security_scan_runs(started_at DESC);

-- updated_at trigger for blocklist
DROP TRIGGER IF EXISTS ip_blocklist_set_updated ON public.ip_blocklist;
CREATE TRIGGER ip_blocklist_set_updated
  BEFORE UPDATE ON public.ip_blocklist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6) Helper: is_ip_blocked (respects whitelist + expires_at)
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip inet)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _ip IS NULL THEN false
    WHEN EXISTS (SELECT 1 FROM public.ip_whitelist WHERE ip = _ip) THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.ip_blocklist
      WHERE ip = _ip AND (expires_at IS NULL OR expires_at > now())
    ) THEN true
    ELSE false
  END;
$$;

-- 7) Helper: rate_limit_check  (returns true = allowed, false = limited)
CREATE OR REPLACE FUNCTION public.rate_limit_check(_ip inet, _bucket text, _limit int, _window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  win_start timestamptz;
  cur_count int;
BEGIN
  IF _ip IS NULL THEN RETURN true; END IF;
  IF EXISTS (SELECT 1 FROM public.ip_whitelist WHERE ip = _ip) THEN RETURN true; END IF;

  win_start := date_trunc('second', now()) - ((extract(epoch FROM now())::bigint % _window_seconds) || ' seconds')::interval;

  INSERT INTO public.rate_limit_counters(ip, bucket, window_start, count)
  VALUES (_ip, _bucket, win_start, 1)
  ON CONFLICT (ip, bucket, window_start)
    DO UPDATE SET count = public.rate_limit_counters.count + 1
    RETURNING count INTO cur_count;

  RETURN cur_count <= _limit;
END;
$$;

-- 8) Helper: record_security_event (also auto-blacklists)
CREATE OR REPLACE FUNCTION public.record_security_event(
  _ip inet,
  _event_type text,
  _path text,
  _user_id uuid,
  _severity text,
  _details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev_id uuid;
  recent_count int;
  should_block boolean := false;
  block_reason text;
  block_minutes int := 60;
BEGIN
  INSERT INTO public.security_events(ip, event_type, path, user_id, severity, details)
  VALUES (_ip, _event_type, _path, _user_id, COALESCE(_severity,'info'), COALESCE(_details,'{}'::jsonb))
  RETURNING id INTO ev_id;

  IF _ip IS NULL THEN RETURN ev_id; END IF;
  IF EXISTS (SELECT 1 FROM public.ip_whitelist WHERE ip = _ip) THEN RETURN ev_id; END IF;

  -- Threshold rules
  IF _event_type = 'failed_login' THEN
    SELECT count(*) INTO recent_count FROM public.security_events
      WHERE ip = _ip AND event_type = 'failed_login' AND created_at > now() - interval '10 minutes';
    IF recent_count >= 5 THEN
      should_block := true; block_reason := 'Repeated failed logins'; block_minutes := 60;
    END IF;

  ELSIF _event_type = 'rate_limit' THEN
    SELECT count(*) INTO recent_count FROM public.security_events
      WHERE ip = _ip AND event_type = 'rate_limit' AND created_at > now() - interval '5 minutes';
    IF recent_count >= 20 THEN
      should_block := true; block_reason := 'Rate limit abuse'; block_minutes := 120;
    END IF;

  ELSIF _event_type = 'suspicious_payload' THEN
    should_block := true; block_reason := 'Suspicious payload detected'; block_minutes := 1440;

  ELSIF _event_type = 'unauthorized_admin' THEN
    SELECT count(*) INTO recent_count FROM public.security_events
      WHERE ip = _ip AND event_type = 'unauthorized_admin' AND created_at > now() - interval '10 minutes';
    IF recent_count >= 3 THEN
      should_block := true; block_reason := 'Unauthorized admin access attempts'; block_minutes := 720;
    END IF;
  END IF;

  IF should_block THEN
    INSERT INTO public.ip_blocklist(ip, reason, triggered_by, hits, expires_at)
    VALUES (_ip, block_reason, _event_type, 1, now() + (block_minutes || ' minutes')::interval)
    ON CONFLICT (ip) DO UPDATE
      SET hits = public.ip_blocklist.hits + 1,
          last_seen = now(),
          reason = EXCLUDED.reason,
          triggered_by = EXCLUDED.triggered_by,
          expires_at = GREATEST(COALESCE(public.ip_blocklist.expires_at, now()), EXCLUDED.expires_at);
  END IF;

  RETURN ev_id;
END;
$$;

-- 9) Cleanup expired counters/blocks helper
CREATE OR REPLACE FUNCTION public.security_gc()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_counters WHERE window_start < now() - interval '1 hour';
  DELETE FROM public.ip_blocklist WHERE expires_at IS NOT NULL AND expires_at < now() - interval '7 days';
$$;
