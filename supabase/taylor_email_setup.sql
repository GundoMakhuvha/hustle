-- =====================================================================
-- HUSTLE: Taylor email updates
-- Run in Supabase → SQL Editor AFTER hustle_full_setup.sql.
-- Then fill in the two values in step 4 at the bottom. Safe to re-run.
-- =====================================================================

-- 1. Let users switch off non-essential emails (Settings page)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT true;

-- 2. Private settings table (no one can read it from the app; RLS with no policies)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 3. Call the "notify" Edge Function whenever something email-worthy happens
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

-- 4. FILL THESE IN, then run just this part:
--    notify_url    = https://<your-project-ref>.supabase.co/functions/v1/notify
--    notify_secret = the same random string you set as NOTIFY_WEBHOOK_SECRET
--
-- INSERT INTO public.app_config (key, value) VALUES
--   ('notify_url',    'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify'),
--   ('notify_secret', 'PASTE-YOUR-LONG-RANDOM-SECRET')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
