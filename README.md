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
- **Instagram sync**: `/api/cron/instagram-sync`, run every 3 hours by
  Vercel Cron. Creates `status='draft'` products with re-hosted media —
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
