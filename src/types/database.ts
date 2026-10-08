// Hand-written types matching supabase/migrations/20260907000001_init.sql.
// Kept in sync manually for now; if the schema grows, switch to
// `supabase gen types typescript` to generate this from the live database.

export type ProductStatus = "draft" | "published" | "archived";
export type ProductSource = "manual" | "woocommerce_import" | "instagram" | "catalogue_import";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded" | "expired";
export type FulfillmentStatus =
  | "unfulfilled"
  | "processing"
  | "packed"
  | "dispatched"
  | "delivered"
  | "cancelled"
  | "returned";
export type RefundStatus = "pending_approval" | "processing" | "completed" | "failed" | "rejected";
export type StockReason =
  | "initial"
  | "sale"
  | "restock"
  | "count"
  | "correction"
  | "damage"
  | "loss"
  | "return"
  | "refund_restock"
  | "cancellation"
  | "purchase";
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

export interface Brand {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface BrandWithCount extends Brand {
  product_count: number;
}

export interface CategoryComplement {
  id: string;
  category_id: string;
  complement_category_id: string;
  created_at: string;
}

export interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  role: "super_admin" | "staff";
  is_active: boolean;
  is_pending: boolean;
  abilities: Record<string, boolean>;
  created_at: string;
}

export interface CustomerProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface SavedPaymentMethod {
  id: string;
  customer_id: string;
  paystack_authorization_code: string;
  card_type: string | null;
  last4: string | null;
  exp_month: string | null;
  exp_year: string | null;
  bank: string | null;
  is_default: boolean;
  created_at: string;
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
  /** Admin-entered "was" price for a real discount badge — never computed
   *  or guessed. Only shown when it's actually higher than price_kobo. */
  compare_at_price_kobo: number | null;
  currency: string;
  category_id: string | null;
  stock_quantity: number;
  status: ProductStatus;
  source: ProductSource;
  instagram_media_id: string | null;
  woocommerce_id: number | null;
  /** Origin identifier for imported rows, e.g. "camerajoint:37800" (see
   *  scripts/import-catalogue.mjs). Null for products created here. */
  source_ref: string | null;
  /** Admin-curated, not computed — there's no order history yet to derive
   *  real "hot selling" data from. Shown in the homepage hero carousel. */
  is_featured: boolean;
  /** Admin-curated, same reasoning as is_featured. Shown in the "Trending
   *  Now" section. */
  is_trending: boolean;
  /** Manufacturer facet within a category (Cameras -> Sony). Backfilled by
   *  title keyword-matching for the WooCommerce import — imperfect, null
   *  for anything that didn't match a known brand name. */
  brand_id: string | null;
  /** Weighted-average cost in kobo; null until known. */
  cost_kobo: number | null;
  /** Products sharing this id are versions of one another (e.g. lens mounts). */
  variant_group_id: string | null;
  /** Short label shown on the variant switcher, e.g. "Sony E". */
  variant_label: string | null;
  /** Stock at or below this counts as low (per product). */
  reorder_level: number;
  /** Generated column: stock_quantity <= reorder_level. */
  is_low_stock: boolean;
  /** Denormalised from approved product_reviews — kept in sync by a
   *  trigger (refresh_product_rating), never computed in app code. */
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ProductReview {
  id: string;
  product_id: string;
  customer_id: string | null;
  order_id: string | null;
  is_verified_purchase: boolean;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  moderation_note: string | null;
  created_at: string;
  updated_at: string;
}

/** A published product is guaranteed by the DB CHECK constraint to have a price. */
export type PublishedProduct = Product & { status: "published"; price_kobo: number };

export interface ProductWithImages extends Product {
  product_images: ProductImage[];
  category: Category | null;
  brand: Brand | null;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_id: string | null;
  save_card_requested: boolean;
  status: OrderStatus;
  total_kobo: number;
  currency: string;
  paystack_reference: string;
  paystack_verified_at: string | null;
  delivery_state: string | null;
  delivery_lga: string | null;
  delivery_address: string | null;
  delivery_fee_kobo: number;
  fulfillment_status: FulfillmentStatus;
  dispatch_method: "rider" | "courier" | null;
  rider_staff_id: string | null;
  courier_name: string | null;
  tracking_number: string | null;
  processing_at: string | null;
  packed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  returned_at: string | null;
  refunded_kobo: number;
  paystack_fee_kobo: number;
  discount_code_id: string | null;
  discount_code: string | null;
  discount_kobo: number;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: string;
  order_id: string;
  amount_kobo: number;
  reason: string;
  method: "paystack" | "offline";
  restock_items: { product_id: string; name: string; quantity: number }[];
  status: RefundStatus;
  requested_by: string | null;
  requested_by_name: string;
  decided_by: string | null;
  decided_by_name: string | null;
  paystack_refund_id: string | null;
  failure_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  delta: number;
  quantity_after: number;
  reason: StockReason;
  note: string | null;
  order_id: string | null;
  staff_id: string | null;
  staff_name: string | null;
  purchase_order_id: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  kind: "local" | "import";
  currency: "NGN" | "USD";
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  currency: "NGN" | "USD";
  exchange_rate: number;
  expected_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string;
  ordered_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost_minor: number;
  created_at: string;
}

export interface PurchaseOrderPayment {
  id: string;
  purchase_order_id: string;
  amount_minor: number;
  paid_on: string;
  method: string | null;
  note: string | null;
  recorded_by_name: string;
  created_at: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  unit_price_kobo_snapshot: number;
  unit_cost_kobo_snapshot: number | null;
  quantity: number;
  created_at: string;
}
