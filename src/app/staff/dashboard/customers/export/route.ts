import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getVerifiedStaffSession } from "@/lib/staff-session";
import { hasAbility } from "@/lib/staff-auth";
import { CUSTOMER_SEGMENTS, customerSegments, getAllCustomerSummaries, type CustomerSegment } from "@/lib/customers";
import { sanitizeSearch } from "@/lib/staff-query";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Customer list for marketing/accounts, honouring the same filters as
 *  the Customers page. */
export async function GET(request: NextRequest) {
  const session = await getVerifiedStaffSession();
  if (!hasAbility(session, "manage_customers")) return new NextResponse("Forbidden", { status: 403 });

  const sp = request.nextUrl.searchParams;
  const q = sanitizeSearch(sp.get("q") ?? undefined).toLowerCase();
  const segment = CUSTOMER_SEGMENTS.some((s) => s.value === sp.get("segment")) ? (sp.get("segment") as CustomerSegment) : null;
  const tag = sp.get("tag");

  let rows = await getAllCustomerSummaries();
  if (q) rows = rows.filter((c) => (c.full_name ?? "").toLowerCase().includes(q) || (c.phone ?? "").includes(q));
  if (segment) rows = rows.filter((c) => customerSegments(c).includes(segment));
  if (tag) rows = rows.filter((c) => c.tags.includes(tag));

  // One paged listing of auth users instead of a lookup per customer.
  const emails = new Map<string, string>();
  const supabase = createServiceClient();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return new NextResponse("Could not load customer emails", { status: 500 });
    for (const u of data.users) if (u.email) emails.set(u.id, u.email);
    if (data.users.length < 1000) break;
  }

  const naira = (kobo: number) => (kobo / 100).toFixed(2);
  const csv = toCsv([
    ["name", "email", "phone", "joined", "tags", "segments", "paid_orders", "lifetime_spend_ngn", "average_order_ngn", "first_order", "last_order"],
    ...rows.map((c) => [
      c.full_name ?? "",
      emails.get(c.id) ?? "",
      c.phone ?? "",
      c.created_at.slice(0, 10),
      c.tags.join("; "),
      customerSegments(c).join("; "),
      c.order_count,
      naira(c.total_spent_kobo),
      c.order_count ? naira(Math.round(c.total_spent_kobo / c.order_count)) : "",
      c.first_order_at?.slice(0, 10) ?? "",
      c.last_order_at?.slice(0, 10) ?? "",
    ]),
  ]);

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
