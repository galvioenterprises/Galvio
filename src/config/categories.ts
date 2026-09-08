/**
 * Category registry.
 *
 * `name` is the exact string used in the `category` column of the product
 * spreadsheet — the two have to match or the listing page comes up empty.
 * Everything else here is page copy, kept out of the components so it can
 * be edited without touching layout.
 */

export type Category = {
  /** URL segment under /products. */
  slug: string;
  /** Must match the product `category` value exactly. */
  name: string;
  /** Plural heading shown on the listing page. */
  title: string;
  eyebrow: string;
  description: string;
  /** Dark promo card beside the heading. */
  banner: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
};

export const categories: Category[] = [
  {
    slug: "air-conditioners",
    name: "Air Conditioner",
    title: "Air Conditioners",
    eyebrow: "Cooling",
    description:
      "Split and window air conditioners from brands we stock and service directly. Inverter models, copper condensers, and installation handled by our own team.",
    banner: {
      eyebrow: "Beat every summer",
      title: "Cooling That Lasts",
      subtitle: "Efficient. Quiet. Installed right.",
    },
  },
  {
    slug: "refrigerators",
    name: "Refrigerator",
    title: "Refrigerators",
    eyebrow: "Home appliances",
    description:
      "Keep your food fresh and your home cool with refrigerators from trusted brands. Explore frost-free, energy-efficient and spacious models designed for modern homes.",
    banner: {
      eyebrow: "Fresher tomorrows",
      title: "Cooling That Cares",
      subtitle: "Smart. Spacious. Reliable.",
    },
  },
  {
    slug: "washing-machines",
    name: "Washing Machine",
    title: "Washing Machines",
    eyebrow: "Home appliances",
    description:
      "Front load, top load and semi-automatic washing machines, with delivery and first-wash demo included across the city.",
    banner: {
      eyebrow: "Cleaner every wash",
      title: "Built to Last",
      subtitle: "Gentle on fabric. Hard on stains.",
    },
  },
  {
    slug: "air-coolers",
    name: "Air Cooler",
    title: "Air Coolers",
    eyebrow: "Cooling",
    description:
      "Desert, tower and personal air coolers for rooms where a full air conditioner is more than you need.",
    banner: {
      eyebrow: "Simple cooling",
      title: "Cool Without the Bill",
      subtitle: "Low power. High airflow.",
    },
  },
  {
    slug: "water-dispensers",
    name: "Water Dispenser",
    title: "Water Dispensers",
    eyebrow: "Home appliances",
    description:
      "Hot and cold water dispensers for homes, clinics and offices, available for single units and bulk supply.",
    banner: {
      eyebrow: "Always ready",
      title: "Hot, Cold, Instant",
      subtitle: "For the home and the office.",
    },
  },
  {
    slug: "televisions",
    name: "Television",
    title: "Televisions",
    eyebrow: "Entertainment",
    description:
      "Smart LED and QLED televisions across sizes, with wall mounting and setup handled on delivery.",
    banner: {
      eyebrow: "Sharper evenings",
      title: "A Better Picture",
      subtitle: "Mounted and set up for you.",
    },
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
