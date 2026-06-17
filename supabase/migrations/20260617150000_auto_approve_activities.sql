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
    NEW.approval_status := COALESCE(NEW.approval_status, 'approved');
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$fn$;
