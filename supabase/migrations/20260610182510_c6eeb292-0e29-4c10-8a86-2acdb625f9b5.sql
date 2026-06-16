
REVOKE EXECUTE ON FUNCTION public.is_ip_blocked(inet) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rate_limit_check(inet, text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_security_event(inet, text, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.security_gc() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(inet) TO service_role;
GRANT EXECUTE ON FUNCTION public.rate_limit_check(inet, text, int, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_security_event(inet, text, text, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.security_gc() TO service_role;
