-- Add Entertainment category
INSERT INTO public.service_categories (name, icon)
VALUES ('Entertainment', 'PartyPopper');

-- Drop existing foreign keys that point to auth.users
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_customer_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_customer_id_fkey;

-- Add new foreign keys pointing to profiles table
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_customer_id_fkey
FOREIGN KEY (customer_id)
REFERENCES public.profiles(id);

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_customer_id_fkey
FOREIGN KEY (customer_id)
REFERENCES public.profiles(id);

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_customer_id_fkey
FOREIGN KEY (customer_id)
REFERENCES public.profiles(id);