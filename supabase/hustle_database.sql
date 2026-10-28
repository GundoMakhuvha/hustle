-- =====================================================================
-- HUSTLE: complete database for a NEW Supabase project
-- Capvtal Innovations organisation  ·  project: hustle
--
-- HOW TO USE
--   1. Supabase → Capvtal Innovations org → New project → name it "hustle"
--      (region: South Africa / Cape Town if offered, otherwise closest).
--   2. Open SQL Editor → New query → paste this whole file → Run.
--   3. Do the two short "AFTER" steps at the very bottom.
--
-- Includes: tables, security rules, triggers, categories, live chat,
-- storage buckets, Google sign-in profiles, and Taylor email updates.
-- Safe to run more than once.
-- =====================================================================

-- ---------- 1. Types --------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('customer', 'hustler', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hustler_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'declined', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 2. Tables -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'customer',
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.hustler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  id_number TEXT NOT NULL,
  police_affidavit_url TEXT NOT NULL,
  criminal_record_url TEXT NOT NULL,
  bio TEXT,
  skills TEXT[],
  status public.hustler_status NOT NULL DEFAULT 'pending',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_available BOOLEAN DEFAULT true,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hustler_id UUID REFERENCES public.hustler_profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  price_type TEXT DEFAULT 'fixed',
  photos TEXT[],
  videos TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- customer_id points at profiles so the app can join customer names.
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  hustler_id UUID REFERENCES public.hustler_profiles(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hustler_id UUID REFERENCES public.hustler_profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  hustler_id UUID REFERENCES public.hustler_profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, hustler_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hustler_id UUID REFERENCES public.hustler_profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email preference (used by Taylor email updates)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_services_hustler ON public.services(hustler_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_hustler ON public.bookings(hustler_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_hustler ON public.reviews(hustler_id);

-- ---------- 3. Helper functions ---------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_hustler_profile_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.hustler_profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ---------- 4. Row Level Security ------------------------------------
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hustler_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings           ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own customer role" ON public.user_roles;
CREATE POLICY "Users can insert own customer role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'customer');
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Hustler profiles
DROP POLICY IF EXISTS "Anyone can view approved hustlers" ON public.hustler_profiles;
CREATE POLICY "Anyone can view approved hustlers" ON public.hustler_profiles FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users can create own hustler profile" ON public.hustler_profiles;
CREATE POLICY "Users can create own hustler profile" ON public.hustler_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own hustler profile" ON public.hustler_profiles;
CREATE POLICY "Users can update own hustler profile" ON public.hustler_profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can update any hustler profile" ON public.hustler_profiles;
CREATE POLICY "Admins can update any hustler profile" ON public.hustler_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Stop hustlers approving themselves: only admins may change status.
CREATE OR REPLACE FUNCTION public.protect_hustler_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- auth.uid() is NULL in the SQL Editor / service role, so admins can still approve there.
  IF NEW.status IS DISTINCT FROM OLD.status
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.status := OLD.status;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_hustler_status ON public.hustler_profiles;
CREATE TRIGGER protect_hustler_status BEFORE UPDATE ON public.hustler_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_hustler_status();

-- Service categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.service_categories;
CREATE POLICY "Anyone can view categories" ON public.service_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage categories" ON public.service_categories;
CREATE POLICY "Admins can manage categories" ON public.service_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Services
DROP POLICY IF EXISTS "Anyone can view active services from approved hustlers" ON public.services;
CREATE POLICY "Anyone can view active services from approved hustlers" ON public.services FOR SELECT USING (
  is_active = true AND EXISTS (SELECT 1 FROM public.hustler_profiles hp WHERE hp.id = hustler_id AND hp.status = 'approved')
);
DROP POLICY IF EXISTS "Hustlers can manage own services" ON public.services;
CREATE POLICY "Hustlers can manage own services" ON public.services FOR ALL
  USING (hustler_id = public.get_hustler_profile_id(auth.uid()));

-- Bookings
DROP POLICY IF EXISTS "Customers can view own bookings" ON public.bookings;
CREATE POLICY "Customers can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Hustlers can view bookings for their services" ON public.bookings;
CREATE POLICY "Hustlers can view bookings for their services" ON public.bookings FOR SELECT
  USING (hustler_id = public.get_hustler_profile_id(auth.uid()));
DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Customers can update own bookings" ON public.bookings;
CREATE POLICY "Customers can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Hustlers can update their bookings" ON public.bookings;
CREATE POLICY "Hustlers can update their bookings" ON public.bookings FOR UPDATE
  USING (hustler_id = public.get_hustler_profile_id(auth.uid()));

-- Reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Customers can create reviews for completed bookings" ON public.reviews;
CREATE POLICY "Customers can create reviews for completed bookings" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = customer_id AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid() AND b.status = 'completed'
  )
);

-- Conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT
  USING (auth.uid() = customer_id OR hustler_id = public.get_hustler_profile_id(auth.uid()));
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = customer_id);
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
CREATE POLICY "Participants can update conversations" ON public.conversations FOR UPDATE
  USING (auth.uid() = customer_id OR hustler_id = public.get_hustler_profile_id(auth.uid()));

-- Messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
          AND (c.customer_id = auth.uid() OR c.hustler_id = public.get_hustler_profile_id(auth.uid())))
);
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
    AND (c.customer_id = auth.uid() OR c.hustler_id = public.get_hustler_profile_id(auth.uid())))
);
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY "Users can mark messages as read" ON public.messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id
          AND (c.customer_id = auth.uid() OR c.hustler_id = public.get_hustler_profile_id(auth.uid())))
);

-- Earnings
DROP POLICY IF EXISTS "Hustlers can view own earnings" ON public.earnings;
CREATE POLICY "Hustlers can view own earnings" ON public.earnings FOR SELECT
  USING (hustler_id = public.get_hustler_profile_id(auth.uid()));
DROP POLICY IF EXISTS "System can insert earnings" ON public.earnings;
DROP POLICY IF EXISTS "Earnings inserted on booking completion" ON public.earnings;
CREATE POLICY "Earnings inserted on booking completion" ON public.earnings FOR INSERT WITH CHECK (
  hustler_id = public.get_hustler_profile_id(auth.uid()) OR public.has_role(auth.uid(), 'admin')
);

-- ---------- 5. Triggers ----------------------------------------------
-- New sign-up → profile + customer role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Email sign-ups send full_name; Google sends full_name/name and avatar_url/picture.
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1), 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture')
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- New hustler application → give the 'hustler' role (status still starts as pending)
CREATE OR REPLACE FUNCTION public.handle_new_hustler()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'hustler')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_hustler_profile_created ON public.hustler_profiles;
CREATE TRIGGER on_hustler_profile_created AFTER INSERT ON public.hustler_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_hustler();

-- Keep hustler rating in sync with reviews
CREATE OR REPLACE FUNCTION public.update_hustler_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.hustler_profiles SET
    average_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.reviews WHERE hustler_id = NEW.hustler_id),
    total_reviews  = (SELECT COUNT(*) FROM public.reviews WHERE hustler_id = NEW.hustler_id),
    updated_at = now()
  WHERE id = NEW.hustler_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_hustler_rating();

-- Bump conversation when a message is sent (sorts the inbox)
CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

-- updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_hustler_profiles_updated_at ON public.hustler_profiles;
CREATE TRIGGER update_hustler_profiles_updated_at BEFORE UPDATE ON public.hustler_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 6. Default categories -------------------------------------
INSERT INTO public.service_categories (name, icon) VALUES
  ('Cleaning', 'Sparkles'), ('Babysitting', 'Baby'), ('Gardening', 'Flower2'),
  ('DJing', 'Music'), ('Photography', 'Camera'), ('Tutoring', 'GraduationCap'),
  ('Pet Care', 'PawPrint'), ('Handyman', 'Wrench'), ('Moving', 'Truck'),
  ('Cooking', 'ChefHat'), ('Fitness', 'Dumbbell'), ('Beauty', 'Scissors'),
  ('Entertainment', 'PartyPopper')
ON CONFLICT (name) DO NOTHING;

-- ---------- 7. Realtime chat ------------------------------------------
ALTER TABLE public.messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 8. Storage buckets + rules --------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('documents', 'documents', false),
  ('avatars', 'avatars', true),
  ('service-media', 'service-media', true)
ON CONFLICT (id) DO NOTHING;

-- Documents (private: owner + admins only)
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Admins can view all documents" ON storage.objects;
CREATE POLICY "Admins can view all documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

-- Avatars (public read, owner write)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service media (public read; the app uploads into a folder named after the
-- hustler profile id, so allow either that or the user id)
DROP POLICY IF EXISTS "Anyone can view service media" ON storage.objects;
CREATE POLICY "Anyone can view service media" ON storage.objects FOR SELECT USING (bucket_id = 'service-media');
DROP POLICY IF EXISTS "Hustlers can upload service media" ON storage.objects;
CREATE POLICY "Hustlers can upload service media" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'service-media' AND (storage.foldername(name))[1] IN (
    auth.uid()::text, public.get_hustler_profile_id(auth.uid())::text)
);
DROP POLICY IF EXISTS "Hustlers can update service media" ON storage.objects;
CREATE POLICY "Hustlers can update service media" ON storage.objects FOR UPDATE USING (
  bucket_id = 'service-media' AND (storage.foldername(name))[1] IN (
    auth.uid()::text, public.get_hustler_profile_id(auth.uid())::text)
);
DROP POLICY IF EXISTS "Hustlers can delete service media" ON storage.objects;
CREATE POLICY "Hustlers can delete service media" ON storage.objects FOR DELETE USING (
  bucket_id = 'service-media' AND (storage.foldername(name))[1] IN (
    auth.uid()::text, public.get_hustler_profile_id(auth.uid())::text)
);


-- ---------- 9. Taylor emails: let users switch off non-essential emails (Settings page)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true;

-- ---------- 10. Private settings table (no one can read it from the app; RLS with no policies)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- ---------- 11. Call the "notify" Edge Function whenever something email-worthy happens
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_taylor()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  fn_url TEXT;
  secret TEXT;
BEGIN
  SELECT value INTO fn_url FROM public.app_config WHERE key = 'notify_url';
  SELECT value INTO secret FROM public.app_config WHERE key = 'notify_secret';

  -- Not configured yet: do nothing, the app keeps working.
  IF fn_url IS NULL OR secret IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Only send for status changes on updates (ignore edits like notes or ratings).
  IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) ->> 'status') IS NOT DISTINCT FROM (to_jsonb(OLD) ->> 'status') THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END
    )
  );
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Never block a booking or sign-up because an email couldn't be queued.
  RAISE WARNING 'notify_taylor failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS taylor_profiles ON public.profiles;
CREATE TRIGGER taylor_profiles AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_taylor();

DROP TRIGGER IF EXISTS taylor_bookings ON public.bookings;
CREATE TRIGGER taylor_bookings AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_taylor();

DROP TRIGGER IF EXISTS taylor_hustlers ON public.hustler_profiles;
CREATE TRIGGER taylor_hustlers AFTER INSERT OR UPDATE OF status ON public.hustler_profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_taylor();

DROP TRIGGER IF EXISTS taylor_messages ON public.messages;
CREATE TRIGGER taylor_messages AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_taylor();


-- =====================================================================
-- AFTER STEP A: make yourself admin
-- Sign up in the app first (email or Google), then run:
--
--   INSERT INTO public.user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users
--   WHERE email IN ('gundo@capvtal.com', 'makhuvhagundo4@gmail.com')
--   ON CONFLICT DO NOTHING;
--
-- AFTER STEP B: switch on Taylor emails (once the "notify" function is
-- deployed and its secrets are set). Replace the two values, then run:
--
--   INSERT INTO public.app_config (key, value) VALUES
--     ('notify_url',    'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify'),
--     ('notify_secret', 'PASTE-THE-SAME-NOTIFY_WEBHOOK_SECRET')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- Until step B is done the app works normally; emails just don't send.
-- =====================================================================
