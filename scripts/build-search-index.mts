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
import { productSchema } from "../src/lib/product-schema.ts";
import { categories } from "../src/config/categories.ts";

const PRODUCTS_DIR = resolve("data/products");
const OUT = resolve("public/search-index.json");

type Entry = {
  slug: string;
  title: string;
  brand: string;
  category: string;
  categorySlug: string;
  price: number;
  image: string;
  /** Everything searchable, lowercased once here so the browser does not
   *  redo it on every keystroke. */
  haystack: string;
};

function main() {
  const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith(".json"));

  const entries: Entry[] = files.map((file) => {
    const product = productSchema.parse(
      JSON.parse(readFileSync(join(PRODUCTS_DIR, file), "utf8")),
    );
    const category = categories.find((c) => c.name === product.category);

    return {
      slug: product.slug,
      title: product.title,
      brand: product.brand,
      category: category?.title ?? product.category,
      categorySlug: category?.slug ?? "",
      price: product.sellingPrice,
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
    };
  });

  entries.sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(OUT, JSON.stringify(entries));
  console.log(`search index: ${entries.length} products -> ${OUT}`);
}

main();
