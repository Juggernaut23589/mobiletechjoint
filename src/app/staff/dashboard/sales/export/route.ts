import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { getVerifiedStaffSession } from "@/lib/staff-session";
import { hasAbility } from "@/lib/staff-auth";
import { periodBounds, resolvePeriod } from "@/lib/finance";
import { toCsv } from "@/lib/csv";
import { toKobo, type Currency } from "@/lib/money";

export const dynamic = "force-dynamic";

type PoExportRow = {
      po_number: string;
      status: string;
      currency: Currency;
      exchange_rate: number;
      created_at: string;
      received_at: string | null;
      supplier: { name: string } | null;
      purchase_order_items: { quantity_ordered: number; quantity_received: number; unit_cost_minor: number }[];
      purchase_order_payments: { amount_minor: number }[];
    };

const naira = (kobo: number | null | undefined) => (kobo == null ? "" : (kobo / 100).toFixed(2));

export async function GET(request: NextRequest) {
  const session = await getVerifiedStaffSession();
  if (!hasAbility(session, "view_sales")) return new NextResponse("Forbidden", { status: 403 });

  const sp = request.nextUrl.searchParams;
  const period = resolvePeriod(undefined, sp.get("from") ?? undefined, sp.get("to") ?? undefined);
  const [start, end] = periodBounds(period);
  const type = sp.get("type");
  const supabase = createServiceClient();
  let rows: unknown[][];

  if (type === "orders") {
    const orders = await fetchAll<{
      paystack_reference: string;
      paystack_verified_at: string;
      status: string;
      fulfillment_status: string;
      customer_name: string;
      customer_email: string;
      delivery_state: string | null;
      total_kobo: number;
      delivery_fee_kobo: number;
      refunded_kobo: number;
      paystack_fee_kobo: number;
      order_items: { quantity: number; unit_price_kobo_snapshot: number; unit_cost_kobo_snapshot: number | null }[];
    }>((from, to) =>
      supabase
        .from("orders")
        .select(
          "paystack_reference, paystack_verified_at, status, fulfillment_status, customer_name, customer_email, delivery_state, total_kobo, delivery_fee_kobo, refunded_kobo, paystack_fee_kobo, order_items(quantity, unit_price_kobo_snapshot, unit_cost_kobo_snapshot)"
        )
        .in("status", ["paid", "refunded"])
        .gte("paystack_verified_at", start)
        .lte("paystack_verified_at", end)
        .order("paystack_verified_at")
        .range(from, to)
    );
    rows = [
      ["paid_at", "reference", "payment_status", "fulfilment", "customer", "email", "state", "product_sales_ngn", "delivery_fee_ngn", "total_paid_ngn", "refunded_ngn", "paystack_fee_ngn", "cost_of_goods_ngn", "items_missing_cost"],
      ...orders.map((o) => {
        const sales = o.order_items.reduce((s, i) => s + i.quantity * i.unit_price_kobo_snapshot, 0);
        const cogs = o.order_items.reduce((s, i) => s + i.quantity * (i.unit_cost_kobo_snapshot ?? 0), 0);
        const missing = o.order_items.filter((i) => i.unit_cost_kobo_snapshot === null).length;
        return [o.paystack_verified_at, o.paystack_reference, o.status, o.fulfillment_status, o.customer_name, o.customer_email, o.delivery_state ?? "", naira(sales), naira(o.delivery_fee_kobo), naira(o.total_kobo), naira(o.refunded_kobo), naira(o.paystack_fee_kobo), naira(cogs), missing];
      }),
    ];
  } else if (type === "expenses") {
    const expenses = await fetchAll<{
      incurred_on: string;
      description: string;
      category: string | null;
      amount_kobo: number;
      status: string;
      recorded_by_name: string | null;
      approved_by_name: string | null;
      voided_at: string | null;
      void_reason: string | null;
      receipt_path: string | null;
    }>((from, to) =>
      supabase
        .from("expenses")
        .select("incurred_on, description, category, amount_kobo, status, recorded_by_name, approved_by_name, voided_at, void_reason, receipt_path")
        .gte("incurred_on", period.from)
        .lte("incurred_on", period.to)
        .order("incurred_on")
        .range(from, to)
    );
    rows = [
      ["date", "description", "category", "amount_ngn", "status", "counts_in_pnl", "recorded_by", "approved_by", "voided_at", "void_reason", "has_receipt"],
      ...expenses.map((e) => [e.incurred_on, e.description, e.category ?? "", naira(e.amount_kobo), e.status, e.status === "approved" && !e.voided_at ? "yes" : "no", e.recorded_by_name ?? "", e.approved_by_name ?? "", e.voided_at ?? "", e.void_reason ?? "", e.receipt_path ? "yes" : "no"]),
    ];
  } else if (type === "purchases") {
    const pos = await fetchAll<PoExportRow>((from, to) =>
      supabase
        .from("purchase_orders")
        .select("po_number, status, currency, exchange_rate, created_at, received_at, supplier:suppliers(name), purchase_order_items(quantity_ordered, quantity_received, unit_cost_minor), purchase_order_payments(amount_minor)")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at")
        .range(from, to)
        .returns<PoExportRow[]>()
    );
    rows = [
      ["po_number", "supplier", "status", "currency", "exchange_rate", "created_at", "received_at", "ordered_total", "received_value", "paid", "outstanding", "ordered_total_ngn", "received_value_ngn"],
      ...pos.map((p) => {
        const ordered = p.purchase_order_items.reduce((s, i) => s + i.quantity_ordered * i.unit_cost_minor, 0);
        const received = p.purchase_order_items.reduce((s, i) => s + i.quantity_received * i.unit_cost_minor, 0);
        const paid = p.purchase_order_payments.reduce((s, x) => s + x.amount_minor, 0);
        const rate = Number(p.exchange_rate);
        return [p.po_number, p.supplier?.name ?? "", p.status, p.currency, rate, p.created_at, p.received_at ?? "", naira(ordered), naira(received), naira(paid), naira(ordered - paid), naira(toKobo(ordered, p.currency, rate)), naira(toKobo(received, p.currency, rate))];
      }),
    ];
  } else {
    return new NextResponse("Unknown export type", { status: 400 });
  }

  return new NextResponse("﻿" + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${period.from}-to-${period.to}.csv"`,
    },
  });
}
