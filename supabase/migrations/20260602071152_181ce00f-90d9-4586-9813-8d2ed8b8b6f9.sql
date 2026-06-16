
-- Allow employees, managers, and finance to send emails through the queue.
-- Users can read/cancel/delete only their own jobs; admins keep full access.

DROP POLICY IF EXISTS "Admins insert email_jobs" ON public.email_jobs;
DROP POLICY IF EXISTS "Admins read email_jobs" ON public.email_jobs;
DROP POLICY IF EXISTS "Admins update email_jobs" ON public.email_jobs;
DROP POLICY IF EXISTS "Admins delete email_jobs" ON public.email_jobs;

CREATE POLICY "email_jobs: insert"
ON public.email_jobs FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'finance'::app_role)
    OR has_role(auth.uid(), 'employee'::app_role)
  )
);

CREATE POLICY "email_jobs: read"
ON public.email_jobs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR created_by = auth.uid()
);

CREATE POLICY "email_jobs: update"
ON public.email_jobs FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
);

CREATE POLICY "email_jobs: delete"
ON public.email_jobs FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
);
