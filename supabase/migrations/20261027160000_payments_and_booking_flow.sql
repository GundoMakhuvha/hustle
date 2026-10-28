-- Hustle: Paystack payments (Capvtal 10%), booking approve/decline flow, My bookings fix.
-- Applied to project etqsuaxtvcmjstyjtrep on 2026-10-27. Kept here as the record of the change.

-- 1. Let the API embed a hustler's profile (fixes "My bookings" 400 error)
do $$ begin
  alter table public.hustler_profiles
    add constraint hustler_profiles_profile_fkey foreign key (user_id) references public.profiles(id) on delete cascade;
exception when duplicate_object then null; end $$;

-- 2. Payment fields on bookings
alter table public.bookings
  add column if not exists service_amount numeric(12,2),
  add column if not exists tip_amount numeric(12,2) not null default 0,
  add column if not exists platform_fee numeric(12,2),
  add column if not exists hustler_amount numeric(12,2),
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','pending','paid','refunded','failed')),
  add column if not exists payment_reference text unique,
  add column if not exists paid_at timestamptz,
  add column if not exists decline_reason text;

-- Capvtal's commission, defined in one place (10% of the service price; tips go 100% to the hustler)
create or replace function public.hustle_platform_fee_rate()
returns numeric language sql immutable as $$ select 0.10::numeric $$;

update public.bookings b set
  service_amount = s.price,
  tip_amount = greatest(b.total_price - s.price, 0),
  platform_fee = round(s.price * public.hustle_platform_fee_rate(), 2),
  hustler_amount = b.total_price - round(s.price * public.hustle_platform_fee_rate(), 2)
from public.services s where s.id = b.service_id and b.service_amount is null;

-- 3. Private payout accounts (Paystack subaccounts). Never public; written only by the payments function.
create table if not exists public.hustler_payout_accounts (
  hustler_id uuid primary key references public.hustler_profiles(id) on delete cascade,
  paystack_subaccount_code text not null,
  bank_code text not null,
  bank_name text,
  account_name text,
  account_last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hustler_payout_accounts enable row level security;
drop policy if exists "Hustlers view own payout account" on public.hustler_payout_accounts;
create policy "Hustlers view own payout account" on public.hustler_payout_accounts
  for select to authenticated using (hustler_id = public.get_hustler_profile_id(auth.uid()));
drop policy if exists "Admins view payout accounts" on public.hustler_payout_accounts;
create policy "Admins view payout accounts" on public.hustler_payout_accounts
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Can this hustler take card payments? (exposes no bank details)
create or replace function public.hustler_accepts_payments(_hustler_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.hustler_payout_accounts where hustler_id = _hustler_id)
$$;

-- 4. Earnings: one row per paid booking, written by the server only
alter table public.earnings
  add column if not exists gross_amount numeric(12,2),
  add column if not exists platform_fee numeric(12,2);
create unique index if not exists earnings_booking_id_key on public.earnings(booking_id);
-- earnings are now written only by mark_booking_paid(); app users can no longer insert them
alter policy "Earnings inserted on booking completion" on public.earnings with check (public.has_role(auth.uid(), 'admin'));

-- 5. Booking guard: the server sets prices; status changes follow request → accept → pay → complete
create or replace function public.guard_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  svc record;
  uid uuid := auth.uid();
  my_hustler uuid;
  is_hustler boolean;
begin
  if tg_op = 'INSERT' then
    select price, hustler_id into svc from public.services where id = new.service_id and is_active;
    if not found then raise exception 'This service is no longer available'; end if;
    new.hustler_id := svc.hustler_id;
    new.service_amount := svc.price;
    new.tip_amount := least(greatest(coalesce(new.tip_amount, 0), 0), 5000);
    new.total_price := svc.price + new.tip_amount;
    new.platform_fee := round(svc.price * public.hustle_platform_fee_rate(), 2);
    new.hustler_amount := new.total_price - new.platform_fee;
    if uid is not null then
      new.status := 'pending';
      new.payment_status := 'unpaid';
      new.payment_reference := null;
      new.paid_at := null;
    end if;
    return new;
  end if;

  -- service role / SQL editor / admins may do anything
  if uid is null or public.has_role(uid, 'admin') then return new; end if;

  -- money and parties can't be changed from the app
  new.customer_id := old.customer_id;
  new.hustler_id := old.hustler_id;
  new.service_id := old.service_id;
  new.service_amount := old.service_amount;
  new.tip_amount := old.tip_amount;
  new.total_price := old.total_price;
  new.platform_fee := old.platform_fee;
  new.hustler_amount := old.hustler_amount;
  new.payment_status := old.payment_status;
  new.payment_reference := old.payment_reference;
  new.paid_at := old.paid_at;

  my_hustler := public.get_hustler_profile_id(uid);
  is_hustler := my_hustler is not null and my_hustler = old.hustler_id;
  if not is_hustler then new.decline_reason := old.decline_reason; end if;

  if new.status is distinct from old.status then
    if is_hustler then
      if old.status = 'accepted' and new.status = 'completed' and old.payment_status <> 'paid' then
        raise exception 'The customer needs to pay before you can mark this job complete';
      end if;
      if not (
        (old.status = 'pending'  and new.status in ('accepted','declined')) or
        (old.status = 'accepted' and new.status = 'completed') or
        (old.status = 'accepted' and new.status = 'declined' and old.payment_status <> 'paid')
      ) then
        raise exception 'You can''t change this booking from % to %', old.status, new.status;
      end if;
    elsif uid = old.customer_id then
      if old.payment_status = 'paid' then
        raise exception 'This booking is paid. Message your hustler or contact support to cancel';
      end if;
      if not (old.status in ('pending','accepted') and new.status = 'cancelled') then
        raise exception 'You can''t change this booking';
      end if;
    else
      raise exception 'Not allowed';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_booking on public.bookings;
create trigger guard_booking before insert or update on public.bookings
  for each row execute function public.guard_booking();

-- 6. Mark a booking paid (called only by the payments edge function with the service role)
create or replace function public.mark_booking_paid(p_reference text, p_amount_cents bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare b record;
begin
  select * into b from public.bookings where payment_reference = p_reference for update;
  if not found then raise exception 'Unknown payment reference %', p_reference; end if;
  if b.payment_status = 'paid' then return b.id; end if;
  if p_amount_cents < round(b.total_price * 100) then
    raise exception 'Amount paid (%) is less than booking total (%)', p_amount_cents, round(b.total_price*100);
  end if;
  update public.bookings set payment_status = 'paid', paid_at = now() where id = b.id;
  insert into public.earnings (hustler_id, booking_id, amount, gross_amount, platform_fee)
    values (b.hustler_id, b.id, b.hustler_amount, b.total_price, b.platform_fee)
    on conflict (booking_id) do nothing;
  update public.hustler_profiles hp
    set total_earnings = (select coalesce(sum(amount),0) from public.earnings e where e.hustler_id = hp.id)
    where hp.id = b.hustler_id;
  return b.id;
end $$;
revoke all on function public.mark_booking_paid(text, bigint) from public, anon, authenticated;

-- 7. Email (via Taylor) on payment as well as on status change
create or replace function public.notify_taylor()
returns trigger language plpgsql security definer set search_path = public as $$
DECLARE
  fn_url TEXT;
  secret TEXT;
BEGIN
  SELECT value INTO fn_url FROM public.app_config WHERE key = 'notify_url';
  SELECT value INTO secret FROM public.app_config WHERE key = 'notify_secret';
  IF fn_url IS NULL OR secret IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) ->> 'status') IS NOT DISTINCT FROM (to_jsonb(OLD) ->> 'status')
     AND (to_jsonb(NEW) ->> 'payment_status') IS NOT DISTINCT FROM (to_jsonb(OLD) ->> 'payment_status') THEN
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
  RAISE WARNING 'notify_taylor failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;
drop trigger if exists taylor_bookings on public.bookings;
create trigger taylor_bookings after insert or update of status, payment_status on public.bookings
  for each row execute function public.notify_taylor();

notify pgrst, 'reload schema';

-- 8. Hardening (from the Supabase security advisor)
alter function public.hustle_platform_fee_rate() set search_path = public;
revoke execute on function public.guard_booking() from public, anon, authenticated;
revoke execute on function public.hustler_accepts_payments(uuid) from anon;
