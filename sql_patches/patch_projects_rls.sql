-- Allow employees to read all projects (approved accounts)
drop policy if exists "projects: read" on public.projects;
create policy "projects: read" on public.projects for select to authenticated using (
  public.has_role(auth.uid(),'admin') or 
  public.has_role(auth.uid(),'manager') or 
  public.has_role(auth.uid(),'finance') or 
  public.has_role(auth.uid(),'employee') or
  public.is_project_member(id)
);
