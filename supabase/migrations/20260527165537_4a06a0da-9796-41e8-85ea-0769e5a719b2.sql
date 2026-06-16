
DO $$ BEGIN
  CREATE TYPE public.activity_approval_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS approval_status public.activity_approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Backfill existing rows as approved so historical data stays visible
UPDATE public.activities SET approval_status = 'approved' WHERE approved_at IS NULL AND created_at < now();

-- Auto-approve when admin/manager creates it
CREATE OR REPLACE FUNCTION public.activities_auto_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'manager'::public.app_role) THEN
    NEW.approval_status := 'approved';
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  ELSE
    NEW.approval_status := 'pending';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_activities_auto_approve ON public.activities;
CREATE TRIGGER trg_activities_auto_approve
BEFORE INSERT ON public.activities
FOR EACH ROW EXECUTE FUNCTION public.activities_auto_approve();
