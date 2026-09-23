import type { FigmaIconName } from "@/components/figma-icon";

/**
 * Hero slides.
 *
 * The revised frame makes the hero a carousel. Slides live here rather
 * than in the component so the copy can change without touching layout,
 * and so a seasonal slide can be added and removed by editing config.
 */
export type HeroSlide = {
  eyebrow: string;
  title: string;
  body: string;
  /** Base name from scripts/build-images.mts, or a path under /public. */
  image: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
};

export const heroSlides: HeroSlide[] = [
  {
    eyebrow: "Premium electronics. Trusted brands.",
    title: "Upgrade to Better Living",
    body: "Explore Voltas ACs, refrigerators, washing machines, air coolers and more — unbeatable prices, reliable service, complete peace of mind.",
    image: "/images/hero-placeholder.svg",
    primary: { label: "Explore Products", href: "/products/" },
    secondary: { label: "View Offers", href: "/offers/" },
  },
  {
    eyebrow: "Authorised distributor",
    title: "Bought Direct, Not Resold",
    body: "Genuine stock with the full factory warranty registered in your name, delivered and installed by our own team — not handed to a courier.",
    image: "voltas-side-by-side-cutout",
    primary: { label: "Browse the catalogue", href: "/products/" },
    secondary: { label: "Talk to us", href: "/contact/" },
  },
];

/** The band between the hero and the category strip. */
export const heroTrust: { icon: FigmaIconName; title: string; subtitle: string }[] =
  [
    {
      icon: "trust-genuine-light",
      title: "Genuine Voltas Products",
      subtitle: "Authorised & trusted",
    },
    {
      icon: "offers-discount",
      title: "Competitive Prices",
      subtitle: "Best value, always",
    },
    {
      icon: "trust-delivery-light",
      title: "Reliable Delivery",
      subtitle: "Handled by our own team",
    },
    {
      icon: "service-tools",
      title: "Installation & Support",
      subtitle: "Hassle-free experience",
    },
  ];
