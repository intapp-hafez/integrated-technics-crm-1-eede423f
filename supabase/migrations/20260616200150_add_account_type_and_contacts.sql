ALTER TABLE projects ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS other_account_type text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS extra_contacts jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_phone text;

ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS other_account_type text;
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS extra_contacts jsonb;
