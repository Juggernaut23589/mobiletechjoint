import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ReviewModerationRow, type ReviewRowData } from "@/components/staff/ReviewModerationRow";

export const dynamic = "force-dynamic";

interface ReviewRow {
  id: string;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  products: { name: string; slug: string } | null;
}

export default async function StaffReviewsPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_reviews")) redirect("/staff/dashboard?error=forbidden");

  const { data } = await createServiceClient()
    .from("product_reviews")
    .select("id, reviewer_name, rating, title, body, is_verified_purchase, status, created_at, products(name, slug)")
    .order("created_at", { ascending: false })
    .returns<ReviewRow[]>();

  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  function toRowData(r: ReviewRow): ReviewRowData {
    return {
      id: r.id,
      reviewerName: r.reviewer_name,
      rating: r.rating,
      title: r.title,
      body: r.body,
      isVerifiedPurchase: r.is_verified_purchase,
      status: r.status,
      createdAt: r.created_at,
      productName: r.products?.name ?? "Unknown product",
      productSlug: r.products?.slug ?? "",
    };
  }

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Reviews</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Customer product reviews — only approved reviews appear on the live site.
      </p>

      <div className="mb-8 rounded-lg border border-neutral-200 bg-white px-5">
        <h2 className="pt-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="py-6 text-sm text-neutral-500">Nothing waiting for review.</p>
        ) : (
          <div>
            {pending.map((r) => (
              <ReviewModerationRow key={r.id} review={toRowData(r)} />
            ))}
          </div>
        )}
      </div>

      {decided.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white px-5">
          <h2 className="pt-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Previously moderated
          </h2>
          <div>
            {decided.map((r) => (
              <ReviewModerationRow key={r.id} review={toRowData(r)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
