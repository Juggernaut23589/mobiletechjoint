"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { formatNaira } from "@/lib/money";
import { initiateCheckout } from "@/app/actions/checkout";
import { Button } from "@/components/ui/Button";
import { NIGERIA_STATES, lgasForState } from "@/lib/nigeria-locations";
import type { SavedPaymentMethod } from "@/types/database";

export function CheckoutForm({
  defaultName,
  defaultEmail,
  defaultPhone,
  savedMethods,
}: {
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  savedMethods: SavedPaymentMethod[];
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useCartStore((s) => s.items);
  const subtotalKobo = useCartStore((s) => s.subtotalKobo());

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [state, setState] = useState("");
  const [lga, setLga] = useState("");
  const [address, setAddress] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    savedMethods.find((m) => m.is_default)?.id ?? savedMethods[0]?.id ?? ""
  );
  const [useNewCard, setUseNewCard] = useState(savedMethods.length === 0);
  const [saveCard, setSaveCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rates, setRates] = useState<{ state: string; price_kobo: number }[]>([]);
  useEffect(() => {
    fetch("/api/delivery-rates")
      .then((res) => res.json())
      .then((data) => setRates(data.rates ?? []))
      .catch(() => {});
  }, []);

  const deliveryFeeKobo = useMemo(
    () => rates.find((r) => r.state === state)?.price_kobo ?? null,
    [rates, state]
  );
  const lgaOptions = useMemo(() => lgasForState(state), [state]);
  const totalWithDeliveryKobo = subtotalKobo + (deliveryFeeKobo ?? 0);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">Your cart is empty</h1>
        <Link href="/" className="text-sm font-medium underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Only productId + quantity + the chosen state/LGA leave the browser.
    // Price and the delivery fee are never sent — the server re-fetches
    // and re-validates every item, and looks up the delivery fee from the
    // state name alone, from the database.
    const result = await initiateCheckout({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      deliveryState: state,
      deliveryLga: lga,
      deliveryAddress: address,
      saveCard: useNewCard ? saveCard : false,
      savedPaymentMethodId: !useNewCard ? selectedMethodId : undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(result.authorizationUrl);
  }

  const inputClass =
    "w-full rounded-[10px] border border-neutral-200 bg-white px-3.5 py-2.5 text-[13.5px] outline-none transition-colors focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
  const labelClass = "mb-1.5 block text-[13px] font-semibold text-neutral-900";

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10 sm:px-8">
      <div className="flex items-center gap-2.5 pb-10 text-[13px] text-neutral-500">
        {["Cart", "Shipping", "Payment"].map((label, i, arr) => (
          <div key={label} className="flex flex-1 items-center gap-2.5 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i < 1
                    ? "bg-[#16C784] text-white"
                    : i === 1
                      ? "bg-brand-600 text-white"
                      : "bg-neutral-200 text-neutral-500"
                }`}
              >
                {i < 1 ? "✓" : i + 1}
              </span>
              <span className={i === 1 ? "font-semibold text-neutral-900" : ""}>{label}</span>
            </div>
            {i < arr.length - 1 && <div className="h-0.5 flex-1 bg-neutral-200" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <div>
          <h2 className="font-display mb-4.5 text-lg text-brand-900">Shipping Information</h2>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="name" className={labelClass}>
                Full name
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputClass} col-span-2`}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="phone" className={labelClass}>
                Phone number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="address" className={labelClass}>
                Street address
              </label>
              <input
                id="address"
                required
                placeholder="House number, street name, landmark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="state" className={labelClass}>
                State
              </label>
              <select
                id="state"
                required
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setLga("");
                }}
                className={inputClass}
              >
                <option value="">Select…</option>
                {NIGERIA_STATES.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lga" className={labelClass}>
                Local Government
              </label>
              <select
                id="lga"
                required
                disabled={!state}
                value={lga}
                onChange={(e) => setLga(e.target.value)}
                className={`${inputClass} disabled:bg-neutral-100`}
              >
                <option value="">Select…</option>
                {lgaOptions.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h2 className="font-display mb-4 mt-7 text-lg text-brand-900">Payment Method</h2>
          {savedMethods.length > 0 && (
            <div className="mb-4 flex flex-col gap-2.5">
              {savedMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center gap-2.5 rounded-[14px] border-[1.5px] px-4 py-3.5 text-sm transition-colors ${
                    !useNewCard && selectedMethodId === method.id
                      ? "border-brand-600 bg-brand-50"
                      : "border-neutral-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={!useNewCard && selectedMethodId === method.id}
                    onChange={() => {
                      setUseNewCard(false);
                      setSelectedMethodId(method.id);
                    }}
                  />
                  <span className="capitalize">
                    {method.card_type ?? "Card"} •••• {method.last4}
                  </span>
                </label>
              ))}
              <label
                className={`flex items-center gap-2.5 rounded-[14px] border-[1.5px] px-4 py-3.5 text-sm transition-colors ${
                  useNewCard ? "border-brand-600 bg-brand-50" : "border-neutral-200"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={useNewCard}
                  onChange={() => setUseNewCard(true)}
                />
                <span>Use a new card</span>
              </label>
            </div>
          )}
          <div className="rounded-[14px] border border-neutral-200 bg-white p-4.5 text-[13.5px] leading-relaxed text-neutral-500">
            You&apos;ll be taken to Paystack&apos;s secure checkout to enter your card, bank
            transfer, or USSD details — this site never sees or stores your card number.
          </div>
          {useNewCard && (
            <label className="mt-3.5 flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
              />
              Save this card for future purchases
            </label>
          )}

          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h3 className="font-display mb-4 text-[15px] text-brand-900">Order Summary</h3>
            {items.map((item) => (
              <div key={item.productId} className="mb-3.5 flex gap-2.5">
                {item.imageUrl ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-lg bg-neutral-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold">{item.name}</p>
                  <p className="text-xs text-neutral-500">Qty {item.quantity}</p>
                </div>
                <div className="shrink-0 text-[13px] font-semibold">
                  {formatNaira(item.priceKoboSnapshot * item.quantity)}
                </div>
              </div>
            ))}
            <div className="border-t border-neutral-200 pt-3">
              <div className="flex justify-between py-1.5 text-[13.5px] text-neutral-500">
                <span>Subtotal</span>
                <span className="text-neutral-900">{formatNaira(subtotalKobo)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-[13.5px] text-neutral-500">
                <span>Delivery{state ? ` (${state})` : ""}</span>
                <span className="text-neutral-900">
                  {state ? (deliveryFeeKobo !== null ? formatNaira(deliveryFeeKobo) : "—") : "Select a state"}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between border-t border-neutral-200 pt-2.5 text-base font-bold text-brand-900">
                <span>Total</span>
                <span>{formatNaira(totalWithDeliveryKobo)}</span>
              </div>
            </div>
            <p className="mt-2.5 text-xs text-neutral-400">
              Final amount is confirmed against current prices and delivery rates when payment
              is initiated.
            </p>

            <Button type="submit" variant="accent" disabled={submitting} className="mt-4.5 w-full">
              {submitting ? "Processing…" : `Pay with Paystack`}
            </Button>

            <div className="mt-4 flex flex-col gap-2 text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <span className="text-[#16C784]">🔒</span> SSL Secured Checkout
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#16C784]">✓</span> Secure checkout via Paystack
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
