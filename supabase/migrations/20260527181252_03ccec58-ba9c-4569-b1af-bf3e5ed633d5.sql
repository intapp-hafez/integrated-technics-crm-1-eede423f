CREATE OR REPLACE FUNCTION public.activities_auto_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  current_profile uuid;
BEGIN
  current_profile := public.current_profile_id();

  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'manager'::public.app_role) THEN
    NEW.approval_status := 'approved';
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  ELSE
    NEW.owner_id := current_profile;
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$fn$;

DROP POLICY IF EXISTS "attachments: read scoped" ON public.attachments;
DROP POLICY IF EXISTS "attachments: read activity scoped" ON public.attachments;
DROP POLICY IF EXISTS "attachments: insert activity scoped" ON public.attachments;

CREATE POLICY "attachments: read scoped"
ON public.attachments
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
  OR (
    parent_table = 'activity' AND EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = attachments.parent_id
        AND (
          a.created_by = auth.uid()
          OR a.owner_id = public.current_profile_id()
          OR public.current_profile_id() = ANY (COALESCE(a.presales_team, '{}'::uuid[]))
        )
    )
  )
  OR (
    parent_table = 'leads' AND EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = attachments.parent_id
        AND (
          public.has_role(auth.uid(),'finance'::public.app_role)
          OR l.owner_id = public.current_profile_id()
          OR l.created_by = auth.uid()
        )
    )
  )
  OR (
    parent_table = 'projects' AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = attachments.parent_id
        AND (
          public.has_role(auth.uid(),'finance'::public.app_role)
          OR public.is_project_member(p.id)
        )
    )
  )
  OR (
    parent_table = 'quotations' AND EXISTS (
      SELECT 1 FROM public.quotations q
      WHERE q.id = attachments.parent_id
        AND (
          public.has_role(auth.uid(),'finance'::public.app_role)
          OR q.created_by = auth.uid()
        )
    )
  )
  OR (
    parent_table = 'clients' AND EXISTS (
      SELECT 1 FROM public.clients c WHERE c.id = attachments.parent_id
    )
    AND (
      public.has_role(auth.uid(),'employee'::public.app_role)
      OR public.has_role(auth.uid(),'finance'::public.app_role)
    )
  )
);

CREATE POLICY "attachments: insert activity scoped"
ON public.attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    parent_table <> 'activity'
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = attachments.parent_id
        AND (
          a.created_by = auth.uid()
          OR a.owner_id = public.current_profile_id()
          OR public.current_profile_id() = ANY (COALESCE(a.presales_team, '{}'::uuid[]))
        )
    )
  )
);