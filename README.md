# Hustle

**Trusted local services, booked in minutes.** Hustle is a marketplace that connects customers in South Africa with verified, background-checked service providers ("hustlers") for cleaning, beauty, repairs, tutoring, events and more.

A **Capvtal Innovations** product · Powered by **Taylor AI** · Live at **https://hustle.capvtal.com**

---

## Features

- **Customers:** browse and search with category, sort and "near me" filters; save favourite hustlers; book a date and time; pay securely with Stripe (with tips); chat in real time; leave reviews.
- **Hustlers:** apply with ID, police affidavit and criminal record clearance; manage services, bookings, earnings and reviews; set availability.
- **Admins:** review and approve hustler applications.
- **Same-day bookings** with only valid upcoming time slots.
- **Email updates from Taylor** for bookings, applications and messages.
- **Sign-in:** email + password, password reset, and Continue with Google.
- **Platform:** responsive web app (desktop header + mobile bottom nav), light/dark/system theme, installable PWA manifest, SEO and social-share metadata, Help/FAQ, Terms, and a POPIA-aligned Privacy Policy.

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui · TanStack Query · Supabase (Auth, Postgres, Storage, Realtime, Edge Functions) · Stripe Checkout

## Getting started

```sh
npm install
cp .env.example .env   # then fill in your Supabase values
npm run dev            # http://localhost:8080
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Environment variables

| Name | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon (public) key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |

Edge function secrets (set in Supabase → Edge Functions → Secrets): `STRIPE_SECRET_KEY`.

## Database

Hustle has its own Supabase project inside the **Capvtal Innovations** organisation.

1. Create the project (name: `hustle`), open **SQL Editor**, paste `supabase/hustle_database.sql` and run it.
2. Deploy the functions:

```sh
npx supabase link --project-ref <your-ref>
npx supabase functions deploy create-booking-payment
npx supabase functions deploy notify
```

3. Follow the two "AFTER" steps at the bottom of `hustle_database.sql` (make yourself admin, switch on Taylor emails).

In Supabase → Authentication → URL Configuration set:
- **Site URL:** `https://hustle.capvtal.com`
- **Redirect URLs:** `https://hustle.capvtal.com/**`, `http://localhost:8080/**`

## Sign in with Google

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** (type: Web application).
   - Authorised JavaScript origins: `https://hustle.capvtal.com` and `http://localhost:8080`
   - Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. In Supabase → Authentication → Sign In / Providers → **Google**, switch it on and paste the Client ID and Client Secret.
3. Make sure the Redirect URLs above include `https://hustle.capvtal.com/**`.

## Email updates from Taylor

Hustle emails people automatically, signed by **Taylor** and sent from `taylor@capvtal.com`:

| When | Who gets it |
| --- | --- |
| Someone signs up | New user (welcome) |
| Booking requested | Hustler (new request) and customer (request sent) |
| Booking accepted / declined / completed | Customer |
| Booking cancelled | Hustler |
| Hustler application submitted | Applicant and all admins |
| Application approved / rejected | Applicant |
| First unread chat message | Recipient |

Users can switch off non-essential emails in **Settings**.

**Setup**
1. Create a free account at [resend.com](https://resend.com), add the domain `capvtal.com`, and add the DNS records it shows you (SPF/DKIM) at your DNS provider. Create an API key.
2. Deploy the function: `npx supabase functions deploy notify`
3. In Supabase → Edge Functions → Secrets add:
   - `RESEND_API_KEY` = your Resend key
   - `NOTIFY_WEBHOOK_SECRET` = any long random string
   - optional `TAYLOR_WEBHOOK_URL` / `TAYLOR_WEBHOOK_SECRET` to also forward every event to Taylor's own app
4. Run "AFTER STEP B" at the bottom of `supabase/hustle_database.sql` with your project URL and the same secret.

## Deploying to hustle.capvtal.com (Vercel)

1. Push this repo to GitHub and import it in Vercel. `vercel.json` already configures the Vite build, SPA routing, caching and security headers.
2. Add the `VITE_*` environment variables in Vercel → Settings → Environment Variables.
3. In Vercel → Settings → Domains, add `hustle.capvtal.com`.
4. At your DNS provider for `capvtal.com`, add a **CNAME** record: `hustle` → `cname.vercel-dns.com`.

## Brand & config

- Contact email, company links, platform fee and the Taylor AI link: `src/config/site.ts`
- Logos: `src/components/brand/` (Hustle wing mark and Taylor AI energy-core mark)
- Icons and share image: `public/`
- Category photos: free Unsplash images, set in `src/lib/categories.ts`

## Project structure

```
src/
  components/      Layout, Footer, ServiceCard, BookingModal, brand/, dashboard/, ui/
  config/site.ts   Brand + contact settings
  contexts/        AuthContext
  hooks/           Data hooks (services, messages, favourites, location)
  lib/             Formatting + category helpers
  pages/           Route pages
supabase/          Migrations, edge functions, config
```

© Capvtal Innovations. All rights reserved.

## Payments (Paystack) and the 10% Capvtal fee

Booking flow: **customer requests → hustler accepts or declines → customer pays → hustler completes the job.**
Emails go out at every step (Taylor, via the `notify` function).

Money is split automatically by Paystack:

| | Who gets it |
|---|---|
| 10% of the service price | Capvtal Innovations (main Paystack account) |
| 90% of the service price + 100% of tips | The hustler (their Paystack subaccount) |

The database works out every amount (`guard_booking` trigger, `hustle_platform_fee_rate()`), so prices can't be changed from the browser.

### Switching payments on
1. Create a Paystack account for Capvtal Innovations (paystack.com, South Africa, ZAR).
2. Supabase → Edge Functions → Secrets: add `PAYSTACK_SECRET_KEY` (use the `sk_test_…` key first).
   Optional: `PAYSTACK_FEE_BEARER=subaccount` if hustlers should pay Paystack's processing fee (default: Capvtal pays it).
3. Paystack → Settings → API Keys & Webhooks → Webhook URL:
   `https://etqsuaxtvcmjstyjtrep.supabase.co/functions/v1/payments`
4. Each hustler adds their bank account in **Dashboard → Earnings → Payout account**. Customers can only pay hustlers who have done this.

Edge functions: `payments` (checkout, verify, payout accounts, webhook) and `notify` (emails). The old Stripe function is in `supabase/_retired/`.
