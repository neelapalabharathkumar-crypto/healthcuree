CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DO $do$
DECLARE r record; q text; wc text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (coalesce(qual,'') LIKE '%has_role%' OR coalesce(with_check,'') LIKE '%has_role%')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    q := replace(coalesce(r.qual,''), 'has_role(', 'private.has_role(');
    wc := replace(coalesce(r.with_check,''), 'has_role(', 'private.has_role(');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s TO %s %s %s',
      r.policyname, r.schemaname, r.tablename, r.cmd,
      array_to_string(r.roles, ','),
      CASE WHEN r.qual IS NOT NULL THEN 'USING (' || q || ')' ELSE '' END,
      CASE WHEN r.with_check IS NOT NULL THEN 'WITH CHECK (' || wc || ')' ELSE '' END);
  END LOOP;
END
$do$;

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);