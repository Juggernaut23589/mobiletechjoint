import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getVerifiedStaffSession } from "@/lib/staff-session";
import { hasAbility } from "@/lib/staff-auth";
import { RECEIPT_BUCKET } from "@/lib/expenses";

export const dynamic = "force-dynamic";

/** Receipts live in a private bucket; this hands out a one-minute signed
 *  link only after checking the caller can see expenses or finance. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getVerifiedStaffSession();
  if (!hasAbility(session, "manage_expenses") && !hasAbility(session, "view_sales")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();
  const { data: expense } = await supabase.from("expenses").select("receipt_path").eq("id", id).maybeSingle();
  if (!expense?.receipt_path) return new NextResponse("No receipt", { status: 404 });

  const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(expense.receipt_path, 60);
  if (error || !data) return new NextResponse("Could not open the receipt", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
