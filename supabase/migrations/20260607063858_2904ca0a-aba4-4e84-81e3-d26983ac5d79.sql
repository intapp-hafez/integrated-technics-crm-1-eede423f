DROP POLICY IF EXISTS "email_jobs: read" ON public.email_jobs;
CREATE POLICY "email_jobs: read" ON public.email_jobs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR (created_by = auth.uid()));