"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { NIGERIA_STATES } from "@/lib/nigeria-locations";
import { formatNaira } from "@/lib/money";

interface Rate {
  state: string;
  price_kobo: number;
}

/** Real per-state delivery fee, looked up from the same delivery_rates
 *  table checkout quotes from (via the existing /api/delivery-rates
 *  route) — not a guess. Mirrors the "pick your state, see the real fee"
 *  pattern on marketplace product pages, scoped down to what this store
 *  can actually back with real data (one seller, not a pickup-station
 *  network). */
export function DeliveryEstimator() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [state, setState] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/delivery-rates")
      .then((res) => res.json())
      .then((data: { rates?: Rate[] }) => {
        setRates(data.rates ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const feeKobo = rates.find((r) => r.state === state)?.price_kobo;

  return (
    <div className="flex gap-3">
      <Truck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-ink/60" />
      <div className="min-w-0 flex-1">
        <h3 className="text-[13.5px] font-semibold text-ink">Delivery</h3>
        <p className="mt-1 text-[12.5px] text-ink/50">
          Nationwide, fully insured and tracked. Fee depends on your state.
        </p>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          disabled={!loaded}
          className="mt-2 w-full rounded-md border border-ink/15 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink"
        >
          <option value="">Select your state…</option>
          {NIGERIA_STATES.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        {state && (
          <p className="mt-1.5 text-[12.5px] font-semibold text-ink">
            {feeKobo != null ? `${formatNaira(feeKobo)} to ${state}` : "Not available for this state yet"}
          </p>
        )}
      </div>
    </div>
  );
}
