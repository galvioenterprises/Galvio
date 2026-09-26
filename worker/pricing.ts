import { z } from "zod";
import { business } from "../src/config/business";
import { planFor, type ProtectionPlan } from "../src/config/addons";
import catalogue from "./catalogue.generated.json";
import type { Env } from "./env";
import { HttpError, json, now, readBody } from "./http";

/**
 * Prices a cart from the build-time catalogue. The browser sends slugs and
 * quantities only; every rupee on an order comes from here.
 */

export type CatalogueEntry = {
  slug: string;
  sku: string;
  title: string;
  price: number;
  mrp: number | null;
  availability: string;
  stockCount: number | null;
  image: string;
  category: string;
  subCategory: string | null;
  inverter: boolean | null;
};
export const CATALOGUE = catalogue as Record<string, CatalogueEntry>;

export type CatalogueOverride = {
  slug: string;
  availability: CatalogueEntry["availability"];
  stock_count: number | null;
  mrp: number | null;
  selling_price: number;
  updated_by: string;
  updated_at: string;
};

/** Load only operational overrides; product identity always comes from the build. */
export async function loadCatalogueOverrides(
  env: Env,
  slugs?: string[],
): Promise<Map<string, CatalogueOverride>> {
  if (slugs?.length === 0) return new Map();
  const where = slugs
    ? ` WHERE slug IN (${slugs.map((_, index) => `?${index + 1}`).join(", ")})`
    : "";
  const statement = env.DB.prepare(
    `SELECT slug, availability, stock_count, mrp, selling_price, updated_by, updated_at
       FROM catalogue_overrides${where}`,
  );
  const { results } = slugs
    ? await statement.bind(...slugs).all<CatalogueOverride>()
    : await statement.all<CatalogueOverride>();
  return new Map(results.map((row) => [row.slug, row]));
}

export function withCatalogueOverride(
  product: CatalogueEntry,
  override: CatalogueOverride | undefined,
): CatalogueEntry {
  if (!override) return product;
  return {
    ...product,
    availability: override.availability,
    stockCount: override.stock_count,
    mrp: override.mrp,
    price: override.selling_price,
  };
}

export async function effectiveCatalogueEntry(env: Env, slug: string): Promise<CatalogueEntry | null> {
  const product = CATALOGUE[slug];
  if (!product) return null;
  const overrides = await loadCatalogueOverrides(env, [slug]);
  return withCatalogueOverride(product, overrides.get(slug));
}

/** Mirrors src/lib/availability.ts: unconfirmed stock is confirmed before dispatch. */
const ORDERABLE = new Set(["in_stock", "unknown"]);
export const MAX_QTY = 10;

export const itemsSchema = z
  .array(
    z.object({
      slug: z.string().max(120),
      qty: z.number().int().min(1).max(MAX_QTY),
      /** Add the Voltas protection plan that applies to this product. */
      plan: z.boolean().optional(),
    }),
  )
  .min(1, "Your cart is empty.")
  .max(20);

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .max(30)
  .regex(/^[A-Z0-9_-]*$/, "Coupon codes use letters and numbers only.");

export type Quote = {
  lines: {
    product: CatalogueEntry;
    qty: number;
    overrideUpdatedAt: string | null;
    countedStock: boolean;
  }[];
  plans: { plan: ProtectionPlan; product: CatalogueEntry; qty: number }[];
  addonTotal: number;
  mrpTotal: number;
  subtotal: number;
  couponCode: string;
  couponDiscount: number;
  couponDescription: string;
  deliveryFee: number;
  total: number;
};

type CouponRow = {
  code: string;
  description: string;
  kind: "percent" | "flat";
  value: number;
  min_order: number;
  max_discount: number;
  usage_limit: number;
  used_count: number;
  active: number;
  expires_at: string;
};

function couponDiscount(coupon: CouponRow, subtotal: number): number {
  const raw = coupon.kind === "percent" ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  const capped = coupon.max_discount > 0 ? Math.min(raw, coupon.max_discount) : raw;
  // A coupon never takes an order below one rupee.
  return Math.max(0, Math.min(capped, subtotal - 1));
}

export async function quote(
  env: Env,
  items: z.infer<typeof itemsSchema>,
  code: string,
): Promise<Quote> {
  const quantities = new Map<string, number>();
  const wantsPlan = new Set<string>();
  for (const item of items) {
    quantities.set(item.slug, Math.min(MAX_QTY, (quantities.get(item.slug) ?? 0) + item.qty));
    if (item.plan) wantsPlan.add(item.slug);
  }

  const overrides = await loadCatalogueOverrides(env, [...quantities.keys()]);
  const lines = [...quantities].map(([slug, qty]) => {
    const baseProduct = CATALOGUE[slug];
    if (!baseProduct) throw new HttpError(400, "An item in your cart is no longer sold. Remove it and try again.");
    const override = overrides.get(slug);
    const product = withCatalogueOverride(baseProduct, override);
    if (!ORDERABLE.has(product.availability)) {
      throw new HttpError(400, `${product.title} is not available to order right now.`);
    }
    if (product.stockCount !== null && qty > product.stockCount) {
      throw new HttpError(400, `Only ${product.stockCount} of ${product.title} can be ordered right now.`);
    }
    return {
      product,
      qty,
      overrideUpdatedAt: override?.updated_at ?? null,
      countedStock: Boolean(override && override.stock_count !== null),
    };
  });

  const plans = lines
    .filter((l) => wantsPlan.has(l.product.slug))
    .map((l) => {
      const plan = planFor(l.product);
      if (!plan) throw new HttpError(400, `No protection plan is offered for ${l.product.title}.`);
      return { plan, product: l.product, qty: l.qty };
    });
  const addonTotal = plans.reduce((sum, p) => sum + p.plan.price * p.qty, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const mrpTotal = lines.reduce((sum, l) => sum + (l.product.mrp ?? l.product.price) * l.qty, 0);

  let discount = 0;
  let description = "";
  if (code) {
    const coupon = await env.DB.prepare(`SELECT * FROM coupons WHERE code = ?1`).bind(code).first<CouponRow>();
    if (!coupon || !coupon.active) throw new HttpError(400, "That coupon code isn't valid.");
    if (coupon.expires_at && coupon.expires_at < now()) throw new HttpError(400, "That coupon has expired.");
    if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
      throw new HttpError(400, "That coupon has been fully used.");
    }
    if (subtotal < coupon.min_order) {
      throw new HttpError(400, `Add items worth ₹${(coupon.min_order - subtotal).toLocaleString("en-IN")} more to use this coupon.`);
    }
    discount = couponDiscount(coupon, subtotal);
    description = coupon.description;
  }

  const deliveryFee = business.deliveryFee;
  return {
    lines,
    plans,
    addonTotal,
    mrpTotal,
    subtotal,
    couponCode: code,
    couponDiscount: discount,
    couponDescription: description,
    deliveryFee,
    total: subtotal - discount + deliveryFee + addonTotal,
  };
}

/** The checkout summary: what the order will cost, before it is placed. */
export async function quoteHandler(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request, z.object({ items: itemsSchema, coupon: couponCodeSchema.default("") }));
  const q = await quote(env, body.items, body.coupon);
  return json({
    mrpTotal: q.mrpTotal,
    subtotal: q.subtotal,
    couponCode: q.couponCode,
    couponDiscount: q.couponDiscount,
    couponDescription: q.couponDescription,
    addonTotal: q.addonTotal,
    deliveryFee: q.deliveryFee,
    total: q.total,
    codAllowed: business.cashOnDelivery && q.total <= business.codLimit,
  });
}
