-- Create enums
CREATE TYPE public.app_role AS ENUM ('customer', 'hustler', 'admin');
CREATE TYPE public.hustler_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'declined', 'completed', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  UNIQUE (user_id, role)
);

-- Create hustler_profiles table (for hustler-specific info)
CREATE TABLE public.hustler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  id_number TEXT NOT NULL,
  police_affidavit_url TEXT NOT NULL,
  criminal_record_url TEXT NOT NULL,
  bio TEXT,
  skills TEXT[],
  status hustler_status NOT NULL DEFAULT 'pending',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_available BOOLEAN DEFAULT true,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service_categories table
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
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

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  hustler_id UUID REFERENCES public.hustler_profiles(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hustler_id UUID REFERENCES public.hustler_profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hustler_id UUID REFERENCES public.hustler_profiles(id) ON DELETE CASCADE NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, hustler_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create earnings table
CREATE TABLE public.earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hustler_id UUID REFERENCES public.hustler_profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hustler_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's hustler_profile id
CREATE OR REPLACE FUNCTION public.get_hustler_profile_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.hustler_profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own customer role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'customer');
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Hustler profiles policies
CREATE POLICY "Anyone can view approved hustlers" ON public.hustler_profiles FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own hustler profile" ON public.hustler_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hustler profile" ON public.hustler_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any hustler profile" ON public.hustler_profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Service categories policies (public read)
CREATE POLICY "Anyone can view categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.service_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Services policies
CREATE POLICY "Anyone can view active services from approved hustlers" ON public.services FOR SELECT USING (
  is_active = true AND EXISTS (
    SELECT 1 FROM public.hustler_profiles hp WHERE hp.id = hustler_id AND hp.status = 'approved'
  )
);
CREATE POLICY "Hustlers can manage own services" ON public.services FOR ALL USING (
  hustler_id = public.get_hustler_profile_id(auth.uid())
);

-- Bookings policies
CREATE POLICY "Customers can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Hustlers can view bookings for their services" ON public.bookings FOR SELECT USING (
  hustler_id = public.get_hustler_profile_id(auth.uid())
);
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Hustlers can update their bookings" ON public.bookings FOR UPDATE USING (
  hustler_id = public.get_hustler_profile_id(auth.uid())
);

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers can create reviews for completed bookings" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = customer_id AND EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid() AND b.status = 'completed'
  )
);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (
  auth.uid() = customer_id OR hustler_id = public.get_hustler_profile_id(auth.uid())
);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (
  auth.uid() = customer_id
);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id 
    AND (c.customer_id = auth.uid() OR c.hustler_id = public.get_hustler_profile_id(auth.uid()))
  )
);
CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id 
    AND (c.customer_id = auth.uid() OR c.hustler_id = public.get_hustler_profile_id(auth.uid()))
  )
);
CREATE POLICY "Users can mark messages as read" ON public.messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = conversation_id 
    AND (c.customer_id = auth.uid() OR c.hustler_id = public.get_hustler_profile_id(auth.uid()))
  )
);

-- Earnings policies
CREATE POLICY "Hustlers can view own earnings" ON public.earnings FOR SELECT USING (
  hustler_id = public.get_hustler_profile_id(auth.uid())
);
CREATE POLICY "System can insert earnings" ON public.earnings FOR INSERT WITH CHECK (true);

-- Function to create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, COALESCE(new.raw_user_meta_data ->> 'full_name', 'User'), new.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'customer');
  
  RETURN new;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update hustler average rating
CREATE OR REPLACE FUNCTION public.update_hustler_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.hustler_profiles
  SET 
    average_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.reviews WHERE hustler_id = NEW.hustler_id),
    total_reviews = (SELECT COUNT(*) FROM public.reviews WHERE hustler_id = NEW.hustler_id),
    updated_at = now()
  WHERE id = NEW.hustler_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_hustler_rating();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hustler_profiles_updated_at BEFORE UPDATE ON public.hustler_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.service_categories (name, icon) VALUES
  ('Cleaning', 'Sparkles'),
  ('Babysitting', 'Baby'),
  ('Gardening', 'Flower2'),
  ('DJing', 'Music'),
  ('Photography', 'Camera'),
  ('Tutoring', 'GraduationCap'),
  ('Pet Care', 'PawPrint'),
  ('Handyman', 'Wrench'),
  ('Moving', 'Truck'),
  ('Cooking', 'ChefHat'),
  ('Fitness', 'Dumbbell'),
  ('Beauty', 'Scissors');

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('service-media', 'service-media', true);

-- Storage policies for documents (private)
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Admins can view all documents" ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin')
);

-- Storage policies for avatars (public)
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload own avatar" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update own avatar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for service media (public)
CREATE POLICY "Anyone can view service media" ON storage.objects FOR SELECT USING (bucket_id = 'service-media');
CREATE POLICY "Hustlers can upload service media" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'service-media' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Hustlers can update service media" ON storage.objects FOR UPDATE USING (
  bucket_id = 'service-media' AND auth.uid()::text = (storage.foldername(name))[1]
);