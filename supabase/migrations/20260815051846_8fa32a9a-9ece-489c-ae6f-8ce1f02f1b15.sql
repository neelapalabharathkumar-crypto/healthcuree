-- 1. Prescriptions: remove blanket doctor read
DROP POLICY IF EXISTS "doctors read prescriptions of their patients" ON public.prescriptions;

CREATE POLICY "doctors read own patients rx"
ON public.prescriptions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = prescriptions.doctor_id AND d.user_id = auth.uid()));

-- 2. Blood donors: no broad authenticated read of contact details
DROP POLICY IF EXISTS "authenticated read available donors" ON public.blood_donors;

CREATE POLICY "users read own donor record"
ON public.blood_donors FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 3. Internal helper functions must not be directly callable by clients
REVOKE ALL ON FUNCTION public.generate_verification_code() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_set_updated_at() FROM anon, authenticated;