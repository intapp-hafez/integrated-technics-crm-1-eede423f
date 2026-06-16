ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS annual_target numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS q1_target numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS q2_target numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS q3_target numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS q4_target numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_meetings_target integer DEFAULT 0;