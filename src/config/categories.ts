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
  /**
   * The sizing advice a good salesperson gives across the counter.
   *
   * This is the actual differentiator of a distributor over a
   * marketplace, and it is also the content search engines reward —
   * people type "which ton AC for 150 sq ft" far more often than they
   * type a model number.
   */
  buyingGuide?: {
    title: string;
    intro: string;
    columns: [string, string];
    rows: [string, string][];
    notes: string[];
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
    buyingGuide: {
      title: "Which tonnage for your room?",
      intro:
        "Tonnage is about room volume, not budget. An oversized unit cools fast, then switches off before it has pulled the humidity out — the room ends up cold and clammy, and the compressor wears from short-cycling. Undersized, it never stops running. Match the room and both problems go away.",
      columns: ["Room size", "Recommended"],
      rows: [
        ["Up to 110 sq ft", "1 Ton"],
        ["110 – 150 sq ft", "1.5 Ton"],
        ["150 – 250 sq ft", "2 Ton"],
        ["Above 250 sq ft", "2 Ton, or two units"],
      ],
      notes: [
        "Add half a ton if the room takes direct afternoon sun, sits under an exposed roof, or has more than two large windows.",
        "Inverter models cost more upfront and less to run. They pay back within two to three summers of daily use — and not at all in a guest room used twice a year.",
        "A higher star rating only saves money on the hours you actually run it. For a bedroom used all night, 5 star is worth it; for an office used two hours a day, 3 star usually is not.",
      ],
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
    buyingGuide: {
      title: "Which capacity for your household?",
      intro:
        "Capacity is measured in litres, and the honest rule is simpler than the brochures make it sound: count the people, then add room for how you actually shop. A family that buys vegetables weekly needs more litres than one that buys daily, whatever the household size.",
      columns: ["Household", "Recommended"],
      rows: [
        ["1 – 2 people", "180 – 250 L"],
        ["3 – 4 people", "250 – 350 L"],
        ["4 – 6 people", "350 – 500 L"],
        ["6+ people", "500 L and above"],
      ],
      notes: [
        "Single door is cheaper to buy and to run, but needs manual defrosting. Frost free costs more and takes that chore away — worth it if the freezer gets daily use.",
        "Measure the doorway and the gap beside the counter before you order. A fridge that fits the kitchen but not the corridor is the most common return we see.",
        "Leave 50 mm of clearance at the back and sides. A fridge pushed flat against a wall runs hotter, costs more to run, and fails earlier.",
      ],
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
    buyingGuide: {
      title: "Which size and type?",
      intro:
        "Drum capacity is quoted in kilograms of dry cotton. Most households buy one size too small, then run the machine daily instead of every other day, which costs more in water and power than the larger machine would have cost to buy.",
      columns: ["Household", "Recommended"],
      rows: [
        ["1 – 2 people", "6 – 6.5 kg"],
        ["3 – 4 people", "7 – 7.5 kg"],
        ["4 – 6 people", "8 – 8.5 kg"],
        ["6+ people, or bedding", "9 kg and above"],
      ],
      notes: [
        "Front load washes better and uses less water, but takes longer per cycle and needs a level floor. Top load is faster and easier to load mid-cycle.",
        "Semi-automatic is worth considering where the water supply is intermittent — it will run from a bucket, which a fully automatic will not.",
        "Check the inlet pressure at your tap before buying fully automatic. Low pressure is the most common cause of a machine that seems to fill forever.",
      ],
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
    buyingGuide: {
      title: "Which screen size for your room?",
      intro:
        "Screen size should follow how far away you sit, not how much wall you have. Sitting too close to a large panel makes the picture tiring; too far from a small one wastes the resolution you paid for.",
      columns: ["Viewing distance", "Recommended"],
      rows: [
        ["Up to 6 ft", "32 – 43 inch"],
        ["6 – 8 ft", "43 – 50 inch"],
        ["8 – 10 ft", "55 – 65 inch"],
        ["Above 10 ft", "65 inch and above"],
      ],
      notes: [
        "4K is only visibly better than full HD at 43 inch and above, or when you sit close. Below that, spend the difference on panel quality instead.",
        "Wall mounting and setup are handled on delivery. Tell us the wall type — a plasterboard wall needs different fixings from brick.",
      ],
    },
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
