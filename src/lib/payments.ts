import { supabase } from "@/integrations/supabase/client";

/** Capvtal Innovations' commission on each service (tips go 100% to the hustler). */
export const PLATFORM_FEE_RATE = 0.1;

export const platformFee = (servicePrice: number) => Math.round(servicePrice * PLATFORM_FEE_RATE * 100) / 100;

/** Pull the friendly message out of a Supabase/Postgres/Edge Function error. */
export async function errorMessage(err: unknown, fallback = "Something went wrong. Please try again.") {
  const e = err as any;
  try {
    // Edge Function errors carry the JSON response body in `context`.
    if (e?.context && typeof e.context.json === "function") {
      const body = await e.context.json();
      if (body?.error) return String(body.error);
    }
  } catch {
    /* fall through */
  }
  if (typeof e?.message === "string" && e.message && !/non-2xx|fetch/i.test(e.message)) return e.message;
  return fallback;
}

async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("payments", { body: { action, ...body } });
  if (error) throw new Error(await errorMessage(error));
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const payments = {
  banks: () => call<{ banks: { code: string; name: string }[] }>("banks"),
  savePayoutAccount: (bank_code: string, account_number: string, bank_name?: string) =>
    call<{ bank_name: string | null; account_last4: string; account_name: string | null }>("payout-account", {
      bank_code,
      account_number,
      bank_name,
    }),
  checkout: (bookingId: string) => call<{ url: string; reference: string }>("checkout", { bookingId }),
  verify: (reference: string) => call<{ paid: boolean; status?: string }>("verify", { reference }),
};
