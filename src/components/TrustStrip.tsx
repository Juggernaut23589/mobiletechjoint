import { ShieldCheck, Camera, Package } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, label: "Secure Checkout via Paystack" },
  { icon: Camera, label: "Camera & Media Gear Specialists" },
  { icon: Package, label: "Hundreds of Products In Stock" },
];

// Deliberately NOT wrapped in RevealOnScroll — see CategoryTiles.tsx for
// why: this sits above the fold, and JS-gated visibility is the wrong
// tradeoff for anything that isn't purely decorative.
export function TrustStrip() {
  return (
    <div className="border-b border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-3">
        {ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center justify-center gap-2 sm:justify-start">
            <Icon className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={2} />
            <span className="text-sm font-medium text-neutral-700">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
