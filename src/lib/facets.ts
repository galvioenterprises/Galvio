import type { Product } from "./product-schema";

/**
 * Facet derivation for the listing page.
 *
 * Everything here is pure and runs on the client over the products already
 * embedded in the page. With a catalogue this size that is far cheaper than
 * a round trip, and it keeps the site static.
 */

export type FacetId =
  | "category"
  | "subCategory"
  | "brand"
  | "capacity"
  | "starRating"
  | "color";

export type FacetOption = { value: string; count: number };
export type Facet = { id: FacetId; label: string; options: FacetOption[] };

export type Selection = Record<FacetId, string[]>;

/**
 * Key order is the order the filter groups render in, following the
 * design: type first, then capacity, then rating. Price sits between the
 * first group and the rest and is rendered separately.
 *
 * `category` leads, but only surfaces on a page whose products span more
 * than one — the "a facet needs two options to be a choice" rule drops it
 * automatically on a single-category listing, so the same component
 * serves both /products/ and /products/refrigerators/.
 */
export const emptySelection: Selection = {
  category: [],
  subCategory: [],
  capacity: [],
  starRating: [],
  brand: [],
  color: [],
};

const FACET_LABELS: Record<FacetId, string> = {
  category: "Category",
  subCategory: "Type",
  brand: "Brand",
  capacity: "Capacity",
  starRating: "Energy Rating",
  color: "Colour",
};

/**
 * Litre capacities are bucketed into 100L bands.
 *
 * Listing every distinct value gives a filter where almost every option
 * matches one product, which is a list of products wearing a filter's
 * clothes. Non-litre capacities (an air conditioner's "1.5 Ton") already
 * repeat across the catalogue, so they are left alone.
 */
function capacityBand(capacity: string): string {
  const litres = /^([\d.]+)\s*L$/i.exec(capacity.trim());
  if (!litres) return capacity;

  const value = Number.parseFloat(litres[1]);
  if (Number.isNaN(value)) return capacity;

  const floor = Math.floor(value / 100) * 100;
  return `${floor}L – ${floor + 100}L`;
}

/** The single value a product contributes to a facet, if any. */
function valueOf(product: Product, id: FacetId): string | undefined {
  switch (id) {
    case "category":
      return product.category;
    case "subCategory":
      return product.subCategory;
    case "brand":
      return product.brand;
    case "capacity":
      return product.capacity ? capacityBand(product.capacity) : undefined;
    case "color":
      return product.color;
    case "starRating":
      return product.starRating ? `${product.starRating} Star` : undefined;
  }
}

/** Capacities sort numerically ("100L" before "1000L"), everything else
 *  alphabetically. Sorting "1000L" before "260L" as strings looks broken. */
function compareOptions(id: FacetId, a: string, b: string): number {
  if (id === "capacity" || id === "starRating") {
    const na = Number.parseFloat(a);
    const nb = Number.parseFloat(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  }
  return a.localeCompare(b);
}

export function matchesSelection(
  product: Product,
  selection: Selection,
  ignore?: FacetId,
): boolean {
  return (Object.keys(selection) as FacetId[]).every((id) => {
    if (id === ignore) return true;
    const chosen = selection[id];
    if (chosen.length === 0) return true;
    const value = valueOf(product, id);
    return value !== undefined && chosen.includes(value);
  });
}

/**
 * Counts are computed against every filter *except* the one being counted,
 * which is what makes a facet list still show reachable options after you
 * tick a box in it.
 */
export function buildFacets(products: Product[], selection: Selection): Facet[] {
  const ids = Object.keys(emptySelection) as FacetId[];

  return ids
    .map((id) => {
      const counts = new Map<string, number>();

      for (const product of products) {
        if (!matchesSelection(product, selection, id)) continue;
        const value = valueOf(product, id);
        if (value === undefined) continue;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }

      // Keep a selected option visible even when nothing else matches it,
      // otherwise the checkbox the user just ticked disappears.
      for (const value of selection[id]) {
        if (!counts.has(value)) counts.set(value, 0);
      }

      const options = [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => compareOptions(id, a.value, b.value));

      return { id, label: FACET_LABELS[id], options };
    })
    .filter((facet) => {
      // A facet earns its place only if it can actually partition the set:
      // at least two options that each match more than one product. One
      // shared value is not enough — a colour list where nearly every
      // entry matches a single product is a product list wearing a
      // filter's clothes, and it grows worse as the catalogue grows.
      if (facet.options.length < 2) return false;
      return facet.options.filter((option) => option.count > 1).length >= 2;
    });
}

export type SortId = "relevance" | "price-asc" | "price-desc" | "discount";

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: "relevance", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "discount", label: "Biggest discount" },
];

export function sortProducts(products: Product[], sort: SortId): Product[] {
  const sorted = [...products];
  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.sellingPrice - b.sellingPrice);
    case "price-desc":
      return sorted.sort((a, b) => b.sellingPrice - a.sellingPrice);
    case "discount":
      return sorted.sort(
        (a, b) => (b.mrp - b.sellingPrice) / b.mrp - (a.mrp - a.sellingPrice) / a.mrp,
      );
    case "relevance":
      // In-stock first, then the cheaper of two otherwise-equal products.
      return sorted.sort((a, b) => {
        const stock = Number(b.availability === "in_stock") - Number(a.availability === "in_stock");
        return stock !== 0 ? stock : a.sellingPrice - b.sellingPrice;
      });
  }
}

/** Slider bounds, widened to round numbers so the handles land somewhere
 *  sensible rather than on an arbitrary product price. */
export function priceBounds(products: Product[]): [number, number] {
  if (products.length === 0) return [0, 100000];
  const prices = products.map((p) => p.sellingPrice);
  const step = 1000;
  return [
    Math.floor(Math.min(...prices) / step) * step,
    Math.ceil(Math.max(...prices) / step) * step,
  ];
}
