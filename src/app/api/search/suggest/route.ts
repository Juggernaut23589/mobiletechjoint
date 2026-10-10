import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/products";

/** Backs the navbar search dropdown — same matching logic as the full
 *  /search page (searchProducts), just capped to 10 and trimmed down to
 *  what a suggestion row needs. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const products = await searchProducts(q, 10);

  const results = products.map((product) => {
    const cover =
      product.product_images.filter((img) => !img.is_video).sort((a, b) => a.position - b.position)[0] ??
      null;
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      priceKobo: product.price_kobo,
      imageUrl: cover?.url ?? null,
      brandName: product.brand?.name ?? null,
    };
  });

  return NextResponse.json({ results });
}
