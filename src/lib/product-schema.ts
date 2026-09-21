import { z } from "zod";

/**
 * Product catalogue schema.
 *
 * The field set is deliberately shaped after the Google Merchant Center
 * product feed so the same JSON can drive the site today and a feed
 * later without remodelling. Fields Merchant Center treats as required
 * (gtin, brand, price, availability, condition) are required here too,
 * which forces the data to be collected correctly at source.
 */

export const availabilitySchema = z.enum([
  "in_stock",
  "out_of_stock",
  "preorder",
  "backorder",
]);

export const conditionSchema = z.enum(["new", "refurbished", "used"]);

/**
 * Whether a row belongs on the storefront at all.
 *
 * The stock export contains motors, spare parts and an installation kit
 * alongside the appliances. Marking them here means the whole export can
 * be imported as it comes and the site builds only what is `active` —
 * the alternative is a second, hand-maintained list, which goes stale
 * within a month.
 */
export const statusSchema = z.enum([
  "active",
  "draft",
  "discontinued",
  "spare",
  "not-listed",
]);

/**
 * Aggregate customer rating.
 *
 * Optional, and deliberately so: a rating rendered from invented numbers
 * is a lie to the customer and, once it reaches structured data, a
 * manual-action risk with Google. Leave it absent until real reviews
 * exist — the card and the product page render fine without it.
 */
export const ratingSchema = z.object({
  value: z.number().min(1).max(5),
  count: z.number().int().positive(),
});

export const imageSchema = z.object({
  /** Either a literal path under /public (starting with "/"), or the base
   *  name of a photograph processed by scripts/build-images.mts. */
  src: z.string().min(1),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/**
 * The feature tiles under "Product Overview".
 *
 * Optional: when absent the page derives a sensible set from capacity,
 * star rating and compressor type, so a thinly-filled row still produces
 * a complete-looking page rather than a gap.
 */
export const highlightSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  /** Icon key from components/icons.tsx; falls back to a generic mark. */
  icon: z
    .enum(["snowflake", "box", "bolt", "gauge", "volume", "leaf", "shield", "wrench"])
    .optional(),
});

/** Renders as an accordion and as FAQPage structured data, which is its
 *  own search result surface — worth filling in for the top sellers. */
export const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const dimensionsSchema = z.object({
  lengthMm: z.number().positive(),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
});

/** A folded variant keeps the ERP identifiers needed to quote the exact
 *  finish without creating another indexable product page. */
export const productVariantSchema = z.object({
  sku: z.string().min(1),
  internalCode: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
});

const productObjectSchema = z.object({
  tenantId: z.string().min(1),

  /** URL segment. Stable for the life of the product — changing it
   *  costs the page its accumulated search ranking. */
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),

  sku: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),

  status: statusSchema.default("active"),

  /** The ERP string, e.g. "RDC 220B / 3S0BTE0M0000GD (3STAR)". Kept so
   *  a listing can be matched back to stock; never shown to a customer. */
  internalCode: z.string().optional(),

  /** Vertis, Vectra, Magna, Aqua, Crysta. Voltas organises its range by
   *  series and customers search by it, so it is worth filtering on. */
  series: z.string().optional(),

  /** Parent SKU consumed by the importer; canonical records omit it. */
  variantOf: z.string().optional(),

  /** The parent is included too, so every selectable finish has a SKU. */
  variants: z.array(productVariantSchema).optional(),

  /** GTIN-8/12/13/14. Mandatory: without it the product cannot be
   *  matched to Google's catalogue and loses free-listing eligibility. */
  gtin: z.string().regex(/^\d{8}$|^\d{12,14}$/, "gtin must be 8, 12, 13 or 14 digits"),

  /** Indian HSN code, used for GST-compliant invoicing. */
  hsn: z.string().regex(/^\d{4,8}$/),

  title: z.string().min(1).max(150),
  description: z.string().min(1),
  category: z.string().min(1),
  /** Optional narrower type within the category, e.g. "Double Door".
   *  Drives the first filter group on the listing page. */
  subCategory: z.string().min(1).optional(),

  /** Rupees, inclusive of GST, matching what is printed on the box. */
  mrp: z.number().positive(),
  sellingPrice: z.number().positive(),
  gstRate: z.number().min(0).max(28),

  availability: availabilitySchema,
  /** Units on hand. Optional — supply it only if the number is real, and
   *  the listing shows a "Only N left" badge when stock runs low. */
  stockCount: z.number().int().nonnegative().optional(),
  condition: conditionSchema,

  weightKg: z.number().positive().optional(),
  dimensions: dimensionsSchema.optional(),

  /** Free-form spec bucket, e.g. "1.5 Ton" for an air conditioner. */
  capacity: z.string().optional(),
  color: z.string().min(1).optional(),
  rating: ratingSchema.optional(),
  /** BEE star rating, 1-5. */
  starRating: z.number().int().min(1).max(5).optional(),
  inverter: z.boolean().optional(),

  installationIncluded: z.boolean(),
  warrantyMonths: z.number().int().nonnegative(),
  /** Compressors are warranted far longer than the appliance and are a
   *  real purchase driver, so they get their own field and their own card. */
  compressorWarrantyMonths: z.number().int().nonnegative().optional(),

  highlights: z.array(highlightSchema).default([]),
  faqs: z.array(faqSchema).default([]),

  images: z.array(imageSchema).min(1),

  /** Arbitrary spec rows rendered on the product page. */
  specs: z.record(z.string(), z.string()).default({}),
});

export const productSchema = productObjectSchema
  .refine((p) => p.sellingPrice <= p.mrp, {
    message: "sellingPrice cannot exceed mrp",
    path: ["sellingPrice"],
  });

/** Supplier material often establishes identity before price, tax, stock and
 *  warranty arrive. Retaining that work is safe only while it stays draft. */
export const draftProductSchema = productObjectSchema
  .partial()
  .required({
    sku: true,
    brand: true,
    model: true,
    title: true,
    category: true,
  })
  .extend({
    status: z.literal("draft").default("draft"),
    missing: z.array(z.string()).default([]),
  })
  .refine(
    (p) =>
      p.sellingPrice === undefined ||
      p.mrp === undefined ||
      p.sellingPrice <= p.mrp,
    {
      message: "sellingPrice cannot exceed mrp",
      path: ["sellingPrice"],
    },
  );

export const storedProductSchema = z.union([
  draftProductSchema,
  productSchema,
]);

export type Product = z.infer<typeof productSchema>;
export type DraftProduct = z.infer<typeof draftProductSchema>;
export type StoredProduct = z.infer<typeof storedProductSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
