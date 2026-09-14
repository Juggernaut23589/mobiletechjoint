import Link from "next/link";

/** Orange-to-purple promo banner matching the approved design-system
 *  mockup (Main.dc.html). The mockup's countdown timer counts down from a
 *  hardcoded number on every page load — not a real deadline, so it's
 *  omitted here rather than faking urgency with no real sale end date. */
export function PromoBanner() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 pt-9 sm:px-8">
      <div className="bg-promo-gradient flex flex-col items-start justify-between gap-5 rounded-[20px] px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10">
        <div>
          <div className="mb-1.5 text-[12.5px] font-bold tracking-wide opacity-85">
            CREATOR WEEK · UP TO 40% OFF
          </div>
          <div className="font-display text-2xl font-bold">
            Level up your setup before it ends
          </div>
        </div>
        <Link
          href="/deals"
          className="shrink-0 rounded-full bg-brand-900 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          Shop the Sale
        </Link>
      </div>
    </section>
  );
}
