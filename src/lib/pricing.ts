import type { Product } from "./product-schema";

/**
 * Kept separate from lib/products.ts on purpose: that module reads the
 * filesystem, and anything a client component imports must stay free of
 * `node:fs` or Turbopack pulls it into the browser bundle and the build
 * fails.
 */

/** Discount as a whole percentage, or 0 when the product is at MRP. */
export function discountPercent(product: Product): number {
  if (product.sellingPrice >= product.mrp) return 0;
  return Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100);
}
