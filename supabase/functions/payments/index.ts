// Hustle payments through Paystack, with Capvtal Innovations taking 10% of each service.
//
// How the money moves
//   Every approved hustler gets a Paystack *subaccount* linked to their bank account.
//   When a customer pays, Paystack splits the payment automatically:
//     • Capvtal (main account) receives 10% of the service price  (transaction_charge)
//     • the hustler (subaccount) receives the rest, including 100% of any tip
//   Paystack then settles both parties to their banks on its normal schedule.
//
// Actions (POST JSON { action, ... } with the user's Supabase session):
//   banks           → list South African banks for the payout form
//   payout-account  → { bank_code, account_number } create/update the hustler's subaccount
//   checkout        → { bookingId } start a Paystack payment for an accepted booking
//   verify          → { reference } confirm a payment after the customer returns
// Paystack webhooks (charge.success) are also received here, verified by signature.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   PAYSTACK_SECRET_KEY   sk_test_… while testing, sk_live_… in production
// Optional:
//   PAYSTACK_FEE_BEARER   "account" (default: Capvtal pays Paystack's processing fee)
//                         or "subaccount" (the hustler pays it)
//   SITE_URL              defaults to https://hustle.capvtal.com

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const PAYSTACK = "https://api.paystack.co";
const FEE_RATE = 0.10; // keep in sync with public.hustle_platform_fee_rate()
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://hustle.capvtal.com";
const SECRET = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

class UserError extends Error {}

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

async function paystack(path: string, init: RequestInit = {}) {
  if (!SECRET) throw new UserError("Payments aren't switched on yet. Please try again soon.");
  const res = await fetch(`${PAYSTACK}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.status === false) {
    console.error("Paystack error", path, res.status, body);
    throw new UserError(body.message || "The payment provider rejected the request");
  }
  return body.data;
}

/** A booking's paying origin: use the app the customer came from (localhost while testing). */
function originOf(req: Request) {
  const o = req.headers.get("origin");
  return o && /^https?:\/\//.test(o) ? o : SITE_URL;
}

// ---------- webhook ----------------------------------------------------------

async function hmacSha512Hex(key: string, data: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function markPaid(reference: string, amountCents: number) {
  const { error } = await admin.rpc("mark_booking_paid", { p_reference: reference, p_amount_cents: amountCents });
  if (error) throw error;
}

async function handleWebhook(req: Request, raw: string) {
  const expected = await hmacSha512Hex(SECRET, raw);
  if (!SECRET || req.headers.get("x-paystack-signature") !== expected) {
    return new Response("Invalid signature", { status: 401 });
  }
  const event = JSON.parse(raw);
  if (event.event === "charge.success" && event.data?.reference?.startsWith("hustle_")) {
    await markPaid(event.data.reference, Number(event.data.amount));
  }
  return new Response("ok");
}

// ---------- user actions -----------------------------------------------------

async function banks() {
  const data = await paystack("/bank?country=south%20africa&currency=ZAR&perPage=100");
  return (data as any[])
    .filter((b) => b.active !== false && !b.is_deleted)
    .map((b) => ({ code: b.code, name: b.name }));
}

async function payoutAccount(userId: string, body: any) {
  const bankCode = String(body.bank_code ?? "").trim();
  const accountNumber = String(body.account_number ?? "").replace(/\s+/g, "");
  if (!bankCode) throw new UserError("Choose your bank");
  if (!/^\d{6,16}$/.test(accountNumber)) throw new UserError("Enter a valid account number (digits only)");

  const { data: hp } = await admin
    .from("hustler_profiles")
    .select("id, status, profile:profiles!hustler_profiles_profile_fkey(full_name, email, phone)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!hp) throw new UserError("Only hustlers can add a payout account");
  if (hp.status !== "approved") throw new UserError("Your hustler profile must be approved first");

  const profile: any = hp.profile ?? {};
  const name = profile.full_name || profile.email || "Hustle hustler";
  const payload = {
    business_name: `${name} (Hustle)`,
    settlement_bank: bankCode,
    account_number: accountNumber,
    percentage_charge: FEE_RATE * 100, // default split; checkout overrides with a flat fee so tips stay with the hustler
    primary_contact_name: name,
    primary_contact_email: profile.email ?? undefined,
    primary_contact_phone: profile.phone ?? undefined,
    description: "Hustle by Capvtal Innovations",
  };

  const { data: existing } = await admin
    .from("hustler_payout_accounts")
    .select("paystack_subaccount_code")
    .eq("hustler_id", hp.id)
    .maybeSingle();

  const sub = existing
    ? await paystack(`/subaccount/${existing.paystack_subaccount_code}`, { method: "PUT", body: JSON.stringify(payload) })
    : await paystack("/subaccount", { method: "POST", body: JSON.stringify(payload) });

  const row = {
    hustler_id: hp.id,
    paystack_subaccount_code: sub.subaccount_code ?? existing?.paystack_subaccount_code,
    bank_code: bankCode,
    bank_name: sub.settlement_bank ?? body.bank_name ?? null,
    account_name: sub.account_name ?? null,
    account_last4: accountNumber.slice(-4),
    updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("hustler_payout_accounts").upsert(row);
  if (error) throw error;
  return { bank_name: row.bank_name, account_last4: row.account_last4, account_name: row.account_name };
}

async function checkout(req: Request, user: { id: string; email?: string }, body: any) {
  const bookingId = String(body.bookingId ?? "");
  const { data: b } = await admin
    .from("bookings")
    .select("id, customer_id, hustler_id, status, payment_status, total_price, service_amount, tip_amount, platform_fee, service:services(title)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b || b.customer_id !== user.id) throw new UserError("Booking not found");
  if (b.payment_status === "paid") throw new UserError("This booking is already paid");
  if (b.status !== "accepted") throw new UserError("You can pay once your hustler accepts the booking");

  const { data: payout } = await admin
    .from("hustler_payout_accounts")
    .select("paystack_subaccount_code")
    .eq("hustler_id", b.hustler_id)
    .maybeSingle();
  if (!payout) throw new UserError("This hustler hasn't set up payouts yet. Message them, or try again later.");

  const { data: profile } = await admin.from("profiles").select("email").eq("id", user.id).maybeSingle();
  const email = user.email || profile?.email;
  if (!email) throw new UserError("Add an email address to your profile to pay");

  const totalCents = Math.round(Number(b.total_price) * 100);
  const feeCents = Math.round(Number(b.platform_fee) * 100); // 10% of the service price, tip excluded
  const reference = `hustle_${b.id.slice(0, 8)}_${Date.now()}`;
  const origin = originOf(req);

  const tx = await paystack("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: totalCents,
      currency: "ZAR",
      reference,
      subaccount: payout.paystack_subaccount_code,
      transaction_charge: feeCents,
      bearer: Deno.env.get("PAYSTACK_FEE_BEARER") === "subaccount" ? "subaccount" : "account",
      callback_url: `${origin}/my-bookings?ref=${reference}`,
      metadata: {
        booking_id: b.id,
        service: (b.service as any)?.title,
        platform_fee: feeCents,
        tip: Math.round(Number(b.tip_amount ?? 0) * 100),
        cancel_action: `${origin}/my-bookings?payment=cancelled`,
      },
    }),
  });

  await admin.from("bookings").update({ payment_reference: reference, payment_status: "pending" }).eq("id", b.id);
  return { url: tx.authorization_url, reference };
}

async function verify(user: { id: string }, body: any) {
  const reference = String(body.reference ?? "");
  const { data: b } = await admin
    .from("bookings")
    .select("id, customer_id, payment_status")
    .eq("payment_reference", reference)
    .maybeSingle();
  if (!b || b.customer_id !== user.id) throw new UserError("Payment not found");
  if (b.payment_status === "paid") return { paid: true };

  const tx = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (tx.status === "success") {
    await markPaid(reference, Number(tx.amount));
    return { paid: true };
  }
  if (["failed", "abandoned", "reversed"].includes(tx.status)) {
    await admin.from("bookings").update({ payment_status: "failed" }).eq("id", b.id);
  }
  return { paid: false, status: tx.status };
}

// ---------- entry point ------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const raw = await req.text();
    if (req.headers.has("x-paystack-signature")) return await handleWebhook(req, raw);

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: auth } = await admin.auth.getUser(token);
    const user = auth?.user;
    if (!user) return json({ error: "Please sign in again" }, 401);

    const body = raw ? JSON.parse(raw) : {};
    switch (body.action) {
      case "banks":
        return json({ banks: await banks() });
      case "payout-account":
        return json(await payoutAccount(user.id, body));
      case "checkout":
        return json(await checkout(req, user, body));
      case "verify":
        return json(await verify(user, body));
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    if (err instanceof UserError) return json({ error: err.message }, 400);
    console.error(err);
    return json({ error: "Something went wrong with the payment. Please try again." }, 500);
  }
});
