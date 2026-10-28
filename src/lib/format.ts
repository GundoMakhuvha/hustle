const zar = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return zar.format(Number.isFinite(n) ? n : 0).replace(/\u00a0/g, " ");
}

export function formatPriceType(type?: string | null) {
  switch ((type || "fixed").toLowerCase()) {
    case "hourly":
    case "hour":
      return "per hour";
    case "daily":
    case "day":
      return "per day";
    case "session":
      return "per session";
    default:
      return "fixed price";
  }
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Strip characters that would break a PostgREST `or()` filter. */
export function sanitizeSearch(q: string) {
  return q.replace(/[,()%*\\]/g, " ").trim().slice(0, 80);
}
