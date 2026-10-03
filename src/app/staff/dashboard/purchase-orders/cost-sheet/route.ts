import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { getVerifiedStaffSession } from "@/lib/staff-session";
import { hasAbility } from "@/lib/staff-auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface Row {
  slug: string;
  name: string;
  status: string;
  price_kobo: number | null;
  cost_kobo: number | null;
  brand: { name: string } | null;
  category: { name: string } | null;
}

/** Cost-price sheet: fill `new_cost_ngn` (supplier unit price in naira)
 *  and upload it back on the Purchase orders page. Blank = unchanged. */
export async function GET() {
  const session = await getVerifiedStaffSession();
  if (!hasAbility(session, "manage_purchasing")) return new NextResponse("Forbidden", { status: 403 });

  const products = await fetchAll<Row>((from, to) =>
    createServiceClient()
      .from("products")
      .select("slug, name, status, price_kobo, cost_kobo, brand:brands(name), category:categories(name)")
      .neq("status", "archived")
      .order("id")
      .range(from, to)
      .returns<Row[]>()
  );
  products.sort(
    (a, b) => (a.brand?.name ?? "~").localeCompare(b.brand?.name ?? "~") || a.name.localeCompare(b.name)
  );

  const ngn = (k: number | null) => (k === null ? "" : (k / 100).toFixed(2));
  const csv = toCsv([
    ["slug", "brand", "name", "category", "status", "price_ngn", "current_cost_ngn", "new_cost_ngn"],
    ...products.map((p) => [p.slug, p.brand?.name ?? "", p.name, p.category?.name ?? "", p.status, ngn(p.price_kobo), ngn(p.cost_kobo), ""]),
  ]);

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cost-sheet-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
