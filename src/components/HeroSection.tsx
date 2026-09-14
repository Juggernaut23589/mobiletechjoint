import Link from "next/link";

/** Dark hero matching the approved design-system mockup (Main.dc.html):
 *  headline, subhead, two CTAs, and a cluster of floating decorative
 *  cards. The mockup's cards are literal placeholder icons (camera/mic/
 *  gimbal/light/lens/tripod/dock) with no real product data behind them —
 *  kept as pure decoration here too, rather than faking product links
 *  that don't point anywhere real. */
const FLOATING_ICONS = [
  { label: "Mirrorless Cam", top: "0px", left: "0%", delay: "0s", duration: "5.2s", grad: "linear-gradient(135deg,#2F6FFF,#1E4FD6)" },
  { label: "Shotgun Mic", top: "40px", left: "30%", delay: ".4s", duration: "4.6s", grad: "linear-gradient(135deg,#FF6A3D,#E85A2F)" },
  { label: "3-Axis Gimbal", top: "190px", left: "8%", delay: ".8s", duration: "5.8s", grad: "linear-gradient(135deg,#A855F7,#7C3AED)" },
  { label: "LED Panel", top: "230px", left: "38%", delay: ".2s", duration: "4.9s", grad: "linear-gradient(135deg,#16C784,#0EA36A)" },
  { label: "Prime Lens", top: "10px", left: "62%", delay: ".6s", duration: "5.4s", grad: "linear-gradient(135deg,#2F6FFF,#A855F7)" },
  { label: "Carbon Tripod", top: "270px", left: "68%", delay: "1s", duration: "6.1s", grad: "linear-gradient(135deg,#FF3B5C,#FF6A3D)" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-[#141A28] to-brand-900 px-4 py-16 sm:px-8 sm:py-24">
      <div className="relative mx-auto grid max-w-[1360px] items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-600/35 bg-brand-600/15 px-3.5 py-1.5 text-[12.5px] font-semibold text-brand-200">
            New drops weekly
          </span>
          <h1 className="font-display mb-4.5 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Gear built for
            <br />
            every frame you shoot.
          </h1>
          <p className="mb-7 max-w-md text-base leading-relaxed text-white/60">
            Cameras, lighting, audio and rigs trusted by creators — from first upload to
            full-time studio.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link
              href="/deals"
              className="rounded-full bg-accent-500 px-6.5 py-3 text-sm font-semibold text-white shadow-glow-accent transition-all hover:-translate-y-0.5 hover:bg-accent-600"
            >
              Shop Now
            </Link>
            <Link
              href="/deals"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
            >
              Explore Deals
            </Link>
          </div>
        </div>

        <div className="relative hidden h-[420px] lg:block" aria-hidden="true">
          {FLOATING_ICONS.map((icon) => (
            <div
              key={icon.label}
              className="absolute motion-safe:animate-floaty"
              style={{
                top: icon.top,
                left: icon.left,
                animationDelay: icon.delay,
                animationDuration: icon.duration,
              }}
            >
              <div
                className="flex h-[110px] w-[110px] items-center justify-center rounded-2xl shadow-lg"
                style={{ background: icon.grad }}
              >
                <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
                  <g stroke="#fff" strokeWidth="1.6" opacity="0.95">
                    <circle cx="16" cy="16" r="13" />
                    <path d="M16 3 L16 12 M27.2 9.5 L19.4 14 M27.2 22.5 L19.4 18 M16 29 L16 20 M4.8 22.5 L12.6 18 M4.8 9.5 L12.6 14" />
                    <circle cx="16" cy="16" r="3.2" fill="#fff" />
                  </g>
                </svg>
              </div>
              <div className="mt-2 text-center text-[11.5px] font-semibold text-white/80">
                {icon.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
