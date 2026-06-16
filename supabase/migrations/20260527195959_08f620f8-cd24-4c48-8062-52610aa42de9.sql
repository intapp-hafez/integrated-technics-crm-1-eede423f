DROP POLICY IF EXISTS "quotations: read" ON public.quotations;
CREATE POLICY "quotations: read" ON public.quotations FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = quotations.lead_id
      AND (l.owner_id = current_profile_id() OR l.created_by = auth.uid())
  )
);