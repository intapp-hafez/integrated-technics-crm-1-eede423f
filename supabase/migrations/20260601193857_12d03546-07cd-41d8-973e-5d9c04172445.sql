-- Allow all authenticated users to read basic profile directory so chat panels can list peers.
DROP POLICY IF EXISTS "profiles: directory read" ON public.profiles;
CREATE POLICY "profiles: directory read"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Helper RPC: list everyone for chat (works for non-admin roles too).
CREATE OR REPLACE FUNCTION public.chat_directory()
RETURNS TABLE(
  user_id uuid,
  profile_id uuid,
  email text,
  full_name_en text,
  full_name_ar text,
  avatar_url text,
  active boolean,
  role app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    p.id,
    u.email::text,
    p.full_name_en,
    p.full_name_ar,
    p.avatar_url,
    coalesce(p.active, true),
    (
      SELECT ur.role FROM public.user_roles ur
      WHERE ur.user_id = u.id
      ORDER BY CASE ur.role
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'finance' THEN 3
        WHEN 'hr' THEN 4
        WHEN 'employee' THEN 5
      END
      LIMIT 1
    )
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE coalesce(p.active, true) = true
$$;

GRANT EXECUTE ON FUNCTION public.chat_directory() TO authenticated;