CREATE TABLE public.blood_donors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  blood_group text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  age integer,
  last_donation_date date,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_donors TO authenticated;
GRANT ALL ON public.blood_donors TO service_role;

ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read available donors" ON public.blood_donors
FOR SELECT TO authenticated USING (is_available = true OR user_id = auth.uid());

CREATE POLICY "users insert own donor record" ON public.blood_donors
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "users update own donor record" ON public.blood_donors
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "users delete own donor record" ON public.blood_donors
FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "admins manage donors" ON public.blood_donors
FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER blood_donors_set_updated_at
BEFORE UPDATE ON public.blood_donors
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX blood_donors_search_idx ON public.blood_donors (state, city, blood_group) WHERE is_available;
