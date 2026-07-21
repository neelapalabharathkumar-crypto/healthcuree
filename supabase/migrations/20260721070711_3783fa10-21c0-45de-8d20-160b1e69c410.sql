
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "anyone submit contact" ON public.contact_messages;
CREATE POLICY "anyone submit contact" ON public.contact_messages FOR INSERT
  WITH CHECK (
    length(name) BETWEEN 1 AND 120 AND
    length(email) BETWEEN 3 AND 255 AND
    length(message) BETWEEN 1 AND 5000 AND
    (phone IS NULL OR length(phone) <= 40) AND
    (subject IS NULL OR length(subject) <= 200)
  );
