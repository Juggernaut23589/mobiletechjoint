import { redirect } from "next/navigation";
import { getStaffSession } from "@/app/actions/staff-auth";
import { setDiscountActive } from "@/app/actions/staff-discounts";
import { hasAbility } from "@/lib/staff-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { describeDiscount, type DiscountCode } from "@/lib/discounts";
import { formatNaira } from "@/lib/money";
import { DiscountCodeForm } from "@/components/staff/DiscountCodeForm";

export const dynamic = "force-dynamic";

function status(code: DiscountCode, uses: number, now: Date): { label: string; tone: string } {
  if (!code.is_active) return { label: "Switched off", tone: "bg-neutral-200 text-neutral-600" };
  if (code.ends_at && now > new Date(code.ends_at)) return { label: "Expired", tone: "bg-neutral-200 text-neutral-600" };
  if (code.starts_at && now < new Date(code.starts_at)) return { label: "Scheduled", tone: "bg-blue-100 text-blue-700" };
  if (code.usage_limit !== null && uses >= code.usage_limit) return { label: "Used up", tone: "bg-amber-100 text-amber-700" };
  return { label: "Live", tone: "bg-green-100 text-green-700" };
}

export default async function DiscountsPage() {
  const session = await getStaffSession();
  if (!session || !hasAbility(session, "manage_promotions")) redirect("/staff/dashboard?error=forbidden");

  const supabase = createServiceClient();
  const [{ data: codes }, { data: orders }] = await Promise.all([
    supabase.from("discount_codes").select("*").order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("discount_code_id, discount_kobo, total_kobo, refunded_kobo")
      .not("discount_code_id", "is", null)
      .in("status", ["paid", "refunded"]),
  ]);

  const stats = new Map<string, { uses: number; discountKobo: number; revenueKobo: number }>();
  for (const o of orders ?? []) {
    const s = stats.get(o.discount_code_id) ?? { uses: 0, discountKobo: 0, revenueKobo: 0 };
    s.uses++;
    s.discountKobo += o.discount_kobo;
    s.revenueKobo += o.total_kobo - o.refunded_kobo;
    stats.set(o.discount_code_id, s);
  }
  const now = new Date();
  const list = (codes ?? []) as DiscountCode[];

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-bold tracking-tight text-brand-900">Discount codes</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Codes customers enter at checkout. Figures below count paid orders only.
      </p>

      <details className="mb-6 rounded-lg border border-neutral-200 bg-white p-4" open={list.length === 0}>
        <summary className="cursor-pointer text-sm font-semibold text-neutral-900">Create a discount code</summary>
        <div className="mt-4">
          <DiscountCodeForm />
        </div>
      </details>

      {list.length === 0 ? (
        <p className="text-sm text-neutral-500">No discount codes yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wider text-neutral-400">
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Offer</th>
                <th className="px-3 py-2 font-medium">Rules</th>
                <th className="px-3 py-2 text-right font-medium">Paid uses</th>
                <th className="px-3 py-2 text-right font-medium">Discount given</th>
                <th className="px-3 py-2 text-right font-medium">Revenue</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {list.map((c) => {
                const s = stats.get(c.id) ?? { uses: 0, discountKobo: 0, revenueKobo: 0 };
                const st = status(c, s.uses, now);
                const rules = [
                  c.min_subtotal_kobo > 0 && `min ${formatNaira(c.min_subtotal_kobo)}`,
                  c.usage_limit !== null && `${c.usage_limit} uses`,
                  c.per_customer_limit !== null && `${c.per_customer_limit}/customer`,
                  c.starts_at && `from ${new Date(c.starts_at).toLocaleDateString()}`,
                  c.ends_at && `until ${new Date(c.ends_at).toLocaleDateString()}`,
                ].filter(Boolean);
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      <span className="font-mono font-semibold">{c.code}</span>
                      {c.description && <span className="block text-xs text-neutral-400">{c.description}</span>}
                    </td>
                    <td className="px-3 py-2">{describeDiscount(c)}</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">{rules.join(" · ") || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{s.uses}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatNaira(s.discountKobo)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatNaira(s.revenueKobo)}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.tone}`}>{st.label}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <form action={setDiscountActive}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="isActive" value={String(!c.is_active)} />
                        <button type="submit" className="text-xs text-neutral-500 hover:text-brand-700">
                          {c.is_active ? "Switch off" : "Switch on"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
