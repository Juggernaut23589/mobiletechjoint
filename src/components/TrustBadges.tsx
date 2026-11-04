import { BadgeCheck, Clock, Globe, Lock } from "lucide-react";

const BADGES = [
  {
    Icon: BadgeCheck,
    title: "100% Authentic",
    description: "Genuine gear with official manufacturer warranties.",
  },
  {
    Icon: Clock,
    title: "Fast Delivery",
    description: "Same-Day Lagos Delivery. Fast dispatch for urgent shoots and production deadlines.",
  },
  {
    Icon: Globe,
    title: "Nationwide Shipping",
    description: "Fully insured, tracked shipping across all 36 states.",
  },
  {
    Icon: Lock,
    title: "Secure Payments",
    description: "Safe and encrypted transactions via Paystack, OPay & bank transfer.",
  },
] as const;

/** Trust-badge strip sitting directly above the dark footer — a light
 *  band matching the reference mockup the business sent, rather than
 *  recoloring it to fit the dark footer below. Same four badges on every
 *  page, since they're reassurances about the business as a whole, not
 *  anything page-specific. */
export function TrustBadges() {
  return (
    <div className="border-t border-neutral-200 bg-white px-4 py-8 sm:px-8">
      <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
        {BADGES.map(({ Icon, title, description }) => (
          <div key={title}>
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-[18px] w-[18px] shrink-0 text-neutral-900" strokeWidth={2} />
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-neutral-900">{title}</h3>
            </div>
            <p className="text-[13px] leading-relaxed text-neutral-500">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
