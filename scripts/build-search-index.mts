/**
 * Writes public/search-index.json for the header search.
 *
 * The site is a static export, so there is nothing to query at runtime.
 * The index is built alongside the pages and fetched by the browser the
 * first time someone focuses the search box — not on page load, because
 * most visitors never search and should not pay for it.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  productSchema,
  storedProductSchema,
} from "../src/lib/product-schema.ts";
import { categories } from "../src/config/categories.ts";

const PRODUCTS_DIR = resolve("data/products");
const OUT = resolve("public/search-index.json");
/** The Worker prices orders from this, never from what the browser sends. */
const CATALOGUE_OUT = resolve("worker/catalogue.generated.json");

type CatalogueEntry = {
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

type Entry = {
  slug: string;
  title: string;
  brand: string;
  category: string;
  categorySlug: string;
  price: number;
  mrp: number;
  availability: string;
  image: string;
  /** Everything searchable, lowercased once here so the browser does not
   *  redo it on every keystroke. */
  haystack: string;
};

function main() {
  const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith(".json"));

  const catalogue: Record<string, CatalogueEntry> = {};

  const entries: Entry[] = files.flatMap((file) => {
    const raw: unknown = JSON.parse(
      readFileSync(join(PRODUCTS_DIR, file), "utf8"),
    );

    // Parse the complete on-disk union first: drafts intentionally cannot
    // satisfy the storefront schema, but still need to be valid stored data.
    const stored = storedProductSchema.parse(raw);
    if (stored.status !== "active") return [];

    const product = productSchema.parse(stored);

    const category = categories.find((c) => c.name === product.category);

    catalogue[product.slug] = {
      slug: product.slug,
      sku: product.sku,
      title: product.title,
      price: product.sellingPrice,
      mrp: product.mrp ?? null,
      availability: product.availability,
      stockCount: product.stockCount ?? null,
      image: product.images[0].src,
      category: product.category,
      subCategory: product.subCategory ?? null,
      inverter: product.inverter ?? null,
    };

    return [
      {
        slug: product.slug,
        title: product.title,
        brand: product.brand,
        category: category?.title ?? product.category,
        categorySlug: category?.slug ?? "",
        price: product.sellingPrice,
        mrp: product.mrp,
        availability: product.availability,
        image: product.images[0].src,
        haystack: [
          product.title,
          product.brand,
          product.model,
          product.sku,
          product.category,
          product.subCategory,
          product.capacity,
          product.color,
          product.starRating ? `${product.starRating} star` : "",
          product.inverter ? "inverter" : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      },
    ];
  });

  entries.sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(OUT, JSON.stringify(entries));
  console.log(`search index: ${entries.length} products -> ${OUT}`);
  writeFileSync(CATALOGUE_OUT, `${JSON.stringify(catalogue)}\n`);
}

main();
