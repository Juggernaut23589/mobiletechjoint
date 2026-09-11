import { NextResponse } from "next/server";
import { getCategoriesWithCounts } from "@/lib/products";

/** Backs MobileCategoryMenu's client-side fetch — the header (in the root
 *  layout, rendered on every page) can't fetch this server-side itself
 *  without risking the same mistake made earlier this project: a data
 *  fetch or dynamic API in a layout-level Server Component can force
 *  every page in the app out of static rendering. Same pattern already
 *  used by /api/auth/status for AccountLink. */
export async function GET() {
  const categories = await getCategoriesWithCounts();
  return NextResponse.json({ categories });
}
