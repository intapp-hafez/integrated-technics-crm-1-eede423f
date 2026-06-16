CREATE TABLE IF NOT EXISTS public.email_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.email_jobs(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','failed','retry','skipped')),
  error text,
  attempt integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_delivery_logs_job_id_idx ON public.email_delivery_logs(job_id);
CREATE INDEX IF NOT EXISTS email_delivery_logs_recipient_idx ON public.email_delivery_logs(recipient);
CREATE INDEX IF NOT EXISTS email_delivery_logs_created_at_idx ON public.email_delivery_logs(created_at DESC);

GRANT SELECT ON public.email_delivery_logs TO authenticated;
GRANT ALL ON public.email_delivery_logs TO service_role;

ALTER TABLE public.email_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view delivery logs"
  ON public.email_delivery_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));