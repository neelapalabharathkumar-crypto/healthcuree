-- ============ helpers ============
CREATE OR REPLACE FUNCTION private.is_platform_admin(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user AND role IN ('admin','super_admin'))
$$;

-- ============ hospitals ============
CREATE SEQUENCE IF NOT EXISTS public.hospital_code_seq START 1;

CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('H' || lpad(nextval('public.hospital_code_seq')::text, 3, '0')),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  type text NOT NULL DEFAULT 'General Hospital',
  description text,
  phone text,
  email text,
  website text,
  emergency_contact text,
  emergency_available boolean NOT NULL DEFAULT true,
  ambulance_available boolean NOT NULL DEFAULT false,
  beds integer,
  working_hours text,
  address text,
  area text,
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'India',
  pin_code text,
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospitals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.hospital_code_seq TO authenticated, service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hospitals_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "public read active hospitals" ON public.hospitals FOR SELECT USING (status = 'active');
CREATE POLICY "platform admins manage hospitals" ON public.hospitals FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));

-- ============ hospital staff ============
CREATE TABLE public.hospital_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  staff_type text NOT NULL CHECK (staff_type IN ('hospital_admin','doctor','receptionist')),
  staff_code text UNIQUE,
  employee_id text,
  full_name text,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospital_staff TO authenticated;
GRANT ALL ON public.hospital_staff TO service_role;
ALTER TABLE public.hospital_staff ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER hospital_staff_updated_at BEFORE UPDATE ON public.hospital_staff FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION private.hospital_of(_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT hospital_id FROM public.hospital_staff WHERE user_id = _user AND status = 'active' LIMIT 1
$$;

CREATE POLICY "staff read own staff row" ON public.hospital_staff FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hospital admins read own hospital staff" ON public.hospital_staff FOR SELECT TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid()));
CREATE POLICY "platform admins manage staff" ON public.hospital_staff FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));

-- ============ blood stock ============
CREATE TABLE public.blood_bank_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  blood_group text NOT NULL,
  units integer NOT NULL DEFAULT 0,
  contact text,
  request_status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, blood_group)
);
GRANT SELECT ON public.blood_bank_stock TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_bank_stock TO authenticated;
GRANT ALL ON public.blood_bank_stock TO service_role;
ALTER TABLE public.blood_bank_stock ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER blood_bank_stock_updated_at BEFORE UPDATE ON public.blood_bank_stock FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "public read blood stock" ON public.blood_bank_stock FOR SELECT USING (true);
CREATE POLICY "platform admins manage blood stock" ON public.blood_bank_stock FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
CREATE POLICY "hospital staff manage own blood stock" ON public.blood_bank_stock FOR ALL TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid())) WITH CHECK (hospital_id = private.hospital_of(auth.uid()));

-- ============ new columns ============
ALTER TABLE public.departments
  ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  ADD COLUMN consultation_fee numeric,
  ADD COLUMN available_days text[],
  ADD COLUMN available_time_start time,
  ADD COLUMN available_time_end time,
  ADD COLUMN emergency_available boolean NOT NULL DEFAULT false;
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_slug_key;

ALTER TABLE public.doctors
  ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  ADD COLUMN doctor_code text,
  ADD COLUMN gender text,
  ADD COLUMN phone text,
  ADD COLUMN email text,
  ADD COLUMN registration_number text,
  ADD COLUMN languages text[];

ALTER TABLE public.appointments
  ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  ADD COLUMN consultation_fee numeric;

ALTER TABLE public.payments
  ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  ADD COLUMN transaction_reference text,
  ADD COLUMN verification_code text;

ALTER TABLE public.prescriptions
  ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE,
  ADD COLUMN follow_up_date date;

ALTER TABLE public.medical_reports
  ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE;

ALTER TABLE public.verification_codes
  ADD COLUMN hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE;

-- ============ seed starter hospital + backfill ============
INSERT INTO public.hospitals (name, slug, type, description, city, state, pin_code, latitude, longitude, status, emergency_available, ambulance_available, beds, working_hours)
VALUES ('HealthCuree Multispeciality Hospital', 'healthcuree-multispeciality-hospital', 'Multispeciality Hospital',
        'Flagship HealthCuree AI hospital offering multispeciality care, diagnostics and 24x7 emergency services.',
        'Hyderabad', 'Telangana', '500081', 17.4435, 78.3772, 'active', true, true, 180, 'Mon-Sun, 24 hours');

UPDATE public.departments SET hospital_id = (SELECT id FROM public.hospitals ORDER BY created_at LIMIT 1) WHERE hospital_id IS NULL;
UPDATE public.doctors SET hospital_id = (SELECT id FROM public.hospitals ORDER BY created_at LIMIT 1) WHERE hospital_id IS NULL;
UPDATE public.appointments a SET hospital_id = d.hospital_id FROM public.doctors d WHERE d.id = a.doctor_id AND a.hospital_id IS NULL;
UPDATE public.verification_codes v SET hospital_id = a.hospital_id FROM public.appointments a WHERE a.id = v.appointment_id AND v.hospital_id IS NULL;
UPDATE public.payments p SET hospital_id = a.hospital_id FROM public.appointments a WHERE a.id = p.appointment_id AND p.hospital_id IS NULL;
UPDATE public.prescriptions r SET hospital_id = d.hospital_id FROM public.doctors d WHERE d.id = r.doctor_id AND r.hospital_id IS NULL;
UPDATE public.medical_reports m SET hospital_id = d.hospital_id FROM public.doctors d WHERE d.id = m.doctor_id AND m.hospital_id IS NULL;
UPDATE public.medical_reports SET hospital_id = (SELECT id FROM public.hospitals ORDER BY created_at LIMIT 1) WHERE hospital_id IS NULL;

ALTER TABLE public.departments ALTER COLUMN hospital_id SET NOT NULL;
ALTER TABLE public.doctors ALTER COLUMN hospital_id SET NOT NULL;

-- ============ auto-fill hospital on write ============
CREATE OR REPLACE FUNCTION public.tg_fill_hospital_from_doctor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.hospital_id IS NULL AND NEW.doctor_id IS NOT NULL THEN
    SELECT hospital_id INTO NEW.hospital_id FROM public.doctors WHERE id = NEW.doctor_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.tg_fill_hospital_from_doctor() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tg_fill_hospital_from_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.hospital_id IS NULL AND NEW.appointment_id IS NOT NULL THEN
    SELECT hospital_id INTO NEW.hospital_id FROM public.appointments WHERE id = NEW.appointment_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.tg_fill_hospital_from_appointment() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointments_fill_hospital BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_hospital_from_doctor();
CREATE TRIGGER prescriptions_fill_hospital BEFORE INSERT OR UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_hospital_from_doctor();
CREATE TRIGGER medical_reports_fill_hospital BEFORE INSERT OR UPDATE ON public.medical_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_hospital_from_doctor();
CREATE TRIGGER payments_fill_hospital BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_hospital_from_appointment();
CREATE TRIGGER verification_codes_fill_hospital BEFORE INSERT OR UPDATE ON public.verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.tg_fill_hospital_from_appointment();

-- ============ hospital-scoped access rules ============
-- appointments
DROP POLICY IF EXISTS "admins manage appts" ON public.appointments;
CREATE POLICY "platform admins manage appts" ON public.appointments FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "receptionists manage appts" ON public.appointments;
CREATE POLICY "hospital staff manage appts" ON public.appointments FOR ALL TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid()))
  WITH CHECK (hospital_id = private.hospital_of(auth.uid()));

-- payments
DROP POLICY IF EXISTS "admins manage payments" ON public.payments;
CREATE POLICY "platform admins manage payments" ON public.payments FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "receptionists read payments" ON public.payments;
DROP POLICY IF EXISTS "receptionists update payments" ON public.payments;
CREATE POLICY "hospital staff read payments" ON public.payments FOR SELECT TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid()));
CREATE POLICY "hospital staff update payments" ON public.payments FOR UPDATE TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid())) WITH CHECK (hospital_id = private.hospital_of(auth.uid()));

-- verification codes
DROP POLICY IF EXISTS "admins delete codes" ON public.verification_codes;
CREATE POLICY "platform admins manage codes" ON public.verification_codes FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "staff read codes" ON public.verification_codes;
DROP POLICY IF EXISTS "staff update codes" ON public.verification_codes;
CREATE POLICY "hospital staff read codes" ON public.verification_codes FOR SELECT TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid()));
CREATE POLICY "hospital staff update codes" ON public.verification_codes FOR UPDATE TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid())) WITH CHECK (hospital_id = private.hospital_of(auth.uid()));

-- medical reports
DROP POLICY IF EXISTS "admins manage reports" ON public.medical_reports;
CREATE POLICY "platform admins manage reports" ON public.medical_reports FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "receptionists read reports" ON public.medical_reports;
CREATE POLICY "hospital staff read reports" ON public.medical_reports FOR SELECT TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid()));

-- prescriptions
DROP POLICY IF EXISTS "admins manage rx" ON public.prescriptions;
CREATE POLICY "platform admins manage rx" ON public.prescriptions FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));

-- departments & doctors
DROP POLICY IF EXISTS "admins manage departments" ON public.departments;
CREATE POLICY "platform admins manage departments" ON public.departments FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
CREATE POLICY "hospital admins manage departments" ON public.departments FOR ALL TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid())) WITH CHECK (hospital_id = private.hospital_of(auth.uid()));

DROP POLICY IF EXISTS "admins manage doctors" ON public.doctors;
CREATE POLICY "platform admins manage doctors" ON public.doctors FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
CREATE POLICY "hospital admins manage doctors" ON public.doctors FOR ALL TO authenticated
  USING (hospital_id = private.hospital_of(auth.uid())) WITH CHECK (hospital_id = private.hospital_of(auth.uid()));

-- profiles: staff only see patients of their own hospital
DROP POLICY IF EXISTS "admins read profiles" ON public.profiles;
DROP POLICY IF EXISTS "admins manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "doctors read profiles" ON public.profiles;
DROP POLICY IF EXISTS "receptionists read profiles" ON public.profiles;
CREATE POLICY "platform admins manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
CREATE POLICY "hospital staff read patient profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = profiles.id AND a.hospital_id = private.hospital_of(auth.uid())
  ));

-- other admin-managed tables now include super admins
DROP POLICY IF EXISTS "admins manage announcements" ON public.announcements;
CREATE POLICY "platform admins manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "admins manage blogs" ON public.blogs;
CREATE POLICY "platform admins manage blogs" ON public.blogs FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "admins manage testimonials" ON public.testimonials;
CREATE POLICY "platform admins manage testimonials" ON public.testimonials FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "admins manage contact" ON public.contact_messages;
DROP POLICY IF EXISTS "admins read contact" ON public.contact_messages;
CREATE POLICY "platform admins manage contact" ON public.contact_messages FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
CREATE POLICY "platform admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "admins manage notifications" ON public.notifications;
CREATE POLICY "platform admins manage notifications" ON public.notifications FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "admins manage donors" ON public.blood_donors;
DROP POLICY IF EXISTS "staff read donors" ON public.blood_donors;
CREATE POLICY "platform admins manage donors" ON public.blood_donors FOR ALL TO authenticated
  USING (private.is_platform_admin(auth.uid())) WITH CHECK (private.is_platform_admin(auth.uid()));

-- storage: report files
DROP POLICY IF EXISTS "admins delete report files" ON storage.objects;
DROP POLICY IF EXISTS "staff read report files" ON storage.objects;
DROP POLICY IF EXISTS "staff update report files" ON storage.objects;
DROP POLICY IF EXISTS "staff upload report files" ON storage.objects;
CREATE POLICY "platform admins manage report files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'medical-reports' AND private.is_platform_admin(auth.uid()))
  WITH CHECK (bucket_id = 'medical-reports' AND private.is_platform_admin(auth.uid()));
CREATE POLICY "hospital staff read report files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'medical-reports' AND private.hospital_of(auth.uid()) IS NOT NULL);
CREATE POLICY "hospital staff upload report files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medical-reports' AND private.hospital_of(auth.uid()) IS NOT NULL);
CREATE POLICY "hospital staff update report files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'medical-reports' AND private.hospital_of(auth.uid()) IS NOT NULL)
  WITH CHECK (bucket_id = 'medical-reports' AND private.hospital_of(auth.uid()) IS NOT NULL);