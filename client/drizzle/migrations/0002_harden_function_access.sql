REVOKE ALL ON FUNCTION public.assign_operator() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_well_change() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated;