# MobileTechJoint Store

Next.js + Supabase + Paystack rebuild of the mobiletechjoint.com storefront.
See the project proposal for full background; this file covers what exists
in code today.

## Stack

- Next.js 16 (App Router, Turbopack) — note: `proxy.ts`, not `middleware.ts`;
  `cookies()` is async. Read `node_modules/next/dist/docs/` before assuming
  an API from prior experience — this version has real breaking changes.
- Supabase (Postgres + Storage), project `mobiletechjoint` (ref
  `gdtehrviejxxypasywtu`, same org as makeoverarena, region North EU/Stockholm)
- Paystack for checkout (no live keys yet — see below)
- Deployed on Vercel, `develop` (default) / `master` (production) branch split

## What's built

- **Storefront**: product listing, product detail (image gallery + video),
  cart (Zustand + localStorage).
- **Checkout**: Server Action re-validates price/stock/status from the
  database for every cart item before creating an order — the client cart
  is never trusted for pricing. Paystack initialize → webhook → callback,
  with a single idempotent settlement function shared by both the webhook
  and the callback page (`src/lib/paystack.ts`). Verified end-to-end with a
  simulated signed webhook (see git log for `feat: Paystack checkout` —
  idempotency and amount-tamper rejection were both proven against the real
  database, not just written and assumed).
- **Instagram sync**: `/api/cron/instagram-sync`, run once daily (06:00) by
  Vercel Cron — the Hobby plan caps cron jobs at one run per day; the
  original proposal's 3-hourly cadence needs a Pro plan upgrade if that's
  ever wanted. Creates `status='draft'` products with re-hosted media —
  never priced automatically, per the proposal's human-confirms-price
  requirement. Enforced at the database level by the
  `price_required_when_published` CHECK constraint on `products`, not just
  in application code.
- **Admin** (`/admin/products`, gated by `proxy.ts` + a shared-secret
  cookie): lists drafts (from Instagram or a WooCommerce import with no
  price), lets someone set price + stock and publish, or archive.
- **WooCommerce migration** (`scripts/migrate-woocommerce.ts`): one-time
  import of the 324 real products from the old WordPress/WooCommerce site.
  Cleans SEO-stuffed titles ("... in Lagos, Nigeria"), fixes the "Adaptars"
  category misspelling, and re-hosts every product image into this
  project's own Supabase Storage rather than depending on the WordPress
  site's uptime.
- **Customer accounts** (`/account/*`, Supabase Auth, email+password):
  signup, login, logout, order history, and saved payment methods. Gated
  by `proxy.ts`, same pattern as `/admin`. Checkout pre-fills from the
  logged-in customer's profile and links the order to their account;
  guest checkout still works exactly as before (`orders.customer_id` is
  nullable).
- **Saved payment methods**: never raw card numbers — only the reusable
  `authorization_code` Paystack returns after a successful charge, plus
  display metadata (card type, last 4, expiry, bank). Captured when a
  logged-in customer checks "Save this card" at checkout and the payment
  settles (`settlePaidOrder` in `lib/paystack.ts`). "Pay with a saved
  card" charges that token directly server-side
  (`chargeAuthorization`) — no redirect to Paystack's hosted page. If
  Paystack responds with anything but a clean success (e.g. a card that
  needs OTP), the checkout falls back to asking for a new card rather
  than trying to handle OTP itself — see Known gaps.
- **Brand browsing**: category pages (`/category/[slug]`) show a brand
  filter chip row (`?brand=slug`) for whichever manufacturers actually
  have published products in that category. `products.brand_id` was
  backfilled by matching known brand names against the *start* of each
  product title (`scripts/backfill-brands.ts`) — 284 of 324 products
  matched; the rest are correctable one at a time from the brand dropdown
  on `/admin/products`.
- **Staff portal** (`/staff/*`), same pattern proven at hub.makeoverarena.com:
  self-registration → pending approval → a super_admin grants specific
  `abilities` (manage_products, manage_inventory, manage_customers,
  manage_orders, view_sales, manage_cross_sells) from
  `/staff/dashboard/team`. Each staff member's dashboard only shows the
  sections they've been granted — a super_admin always sees everything.
  Session is a separate HMAC-signed cookie (`lib/staff-auth.ts`, Web
  Crypto only so it works in the Edge runtime too), independent of both
  the customer auth system and the legacy `/admin` shared password (kept
  as a break-glass fallback — `assertAdmin()` in `admin-products.ts` /
  `admin-crosssells.ts` now accepts either).
  - `/staff/dashboard/products`: full edit (name, description, price,
    stock, category, brand, images/video, deals, hero/trending) — the
    original admin only had draft-publish + a few toggles, not real
    editing of an existing product's content.
  - `/staff/dashboard/inventory`: stock-only view, a separately grantable
    ability from full product editing.
  - `/staff/dashboard/customers`, `/orders`: full lists + detail views —
    didn't exist in any form before (the old admin had no way to see all
    orders or all customers, only per-customer via their own account).
  - `/staff/dashboard/sales`: revenue, paid order count, average order
    value, daily revenue, top-selling products — all computed from real
    paid orders, no placeholder numbers.
  - `/staff/dashboard/cross-sells`: the existing category-pairing tool,
    re-homed with ability gating.
  - First super_admin created via `scripts/create-super-admin.ts`
    (`npm run create:super-admin`, reads `SUPER_ADMIN_NAME` /
    `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from the environment so
    the password never touches shell history) — every subsequent account
    goes through the normal register → approve flow.
- **Curated cross-sells**: product pages and the cart pull suggestions
  from `category_complements` — admin-defined pairs like "Cameras pairs
  with Lenses, Batteries, Chargers" (`/admin/cross-sells`). Falls back to
  same-category products if a category has no pairing set up yet.

## Environment variables

See `.env.example`. Two things worth knowing:

- **Paystack, Instagram Graph API keys are intentionally empty** until the
  owner supplies real credentials. Every code path that needs them fails
  gracefully (a clear error, never a crash or 500) when they're missing —
  same pattern in `lib/paystack.ts` and `lib/instagram.ts`.
- `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` / `CRON_SECRET` were generated
  and pushed directly to Vercel; they were never printed to a terminal or
  committed anywhere. Rotate them if that's ever in doubt.

## Known gaps (not yet done)

- Staff register/login form submissions (Server Action wire protocol)
  are untested via a real browser — same tooling gap as the admin and
  customer auth forms below. Verified instead by: the bootstrap script
  creating a real super_admin row in the live database, and curl-based
  checks that `/staff/dashboard/*` correctly redirects unauthenticated
  visitors to `/staff/login`.
- No email notifications yet when a staff member registers (a super_admin
  has to check `/staff/dashboard/team` to see pending approvals) or when
  they're approved — this project has no email-sending infrastructure set
  up (unlike hub.makeoverarena.com, which has `lib/emails/send-email.ts`).
- No live Paystack account — `initializeTransaction`/`verifyTransaction`
  are correct per Paystack's docs but unverified against a real account.
- Instagram Graph API code is unverified against a real Business account —
  requires the account to be Business/Creator + linked to a Facebook Page +
  a Meta app that has passed review (see the proposal for the full
  requirement chain).
- The admin login **form submission** specifically (Server Action wire
  protocol) was not tested via a real browser — Chromium wouldn't download
  through the local network during development. The underlying
  access-control logic (cookie check in `proxy.ts`) *was* verified directly
  with both a correct and an incorrect session cookie.
- ~31 WooCommerce products had no price on the original site and imported
  as drafts — need a human to price them via `/admin/products`.
- 320 of 324 WooCommerce products don't have a real tracked stock count
  (WooCommerce was only using an in-stock/out-of-stock flag, not a
  quantity) — these imported with a placeholder quantity of 20. Real counts
  need to be entered by whoever manages inventory.
- No transactional emails yet (order confirmation, etc.) — out of scope
  for this pass.
- The category taxonomy is currently too coarse for cross-sell curation to
  be very useful: 194 of 324 products sit in "Uncategorized," with the
  rest split across just "Adapters," "Digital & Electronic," and "Docking
  Station" — there's no real "Cameras"/"Lenses"/"Lighting" split to map
  complements onto yet. The `/admin/cross-sells` tool is ready for when
  the catalogue gets re-categorized; seeding it now would mean fabricating
  pairings that don't reflect the real catalogue.
- "Pay with a saved card" only handles the clean-success case. Some
  cards/banks require OTP or PIN verification even on a repeat charge —
  Paystack signals this with a non-"success" status that this flow
  doesn't attempt to complete; the customer is told to use a new card
  instead of getting stuck.
- Customer signup/login forms are untested via a real browser, same
  tooling gap as the admin login (Server Actions use an internal wire
  protocol that plain `curl` can't drive) — the underlying pieces (Supabase
  Auth calls, the `/account` access-control redirect) were verified
  directly instead.
- Mobile responsiveness was reviewed and adjusted page-by-page (grids,
  the cart row, the header, account nav) but not tested on real devices —
  only reasoned about from Tailwind's breakpoint behavior.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Re-running the WooCommerce migration

The migration is idempotent (skips any `woocommerce_id` already imported),
so it's safe to re-run if the export is refreshed:

```bash
# On the WordPress server, in a world-readable location (www-data can't
# read /root):
wp eval-file /tmp/export_products.php --allow-root > /tmp/mtj-products-export.json

# Pull it down, then:
npm run migrate:woocommerce
```
