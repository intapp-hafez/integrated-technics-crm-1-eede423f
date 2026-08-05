-- Migration: Grant Presales Role Visibility on CRM Tables
-- Allows users with role 'presales' to view and update leads, projects, activities, and quotations.

-- 1. Leads: Read
DROP POLICY IF EXISTS "leads: read" ON public.leads;
DROP POLICY IF EXISTS "leads: read authenticated" ON public.leads;
CREATE POLICY "leads: read" ON public.leads
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'presales')
  OR owner_id = public.current_profile_id()
  OR created_by = auth.uid()
);

-- 2. Leads: Update
DROP POLICY IF EXISTS "leads: update" ON public.leads;
DROP POLICY IF EXISTS "leads: update owner or manager/admin" ON public.leads;
CREATE POLICY "leads: update" ON public.leads
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'presales')
  OR owner_id = public.current_profile_id()
);

-- 3. Projects: Read
DROP POLICY IF EXISTS "projects: read" ON public.projects;
CREATE POLICY "projects: read" ON public.projects
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'presales')
  OR public.is_project_member(id)
);

-- 4. Activities: Read
DROP POLICY IF EXISTS "activities: read" ON public.activities;
DROP POLICY IF EXISTS "activities: read scoped" ON public.activities;
CREATE POLICY "activities: read" ON public.activities
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'presales')
  OR owner_id = public.current_profile_id()
  OR public.current_profile_id() = ANY (presales_team)
);

-- 5. Quotations: Read
DROP POLICY IF EXISTS "quotations: read" ON public.quotations;
CREATE POLICY "quotations: read" ON public.quotations
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'presales')
  OR created_by = auth.uid()
);
