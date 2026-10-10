import Link from "next/link";
import { Heart } from "lucide-react";
import { getCurrentUser } from "@/app/actions/account";
import { getWishlistProducts } from "@/lib/account";
import { ProductCard } from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const products = await getWishlistProducts(user.id);

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl text-white">Wishlist</h1>
      <p className="mb-6 text-sm text-white/50">
        Products you&apos;ve saved for later.
      </p>

      {products.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
          <p className="mb-3 text-sm text-neutral-500">Nothing saved yet.</p>
          <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">
            Browse the store
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
