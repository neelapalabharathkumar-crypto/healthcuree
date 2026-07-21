
-- =========================================================
-- ROLES
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('patient','doctor','receptionist','admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- UPDATED_AT HELPER
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  blood_group TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "doctors read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'doctor'));
CREATE POLICY "receptionists read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'receptionist'));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile + patient role on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'patient') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- DEPARTMENTS
-- =========================================================
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.departments TO anon, authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active departments" ON public.departments FOR SELECT USING (is_active = TRUE);
CREATE POLICY "admins manage departments" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- DOCTORS
-- =========================================================
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  qualifications TEXT,
  experience_years INT DEFAULT 0,
  bio TEXT,
  image_url TEXT,
  consultation_fee NUMERIC(10,2) DEFAULT 0,
  available_days TEXT[] DEFAULT ARRAY['Mon','Tue','Wed','Thu','Fri']::TEXT[],
  available_time_start TIME DEFAULT '09:00',
  available_time_end TIME DEFAULT '17:00',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX doctors_department_idx ON public.doctors(department_id);
GRANT SELECT ON public.doctors TO anon, authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active doctors" ON public.doctors FOR SELECT USING (is_active = TRUE);
CREATE POLICY "doctors update self" ON public.doctors FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins manage doctors" ON public.doctors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- APPOINTMENTS
-- =========================================================
CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','completed','cancelled');

CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX appointments_patient_idx ON public.appointments(patient_id);
CREATE INDEX appointments_doctor_idx ON public.appointments(doctor_id);
CREATE INDEX appointments_date_idx ON public.appointments(appointment_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients read own appts" ON public.appointments FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "patients create own appts" ON public.appointments FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "patients cancel own appts" ON public.appointments FOR UPDATE TO authenticated USING (patient_id = auth.uid()) WITH CHECK (patient_id = auth.uid());
CREATE POLICY "doctors read their appts" ON public.appointments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = appointments.doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "doctors update their appts" ON public.appointments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = appointments.doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "receptionists manage appts" ON public.appointments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'receptionist')) WITH CHECK (public.has_role(auth.uid(),'receptionist'));
CREATE POLICY "admins manage appts" ON public.appointments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- PRESCRIPTIONS
-- =========================================================
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  diagnosis TEXT,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients read own rx" ON public.prescriptions FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "doctors manage own rx" ON public.prescriptions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = prescriptions.doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = prescriptions.doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "admins manage rx" ON public.prescriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- MEDICAL REPORTS
-- =========================================================
CREATE TABLE public.medical_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  report_type TEXT,
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_reports TO authenticated;
GRANT ALL ON public.medical_reports TO service_role;
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients read own reports" ON public.medical_reports FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "doctors manage own reports" ON public.medical_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = medical_reports.doctor_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = medical_reports.doctor_id AND d.user_id = auth.uid()));
CREATE POLICY "admins manage reports" ON public.medical_reports FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- PAYMENTS
-- =========================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',
  method TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients read own payments" ON public.payments FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "admins manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- CONTACT MESSAGES
-- =========================================================
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submit contact" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "admins read contact" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage contact" ON public.contact_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- BLOGS
-- =========================================================
CREATE TABLE public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author TEXT,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blogs TO anon, authenticated;
GRANT ALL ON public.blogs TO service_role;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published blogs" ON public.blogs FOR SELECT USING (published = TRUE);
CREATE POLICY "admins manage blogs" ON public.blogs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER blogs_updated_at BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- TESTIMONIALS
-- =========================================================
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  content TEXT NOT NULL,
  rating INT DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  image_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read approved testimonials" ON public.testimonials FOR SELECT USING (approved = TRUE);
CREATE POLICY "admins manage testimonials" ON public.testimonials FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- =========================================================
-- SEED DEPARTMENTS, DOCTORS, TESTIMONIALS, BLOGS
-- =========================================================
INSERT INTO public.departments (name, slug, description, icon) VALUES
  ('Cardiology','cardiology','Advanced heart care including ECG, echocardiography, angioplasty, and preventive cardiology.','Heart'),
  ('Neurology','neurology','Diagnosis and treatment of disorders of the brain, spine, and nervous system.','Brain'),
  ('Orthopedics','orthopedics','Bone, joint, and spine care including joint replacement and sports injuries.','Bone'),
  ('Pediatrics','pediatrics','Comprehensive care for infants, children, and adolescents.','Baby'),
  ('Gynecology','gynecology','Womens health, pregnancy care, and reproductive medicine.','Flower'),
  ('Dermatology','dermatology','Skin, hair, and nail treatments including cosmetic dermatology.','Sparkles'),
  ('ENT','ent','Ear, nose, and throat specialists for hearing, sinus, and voice disorders.','Ear'),
  ('General Medicine','general-medicine','Primary care and management of common illnesses and chronic conditions.','Stethoscope');

INSERT INTO public.doctors (department_id, full_name, specialization, qualifications, experience_years, bio, consultation_fee) VALUES
  ((SELECT id FROM public.departments WHERE slug='cardiology'), 'Dr. Anjali Rao', 'Interventional Cardiologist', 'MBBS, MD, DM Cardiology', 15, 'Expert in angioplasty and preventive cardiac care.', 700),
  ((SELECT id FROM public.departments WHERE slug='cardiology'), 'Dr. Vikram Shah', 'Cardiologist', 'MBBS, MD', 10, 'Focus on hypertension and lipid management.', 600),
  ((SELECT id FROM public.departments WHERE slug='neurology'), 'Dr. Suresh Kumar', 'Neurologist', 'MBBS, DM Neurology', 12, 'Specialist in stroke and epilepsy management.', 800),
  ((SELECT id FROM public.departments WHERE slug='orthopedics'), 'Dr. Priya Menon', 'Orthopedic Surgeon', 'MBBS, MS Ortho', 14, 'Joint replacement and sports injuries.', 750),
  ((SELECT id FROM public.departments WHERE slug='pediatrics'), 'Dr. Ravi Teja', 'Pediatrician', 'MBBS, MD Pediatrics', 9, 'Newborn and adolescent care.', 500),
  ((SELECT id FROM public.departments WHERE slug='gynecology'), 'Dr. Lakshmi Devi', 'Gynecologist & Obstetrician', 'MBBS, MS OBG', 16, 'High-risk pregnancy and laparoscopic surgery.', 700),
  ((SELECT id FROM public.departments WHERE slug='dermatology'), 'Dr. Neha Verma', 'Dermatologist', 'MBBS, MD Derm', 8, 'Acne, pigmentation, and cosmetic dermatology.', 600),
  ((SELECT id FROM public.departments WHERE slug='ent'), 'Dr. Arjun Rao', 'ENT Surgeon', 'MBBS, MS ENT', 11, 'Sinus, hearing and voice specialists.', 550),
  ((SELECT id FROM public.departments WHERE slug='general-medicine'), 'Dr. Meera Iyer', 'General Physician', 'MBBS, MD Medicine', 13, 'Preventive care and chronic disease management.', 400);

INSERT INTO public.testimonials (name, role, content, rating, approved) VALUES
  ('Ramesh K.', 'Patient', 'HealthCuree AI made booking my cardiology appointment effortless. The AI assistant guided me to the right specialist.', 5, TRUE),
  ('Sunitha P.', 'Patient', 'Excellent care and modern facilities. Digital reports and prescriptions saved us so much time.', 5, TRUE),
  ('Karthik R.', 'Patient', 'The doctors are experienced and the staff is genuinely caring. Highly recommend for families.', 5, TRUE);

INSERT INTO public.blogs (slug, title, excerpt, content, author, published) VALUES
  ('understanding-heart-health','Understanding Heart Health: 7 Habits That Matter','Small daily habits that protect your heart for decades.','Heart disease remains a leading cause of illness worldwide. Simple, consistent habits — 30 minutes of daily activity, a Mediterranean-style diet, quality sleep, stress management, avoiding tobacco, moderating alcohol, and annual screenings — dramatically lower risk. Talk to your cardiologist about personalized targets for blood pressure, cholesterol, and blood sugar.','Dr. Anjali Rao', TRUE),
  ('when-to-see-a-neurologist','When Should You See a Neurologist?','Warning signs that deserve a specialist opinion.','Persistent headaches, numbness, sudden weakness, unexplained dizziness, or memory changes should be evaluated by a neurologist. Early diagnosis of conditions such as migraine, epilepsy, or stroke risk changes outcomes significantly.','Dr. Suresh Kumar', TRUE),
  ('childhood-vaccination-guide','A Parents Guide to Childhood Vaccinations','Vaccines every parent should know about.','Vaccination protects children from serious infectious diseases. Follow the national immunization schedule and consult your pediatrician about optional vaccines such as influenza and HPV at appropriate ages.','Dr. Ravi Teja', TRUE);
