import type { Product } from "./product-schema";

type Highlight = NonNullable<Product["highlights"]>[number];

function years(months: number): string {
  if (months % 12 === 0) {
    const n = months / 12;
    return `${n} Year${n === 1 ? "" : "s"}`;
  }
  return `${months} Months`;
}

/**
 * The feature tiles under "Product Overview".
 *
 * A product can state its own `highlights` in the spreadsheet. When it
 * does not, these are derived from fields the row already has, so the
 * section is never an empty box — the page degrades to fewer tiles rather
 * than to a hole in the layout.
 */
export function highlightsFor(product: Product): Highlight[] {
  if (product.highlights.length > 0) return product.highlights.slice(0, 6);

  const derived: Highlight[] = [];

  if (product.capacity) {
    derived.push({
      title: `${product.capacity} Capacity`,
      subtitle: "Sized for everyday use",
      icon: "box",
    });
  }
  if (product.inverter) {
    derived.push({
      title: "Inverter Compressor",
      subtitle: "Quieter, and cheaper to run",
      icon: "bolt",
    });
  }
  if (product.starRating) {
    derived.push({
      title: `${product.starRating} Star Rated`,
      subtitle: "BEE energy rating",
      icon: "gauge",
    });
  }
  if (product.subCategory) {
    derived.push({
      title: product.subCategory,
      subtitle: `${product.category} format`,
      icon: "snowflake",
    });
  }
  if (product.installationIncluded) {
    derived.push({
      title: "Installation Included",
      subtitle: "Fitted by our own team",
      icon: "wrench",
    });
  }
  if (product.warrantyMonths > 0) {
    derived.push({
      title: `${years(product.warrantyMonths)} Warranty`,
      subtitle: "Manufacturer backed",
      icon: "shield",
    });
  }

  return derived.slice(0, 6);
}

export { years as formatMonths };
