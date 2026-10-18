-- Add monthly activities target columns (divided into 4 weeks with monthly recurrence) to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_activities_target integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activities_week1_target integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activities_week2_target integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activities_week3_target integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activities_week4_target integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activities_target_recurring boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS activities_target_types text[] DEFAULT array['all']::text[];
