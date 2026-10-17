import { NextResponse } from "next/server";
import { getBrandPreviewsForCategory } from "@/lib/products";

/** Backs CategoriesMenu's hover panel — fetched lazily per category rather
 *  than all at once, since a shopper usually only hovers one or two
 *  categories before clicking through. Same "client-side fetch from the
 *  header" reasoning as /api/categories. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brands = await getBrandPreviewsForCategory(id);
  return NextResponse.json({ brands });
}
