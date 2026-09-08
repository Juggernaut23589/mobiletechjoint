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
