const RECENT_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/** Whether a product was published recently enough to wear a "New" badge.
 *  Evaluated on the server per request (pages revalidate every 60s), so the
 *  clock read here is fine — it just shouldn't happen inline in a component
 *  body, which is what the React Compiler purity rule guards against. */
export function isRecentlyAdded(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() < RECENT_MS;
}
