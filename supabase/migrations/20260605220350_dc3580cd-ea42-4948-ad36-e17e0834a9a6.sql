
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id uuid NULL,
  actor_email text NULL,
  action text NOT NULL,
  resource_type text NULL,
  resource_id text NULL,
  status text NOT NULL DEFAULT 'success',
  ip_address text NULL,
  user_agent text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.security_audit_logs TO authenticated;
GRANT ALL ON public.security_audit_logs TO service_role;

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
ON public.security_audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS security_audit_logs_created_at_idx ON public.security_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS security_audit_logs_actor_idx ON public.security_audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS security_audit_logs_action_idx ON public.security_audit_logs (action);
