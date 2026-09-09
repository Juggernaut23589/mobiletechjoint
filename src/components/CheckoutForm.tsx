"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { formatNaira } from "@/lib/money";
import { initiateCheckout } from "@/app/actions/checkout";
import type { SavedPaymentMethod } from "@/types/database";

export function CheckoutForm({
  defaultName,
  defaultEmail,
  defaultPhone,
  savedMethods,
  isLoggedIn,
}: {
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  savedMethods: SavedPaymentMethod[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useCartStore((s) => s.items);
  const subtotalKobo = useCartStore((s) => s.subtotalKobo());

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    savedMethods.find((m) => m.is_default)?.id ?? savedMethods[0]?.id ?? ""
  );
  const [useNewCard, setUseNewCard] = useState(savedMethods.length === 0);
  const [saveCard, setSaveCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Only productId + quantity leave the browser. Price is never sent —
    // the server re-fetches and re-validates every item from the database.
    const result = await initiateCheckout({
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      saveCard: isLoggedIn && useNewCard ? saveCard : false,
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
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-brand-900">Checkout</h1>

      <div className="mb-6 rounded-md border border-neutral-200 p-4">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between py-1 text-sm">
            <span className="min-w-0 truncate pr-2">
              {item.name} × {item.quantity}
            </span>
            <span className="shrink-0">{formatNaira(item.priceKoboSnapshot * item.quantity)}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-sm font-semibold">
          <span>Total</span>
          <span>{formatNaira(subtotalKobo)}</span>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          Final amount is confirmed against current prices when payment is initiated.
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        {isLoggedIn && savedMethods.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Payment method</p>
            <div className="flex flex-col gap-2">
              {savedMethods.map((method) => (
                <label
                  key={method.id}
                  className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm"
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
              <label className="flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm">
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

        {isLoggedIn && useNewCard && (
          <label className="flex items-center gap-2 text-sm text-neutral-600">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
            />
            Save this card for future purchases
          </label>
        )}

        {!isLoggedIn && (
          <p className="text-xs text-neutral-500">
            <Link href="/account/login" className="font-medium text-brand-600 hover:underline">
              Log in
            </Link>{" "}
            to save a card and view this order in your account later, or continue as a guest.
          </p>
        )}

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-accent-500 px-6 py-3 text-sm font-semibold text-brand-900 transition-colors hover:bg-accent-400 disabled:opacity-50"
        >
          {submitting ? "Processing…" : `Pay ${formatNaira(subtotalKobo)}`}
        </button>
      </form>
    </div>
  );
}
