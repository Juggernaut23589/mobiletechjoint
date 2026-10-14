import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BackToTop } from "@/components/BackToTop";
import "./globals.css";

// Sets `data-theme` on <html> before hydration so a returning visitor who
// picked light mode doesn't see a flash of the default black theme first.
const THEME_INIT_SCRIPT = `
  try {
    var theme = localStorage.getItem("mtj-theme");
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
  } catch (e) {}
`;

// Inter for body copy, Space Grotesk for headings/prices/brand wordmark —
// matches the approved design-system mockups exactly (see globals.css'
// --font-sans / --font-display).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: {
    default: "MobileTechJoint — Gadgets for Media Teams",
    template: "%s | MobileTechJoint",
  },
  description:
    "Cameras, lighting, tripods, and audio gear for content creators and media teams in Nigeria.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-surface font-sans text-ink antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <BackToTop />
      </body>
    </html>
  );
}
