
-- Manager/admin review note attached to an activity (visible to creator after decision)
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS review_note text;

-- Storage bucket for files attached to activities (used in the approval flow)
INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-attachments', 'activity-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: any authenticated user can read/upload activity attachments,
-- owners + admins/managers can delete. RLS on the parent activities table still
-- governs who can see the row metadata via the `attachments` table.
DROP POLICY IF EXISTS "activity-attachments read"   ON storage.objects;
DROP POLICY IF EXISTS "activity-attachments upload" ON storage.objects;
DROP POLICY IF EXISTS "activity-attachments delete" ON storage.objects;

CREATE POLICY "activity-attachments read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-attachments');

CREATE POLICY "activity-attachments upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-attachments');

CREATE POLICY "activity-attachments delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'activity-attachments'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
    )
  );

-- Allow managers/admins to update attachments table is not needed; INSERT policy already exists.
