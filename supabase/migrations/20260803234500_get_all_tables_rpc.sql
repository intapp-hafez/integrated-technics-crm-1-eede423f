CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS TABLE(table_name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT tablename::text
  FROM pg_catalog.pg_tables
  WHERE schemaname = 'public';
$$;
