"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="font-display mb-6 text-2xl font-bold tracking-tight text-brand-900">
        Checkout
      </h1>

      <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between py-1 text-sm">
            <span className="min-w-0 truncate pr-2">
              {item.name} × {item.quantity}
            </span>
            <span className="shrink-0">{formatNaira(item.priceKoboSnapshot * item.quantity)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-sm">
          <span>Subtotal</span>
          <span>{formatNaira(subtotalKobo)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Delivery{state ? ` (${state})` : ""}</span>
          <span>{state ? (deliveryFeeKobo !== null ? formatNaira(deliveryFeeKobo) : "—") : "Select a state"}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-neutral-200 pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatNaira(totalWithDeliveryKobo)}</span>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Final amount is confirmed against current prices and delivery rates when payment is
          initiated.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            Full name
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="state" className="mb-1 block text-sm font-medium">
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
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
            <label htmlFor="lga" className="mb-1 block text-sm font-medium">
              Local Government
            </label>
            <select
              id="lga"
              required
              disabled={!state}
              value={lga}
              onChange={(e) => setLga(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-neutral-100"
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

        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium">
            Street address
          </label>
          <input
            id="address"
            required
            placeholder="House number, street name, landmark"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {savedMethods.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Payment method</p>
            <div className="flex flex-col gap-2">
              {savedMethods.map((method) => (
                <label
                  key={method.id}
                  className="flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
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
              <label className="flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={useNewCard}
                  onChange={() => setUseNewCard(true)}
                />
                <span>Use a new card</span>
              </label>
            </div>
          </div>
        )}

        {useNewCard && (
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
            />
            Save this card for future purchases
          </label>
        )}

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Processing…" : `Pay ${formatNaira(totalWithDeliveryKobo)}`}
        </Button>
      </form>
    </div>
  );
}
