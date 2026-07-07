-- Add website column to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS website text;

-- Add website column to project_requests
ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS website text;
