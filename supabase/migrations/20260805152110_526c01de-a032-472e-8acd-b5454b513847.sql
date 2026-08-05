
-- VERIFICATION CODES
CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  reception_status text NOT NULL DEFAULT 'pending',
  report_status text NOT NULL DEFAULT 'pending',
  used boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_codes TO authenticated;
GRANT ALL ON public.verification_codes TO service_role;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients read own codes" ON public.verification_codes
  FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "patients create own codes" ON public.verification_codes
  FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "staff read codes" ON public.verification_codes
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'doctor')
  );
CREATE POLICY "staff update codes" ON public.verification_codes
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'doctor')
  ) WITH CHECK (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist') OR public.has_role(auth.uid(),'doctor')
  );
CREATE POLICY "admins delete codes" ON public.verification_codes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER verification_codes_updated_at BEFORE UPDATE ON public.verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX verification_codes_code_idx ON public.verification_codes(code);
CREATE INDEX verification_codes_patient_idx ON public.verification_codes(patient_id);

-- unique 5 digit code generator
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; i int := 0;
BEGIN
  LOOP
    c := lpad((floor(random()*90000)+10000)::int::text, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.verification_codes WHERE code = c);
    i := i + 1;
    IF i > 200 THEN RAISE EXCEPTION 'Could not allocate verification code'; END IF;
  END LOOP;
  RETURN c;
END; $$;
REVOKE ALL ON FUNCTION public.generate_verification_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_verification_code() TO authenticated, service_role;

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active announcements" ON public.announcements
  FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "admins manage announcements" ON public.announcements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- extra columns
ALTER TABLE public.medical_reports ADD COLUMN IF NOT EXISTS verification_code text;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS verification_code text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS arrival_confirmed boolean NOT NULL DEFAULT false;

-- staff visibility on operational tables
CREATE POLICY "receptionists read payments" ON public.payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'receptionist'));
CREATE POLICY "receptionists update payments" ON public.payments
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'receptionist')) WITH CHECK (public.has_role(auth.uid(),'receptionist'));
CREATE POLICY "patients create own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "receptionists read reports" ON public.medical_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'receptionist'));
CREATE POLICY "staff read donors" ON public.blood_donors
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'receptionist'));
CREATE POLICY "doctors read prescriptions of their patients" ON public.prescriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'doctor'));

-- STORAGE policies for medical reports (bucket created separately)
CREATE POLICY "patients read own report files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'medical-reports' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "staff read report files" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'medical-reports' AND (
      public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'doctor') OR public.has_role(auth.uid(),'receptionist')
    )
  );
CREATE POLICY "staff upload report files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'medical-reports' AND (
      public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'doctor')
    )
  );
CREATE POLICY "staff update report files" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'medical-reports' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'doctor'))
  );
CREATE POLICY "admins delete report files" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'medical-reports' AND public.has_role(auth.uid(),'admin')
  );
