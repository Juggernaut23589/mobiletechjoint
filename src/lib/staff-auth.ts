/**
 * Staff session handling — HMAC-signed cookie payloads using only the Web
 * Crypto API (crypto.subtle), so this module runs in both the Node.js
 * runtime (Server Actions) and the Edge runtime (proxy.ts). Deliberately
 * separate from Supabase's own session cookie: this token carries role +
 * abilities so proxy.ts and Server Components can check access without an
 * extra DB round-trip on every request. Mirrors the pattern already
 * proven at hub.makeoverarena.com (lib/admin-auth.ts there).
 */

export const STAFF_COOKIE_NAME = "mtj_staff_session";
export const STAFF_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type StaffRole = "super_admin" | "staff";

export type StaffAbility =
  | "manage_products"
  | "manage_inventory"
  | "manage_customers"
  | "manage_orders"
  | "view_sales"
  | "manage_cross_sells";

export const STAFF_ABILITIES: { key: StaffAbility; label: string; description: string }[] = [
  { key: "manage_products", label: "Products", description: "Edit product postings — images, videos, descriptions, price, publish/archive, brand, category, deals." },
  { key: "manage_inventory", label: "Inventory", description: "View and adjust stock levels on published products." },
  { key: "manage_customers", label: "Customers", description: "View customer accounts and their order history." },
  { key: "manage_orders", label: "Orders", description: "View and manage all orders across every customer." },
  { key: "view_sales", label: "Sales & Income", description: "View revenue, order volume, and sales reporting." },
  { key: "manage_cross_sells", label: "Cross-sells", description: "Curate which categories cross-sell with each other." },
];

export interface StaffSession {
  userId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  abilities: Partial<Record<StaffAbility, boolean>>;
  isPending?: boolean;
}

/** super_admin can do everything, always — abilities are only consulted
 *  for role='staff'. A pending (not-yet-approved) staff member can do
 *  nothing regardless of role or abilities. */
export function hasAbility(session: StaffSession | null, ability: StaffAbility): boolean {
  if (!session || session.isPending) return false;
  if (session.role === "super_admin") return true;
  return Boolean(session.abilities?.[ability]);
}

const SECRET_STRING = process.env.STAFF_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? "";

function toBase64url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64url(b64url: string): Uint8Array {
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacHex(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET_STRING),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function encodeStaffSession(session: StaffSession): Promise<string> {
  const b64 = toBase64url(new TextEncoder().encode(JSON.stringify(session)));
  const sig = await hmacHex(b64);
  return `${b64}.${sig}`;
}

export async function decodeStaffSession(token: string): Promise<StaffSession | null> {
  try {
    const lastDot = token.lastIndexOf(".");
    if (lastDot === -1) return null;
    const b64 = token.slice(0, lastDot);
    const sig = token.slice(lastDot + 1);
    if (!b64 || !sig) return null;
    const expected = await hmacHex(b64);
    if (sig.length !== expected.length) return null;
    // Constant-time comparison — works in the Edge runtime (no Node
    // crypto.timingSafeEqual there).
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return null;
    return JSON.parse(new TextDecoder().decode(fromBase64url(b64))) as StaffSession;
  } catch {
    return null;
  }
}

// Routes only super_admin can reach, regardless of any staff's abilities.
export const SUPER_ADMIN_ONLY_ROUTES = ["/staff/dashboard/team"];
