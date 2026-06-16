ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_project_id_idx ON public.leads(project_id);