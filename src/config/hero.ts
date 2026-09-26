import type { FigmaIconName } from "@/components/figma-icon";

/**
 * Hero slides.
 *
 * The revised frame makes the hero a carousel. Slides live here rather
 * than in the component so the copy can change without touching layout,
 * and so a seasonal slide can be added and removed by editing config.
 */
export type HeroSlide = {
  /** Short name, for screen readers. */
  tab: string;
  eyebrow: string;
  /** The title; the part in `highlight` takes the slide's accent colour. */
  title: string;
  highlight: string;
  body: string;
  /** Base name from scripts/build-images.mts; a transparent cut-out. */
  image: string;
  /** Catalogue category, for the live "from ₹" price. */
  category: string;
  /** Short, true facts listed under the copy. */
  chips: string[];
  /** Dark stage: gradient ends, spotlight colour, accent, and title gradient. */
  theme: { from: string; to: string; spot: string; accent: string; gradFrom: string; gradTo: string };
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
};

export const heroSlides: HeroSlide[] = [
  {
    tab: "Air Conditioners",
    eyebrow: "Voltas inverter ACs",
    title: "Beat the heat, not your electricity bill.",
    highlight: "not your electricity bill.",
    body: "Split and window ACs from Voltas, a Tata enterprise, delivered across India with Cash on Delivery.",
    image: "voltas-hero-split-ac",
    category: "Air Conditioner",
    chips: ["Inverter models", "Up to 5 Star rated", "1 & 1.5 Ton"],
    theme: { from: "#020817", to: "#0b2552", spot: "#1d4ed8", accent: "#60a5fa", gradFrom: "#bfdbfe", gradTo: "#60a5fa" },
    primary: { label: "Shop ACs", href: "/products/air-conditioners/" },
    secondary: { label: "See top deals", href: "/offers/" },
  },
  {
    tab: "Air Coolers",
    eyebrow: "Desert & personal coolers",
    title: "Big air for Indian summers.",
    highlight: "Indian summers.",
    body: "Desert coolers up to 92 litres and compact personal coolers that cool a room for a fraction of an AC's running cost.",
    image: "voltas-4810441-2-cutout",
    category: "Air Cooler",
    chips: ["Up to 92 L tank", "Castor wheels", "Desert & personal"],
    theme: { from: "#021413", to: "#0b3b3a", spot: "#0d9488", accent: "#2dd4bf", gradFrom: "#ccfbf1", gradTo: "#2dd4bf" },
    primary: { label: "Shop air coolers", href: "/products/air-coolers/" },
    secondary: { label: "Compare models", href: "/products/air-coolers/" },
  },
  {
    tab: "Refrigerators",
    eyebrow: "Voltas Beko refrigerators",
    title: "Room for everything. Fresh for longer.",
    highlight: "Fresh for longer.",
    body: "Single-door, frost-free double-door and side-by-side refrigerators from Voltas Beko, the Tata and Arçelik partnership.",
    image: "voltas-hero-fridge-sbs-cutout",
    category: "Refrigerator",
    chips: ["Frost free & direct cool", "173 L to 563 L", "Inverter models"],
    theme: { from: "#0c0a09", to: "#2b2118", spot: "#b45309", accent: "#fbbf24", gradFrom: "#fef3c7", gradTo: "#f59e0b" },
    primary: { label: "Shop refrigerators", href: "/products/refrigerators/" },
    secondary: { label: "Compare models", href: "/products/refrigerators/" },
  },
  {
    tab: "Deep Freezers",
    eyebrow: "Glass-top & hard-top freezers",
    title: "Freeze more. Show it off.",
    highlight: "Show it off.",
    body: "Chest freezers for homes, shops and caterers, including flat glass-top models with two sliding lids for display.",
    image: "voltas-hero-freezer-glasstop-cutout",
    category: "Freezer",
    chips: ["Two glass lids", "Convertible models", "Built for shops"],
    theme: { from: "#020617", to: "#16304a", spot: "#0284c7", accent: "#7dd3fc", gradFrom: "#e0f2fe", gradTo: "#38bdf8" },
    primary: { label: "Shop freezers", href: "/products/freezers/" },
    secondary: { label: "Bulk pricing", href: "/bulk-orders/" },
  },
  {
    tab: "Visi Coolers",
    eyebrow: "For shops, cafés & retail",
    title: "Chilled drinks that sell themselves.",
    highlight: "sell themselves.",
    body: "Glass-door visi coolers that keep stock cold and on display. Buying for more than one outlet? Ask for distributor pricing.",
    image: "voltas-5410921-6-cutout",
    category: "Visi Cooler",
    chips: ["Glass door", "Shelved display", "For retail"],
    theme: { from: "#12030a", to: "#3f0d1c", spot: "#be123c", accent: "#fb7185", gradFrom: "#ffe4e6", gradTo: "#f43f5e" },
    primary: { label: "Shop visi coolers", href: "/products/visi-coolers/" },
    secondary: { label: "Get a bulk quote", href: "/bulk-orders/" },
  },
];

/** The band between the hero and the category strip. */
export const heroTrust: { icon: FigmaIconName; title: string; subtitle: string }[] =
  [
    {
      icon: "trust-genuine-light",
      title: "100% Genuine",
      subtitle: "Via an authorised distributor",
    },
    {
      icon: "offers-discount",
      title: "Cash on Delivery",
      subtitle: "Pay when your order arrives",
    },
    {
      icon: "trust-delivery-light",
      title: "Pan-India Delivery",
      subtitle: "Distributor-managed shipping",
    },
    {
      icon: "service-tools",
      title: "Order Support",
      subtitle: "Help before and after purchase",
    },
  ];
