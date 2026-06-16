
-- 1) Add UPDATE policy for activity-attachments storage bucket (mirrors DELETE)
CREATE POLICY "activity-attachments update scoped" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'activity-attachments'
  AND (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  bucket_id = 'activity-attachments'
  AND (owner = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- 2) Normalize attachments.parent_table to singular form
UPDATE public.attachments SET parent_table = 'lead' WHERE parent_table = 'leads';
UPDATE public.attachments SET parent_table = 'project' WHERE parent_table = 'projects';
UPDATE public.attachments SET parent_table = 'quotation' WHERE parent_table = 'quotations';
UPDATE public.attachments SET parent_table = 'client' WHERE parent_table = 'clients';

-- 3) Recreate SELECT policy to use the singular parent_table values used by INSERT
DROP POLICY IF EXISTS "attachments: read scoped" ON public.attachments;
CREATE POLICY "attachments: read scoped" ON public.attachments
FOR SELECT TO authenticated
USING (
  (uploaded_by = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR (parent_table = 'activity' AND EXISTS (
    SELECT 1 FROM activities a WHERE a.id = attachments.parent_id
      AND (a.created_by = auth.uid() OR a.owner_id = current_profile_id()
           OR current_profile_id() = ANY (COALESCE(a.presales_team, '{}'::uuid[])))
  ))
  OR (parent_table = 'lead' AND EXISTS (
    SELECT 1 FROM leads l WHERE l.id = attachments.parent_id
      AND (has_role(auth.uid(), 'finance'::app_role) OR l.owner_id = current_profile_id() OR l.created_by = auth.uid())
  ))
  OR (parent_table = 'project' AND EXISTS (
    SELECT 1 FROM projects p WHERE p.id = attachments.parent_id
      AND (has_role(auth.uid(), 'finance'::app_role) OR is_project_member(p.id))
  ))
  OR (parent_table = 'quotation' AND EXISTS (
    SELECT 1 FROM quotations q WHERE q.id = attachments.parent_id
      AND (has_role(auth.uid(), 'finance'::app_role) OR q.created_by = auth.uid())
  ))
  OR (parent_table = 'client' AND EXISTS (
    SELECT 1 FROM clients c WHERE c.id = attachments.parent_id
  ) AND (has_role(auth.uid(), 'employee'::app_role) OR has_role(auth.uid(), 'finance'::app_role)))
);
