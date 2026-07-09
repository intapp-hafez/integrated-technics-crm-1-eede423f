-- Add individual KPI period columns to profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS kpi_target_period VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS kpi_activities_period VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS kpi_attendance_period VARCHAR(20) NULL;

-- Remove the global one if it exists from previous attempts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kpi_period') THEN
    ALTER TABLE profiles DROP COLUMN kpi_period;
  END IF;
END $$;
