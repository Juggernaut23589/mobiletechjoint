import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

// Apple's own site leans on the system font (-apple-system) rather than a
// distinct display face — Inter is the closest widely-licensable
// approximation and is used for both --font-sans and --font-display (see
// globals.css), with -apple-system/BlinkMacSystemFont listed first so
// Apple devices render their native system font instead.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-surface font-sans text-ink antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
