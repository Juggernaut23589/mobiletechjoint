/** Editorial copy and look per brand — headline for the homepage brand
 *  shelf, a one-line blurb, and a gradient/accent used by the hero slide,
 *  the shelf spotlight panel, and the brand page header. Not data that
 *  lives in the DB: a brand only gets a shelf/slide if it currently has
 *  published products, so this list can safely name brands we don't
 *  stock right now. Anything not listed falls back to `defaultEditorial`. */
export interface BrandEditorial {
  headline: string;
  blurb: string;
  tagline: string;
  gradient: string;
  accent: string;
}

const EDITORIAL: Record<string, BrandEditorial> = {
  sony: {
    headline: "Sony Deals",
    blurb: "Full-frame bodies and glass for hybrid shooters who want cinema colour straight out of camera.",
    tagline: "Full-frame power for hybrid creators.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#1a1e28 60%,#2F6FFF 140%)",
    accent: "#2F6FFF",
  },
  canon: {
    headline: "Canon Shop",
    blurb: "Iconic colour science and dependable autofocus, from first camera to full studio kit.",
    tagline: "Iconic glass. Unmistakable color.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#4a1420 55%,#FF3B5C 140%)",
    accent: "#FF3B5C",
  },
  ulanzi: {
    headline: "Amazing Ulanzi Offers",
    blurb: "Lights, cages, arms and mounts — the everyday creator gear that turns a phone or camera into a rig.",
    tagline: "Everyday creator gear, endless variety.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#3a2360 55%,#A855F7 140%)",
    accent: "#A855F7",
  },
  dji: {
    headline: "Great Prices in the DJI Store",
    blurb: "Gimbals, action cams and wireless mics engineered for footage that moves.",
    tagline: "Gimbals and action cams built to move.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#232838 60%,#3a4258 140%)",
    accent: "#8B95B5",
  },
  godox: {
    headline: "Hot Items in the Godox Shop",
    blurb: "Studio strobes, LED panels and modifiers — dramatic, precise light at working-creator prices.",
    tagline: "Studio lighting, dramatic and precise.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#4a2a12 55%,#FF6A3D 140%)",
    accent: "#FF6A3D",
  },
  fujifilm: {
    headline: "Trending Fujifilm Items",
    blurb: "Instax cameras and film for the moments that deserve a print, not just a post.",
    tagline: "Instant film, made for the moment.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#123626 55%,#2FD98A 140%)",
    accent: "#2FD98A",
  },
  lexar: {
    headline: "The Lexar Storage Vault",
    blurb: "Fast, reliable cards and drives so the footage you shot is the footage you keep.",
    tagline: "Fast storage for footage that matters.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#152040 55%,#2F6FFF 140%)",
    accent: "#2F6FFF",
  },
  "kandf-concept": {
    headline: "K&F Concept Essentials",
    blurb: "Filters, tripods and camera bags that hold up to real shoot days.",
    tagline: "Filters, bags, and rigs that hold up.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#123626 55%,#16C784 140%)",
    accent: "#16C784",
  },
  hollyland: {
    headline: "Hollyland Audio Picks",
    blurb: "Wireless mics and monitoring that never drop out mid-take.",
    tagline: "Wireless audio that never drops out.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#152040 55%,#2F6FFF 140%)",
    accent: "#2F6FFF",
  },
  joby: {
    headline: "Joby Grip & Go",
    blurb: "Flexible tripods and mounts for creators who shoot anywhere.",
    tagline: "Flexible support for shooting anywhere.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#3a1f10 55%,#FF8A63 140%)",
    accent: "#FF8A63",
  },
  sandisk: {
    headline: "SanDisk Storage Deals",
    blurb: "Trusted memory cards and SSDs for shoots that can't afford a corrupted file.",
    tagline: "Storage you can trust on set.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#3a1418 55%,#FF3B5C 140%)",
    accent: "#FF3B5C",
  },
  viltrox: {
    headline: "Viltrox Lens Finds",
    blurb: "Sharp, fast lenses and adapters at prices that leave room for the rest of the kit.",
    tagline: "Sharp glass, honest prices.",
    gradient: "linear-gradient(135deg,#0B0E14 0%,#1f2a44 55%,#5B8CFF 140%)",
    accent: "#5B8CFF",
  },
};

const DEFAULT_GRADIENT = "linear-gradient(135deg,#0B0E14 0%,#1a1e28 60%,#2F6FFF 140%)";

export function brandEditorial(slug: string, name: string): BrandEditorial {
  return (
    EDITORIAL[slug] ?? {
      headline: `The ${name} Store`,
      blurb: `Hand-picked ${name} gear, priced for working creators.`,
      tagline: `${name}, curated for creators.`,
      gradient: DEFAULT_GRADIENT,
      accent: "#2F6FFF",
    }
  );
}

/** Which brands get a hero slide, in this order (when they have stock). */
export const HERO_BRAND_ORDER = [
  "sony",
  "godox",
  "dji",
  "canon",
  "ulanzi",
  "lexar",
  "kandf-concept",
  "fujifilm",
  "hollyland",
];

/** Tie-breaker for the homepage brand shelves: when two brands have the
 *  same number of published products, the one earlier here wins. */
export const BRAND_SHELF_PRIORITY = [
  "sony",
  "canon",
  "ulanzi",
  "dji",
  "godox",
  "fujifilm",
  "lexar",
  "kandf-concept",
  "hollyland",
  "joby",
  "sandisk",
  "viltrox",
];
