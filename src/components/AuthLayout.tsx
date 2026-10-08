import { Logo } from "@/components/Logo";
import { ShieldCheck, Truck, Sparkles } from "lucide-react";

const POINTS = [
  { icon: ShieldCheck, text: "Original, manufacturer-sourced gear — never grey market" },
  { icon: Truck, text: "Fast delivery across Nigeria, tracked from checkout to door" },
  { icon: Sparkles, text: "Secure checkout via Paystack — cards, transfer or USSD" },
];

/** Split layout for the account auth pages — these used to be a bare form
 *  floating on an empty canvas, visually orphaned from the rest of the
 *  site's design. The branded panel also turns otherwise-dead space into
 *  a little reassurance right where checkout anxiety is highest. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1100px] flex-col overflow-hidden sm:my-8 sm:flex-row sm:rounded-[28px] sm:border sm:border-neutral-200 sm:shadow-sm">
      <div className="hidden w-[40%] shrink-0 flex-col justify-between bg-brand-900 p-9 text-white sm:flex">
        <div className="flex items-center gap-2">
          <Logo size={30} />
          <span className="font-display text-base tracking-tight">
            mobile<span className="font-bold">techjoint</span>
          </span>
        </div>
        <div>
          <h2 className="font-display mb-6 text-2xl font-bold leading-tight">
            Gear built for every frame you shoot.
          </h2>
          <ul className="flex flex-col gap-3.5">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-[13.5px] text-white/75">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-white/40">© {new Date().getFullYear()} mobiletechjoint</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
