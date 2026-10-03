import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { getVerifiedStaffSession } from "@/lib/staff-session";
import { hasAbility } from "@/lib/staff-auth";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

interface SheetRow {
  slug: string;
  name: string;
  status: string;
  stock_quantity: number;
  brand: { name: string } | null;
  category: { name: string } | null;
}

/** Stock-take sheet: every non-archived product, grouped by brand so it
 *  matches how stock sits on shelves. Staff fill in `new_stock` for what
 *  they physically count and upload it back on the Inventory page; rows
 *  left blank are treated as "not counted" and stay unchanged. */
export async function GET() {
  const session = await getVerifiedStaffSession();
  if (!hasAbility(session, "manage_inventory")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const products = await fetchAll<SheetRow>((from, to) =>
    createServiceClient()
      .from("products")
      .select("slug, name, status, stock_quantity, brand:brands(name), category:categories(name)")
      .neq("status", "archived")
      .order("id")
      .range(from, to)
      .returns<SheetRow[]>()
  );

  products.sort(
    (a, b) =>
      (a.brand?.name ?? "~").localeCompare(b.brand?.name ?? "~") || a.name.localeCompare(b.name)
  );

  const csv = toCsv([
    ["slug", "brand", "name", "category", "status", "current_stock", "new_stock"],
    ...products.map((p) => [
      p.slug,
      p.brand?.name ?? "",
      p.name,
      p.category?.name ?? "",
      p.status,
      p.stock_quantity,
      "",
    ]),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stock-sheet-${date}.csv"`,
    },
  });
}
