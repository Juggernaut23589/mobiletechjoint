/**
 * Prices are stored as integer kobo in the database (see migration notes).
 * These are the ONLY functions that should convert between kobo and naira —
 * never do `/ 100` inline elsewhere, so there is exactly one place to fix
 * if the convention ever changes.
 */

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(koboToNaira(kobo));
}

/** Whole-percent discount, or null if there's no real "was" price to
 *  compare against. Rounds down so the badge never overstates the saving. */
export function discountPercent(priceKobo: number, compareAtKobo: number | null): number | null {
  if (!compareAtKobo || compareAtKobo <= priceKobo) return null;
  return Math.floor(((compareAtKobo - priceKobo) / compareAtKobo) * 100);
}

export type Currency = "NGN" | "USD";

/** Purchase orders can be priced in naira or dollars. Both are stored in
 *  their minor unit (kobo / cents), so the same ×100 convention applies. */
export function formatMoney(minor: number, currency: Currency): string {
  if (currency === "NGN") return formatNaira(minor);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(minor / 100);
}

/** Cents → kobo at a naira-per-dollar rate (1 cent × rate = rate kobo). */
export function toKobo(minor: number, currency: Currency, exchangeRate: number): number {
  return currency === "USD" ? Math.round(minor * exchangeRate) : minor;
}
