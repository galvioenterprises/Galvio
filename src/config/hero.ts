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
    body: "Explore listed Voltas air conditioners, air coolers and more, with published prices and available product details in one place.",
    image: "voltas-4504051-cutout",
    primary: { label: "Explore Products", href: "/products/" },
    secondary: { label: "View Offers", href: "/offers/" },
  },
  {
    eyebrow: "Current Voltas catalogue",
    title: "Compare Before You Visit",
    body: "Review listed models, prices and supplied specifications, then contact the showroom to confirm current availability.",
    image: "voltas-4810348-2-cutout",
    primary: { label: "Explore Air Coolers", href: "/products/air-coolers/" },
    secondary: { label: "Contact the showroom", href: "/contact/" },
  },
];

/** The band between the hero and the category strip. */
export const heroTrust: { icon: FigmaIconName; title: string; subtitle: string }[] =
  [
    {
      icon: "trust-genuine-light",
      title: "Authorised Distributor",
      subtitle: "Voltas & Voltas Beko",
    },
    {
      icon: "offers-discount",
      title: "Published Prices",
      subtitle: "Visible on every listing",
    },
    {
      icon: "trust-delivery-light",
      title: "Physical Showroom",
      subtitle: "Visit before you buy",
    },
    {
      icon: "service-tools",
      title: "Availability Checks",
      subtitle: "Confirm directly with us",
    },
  ];
