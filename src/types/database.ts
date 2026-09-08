// Hand-written types matching supabase/migrations/20260907000001_init.sql.
// Kept in sync manually for now; if the schema grows, switch to
// `supabase gen types typescript` to generate this from the live database.

export type ProductStatus = "draft" | "published" | "archived";
export type ProductSource = "manual" | "woocommerce_import" | "instagram";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded";
export type ImportStatus = "pending_review" | "imported" | "skipped" | "failed";

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface CategoryWithCount extends Category {
  product_count: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  is_video: boolean;
  position: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_kobo: number | null;
  currency: string;
  category_id: string | null;
  stock_quantity: number;
  status: ProductStatus;
  source: ProductSource;
  instagram_media_id: string | null;
  woocommerce_id: number | null;
  /** Admin-curated, not computed — there's no order history yet to derive
   *  real "hot selling" data from. Shown in the homepage hero carousel. */
  is_featured: boolean;
  /** Admin-curated, same reasoning as is_featured. Shown in the "Trending
   *  Now" section. */
  is_trending: boolean;
  created_at: string;
  updated_at: string;
}

/** A published product is guaranteed by the DB CHECK constraint to have a price. */
export type PublishedProduct = Product & { status: "published"; price_kobo: number };

export interface ProductWithImages extends Product {
  product_images: ProductImage[];
  category: Category | null;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: OrderStatus;
  total_kobo: number;
  currency: string;
  paystack_reference: string;
  paystack_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price_kobo_snapshot: number;
  quantity: number;
  created_at: string;
}
