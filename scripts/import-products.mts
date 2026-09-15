/**
 * Turns the product spreadsheet into validated per-product JSON.
 *
 *   pnpm import:products            # data/products.csv -> data/products/*.json
 *   pnpm import:products path.csv
 *
 * The CSV is the human-facing format: it is what a spreadsheet exports and
 * what a non-developer can fill in. The JSON is the machine-facing format
 * the site builds from. This script is the only bridge between them —
 * never hand-edit the generated JSON, it gets overwritten.
 *
 * Every row is validated against the Zod schema before anything is
 * written, so a bad spreadsheet fails here with a row number rather than
 * halfway through a production build.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { productSchema, type Product } from "../src/lib/product-schema.ts";
import { site } from "../src/config/site.ts";

const IMAGE_DIR = "/images/products";
const OUT_DIR = resolve("data/products");

/** Placeholder intrinsic size. The image pipeline rewrites these with the
 *  real dimensions once the source photographs land in the repo. */
const DEFAULT_IMAGE_SIZE = { width: 1600, height: 1600 };

type Row = Record<string, string>;

function slugify(brand: string, model: string): string {
  return `${brand} ${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function num(row: Row, key: string): number | undefined {
  const raw = row[key]?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw.replace(/[₹,\s]/g, ""));
  if (Number.isNaN(parsed)) {
    throw new Error(`"${key}" is not a number: ${raw}`);
  }
  return parsed;
}

function bool(row: Row, key: string): boolean | undefined {
  const raw = row[key]?.trim().toLowerCase();
  if (!raw) return undefined;
  if (["true", "yes", "y", "1"].includes(raw)) return true;
  if (["false", "no", "n", "0"].includes(raw)) return false;
  throw new Error(`"${key}" must be true or false, got: ${raw}`);
}

function required(row: Row, key: string): string {
  const raw = row[key]?.trim();
  if (!raw) throw new Error(`"${key}" is empty`);
  return raw;
}

/**
 * Repeating groups in a flat CSV: records separated by "|", fields within
 * a record by "::". Clunky, but a spreadsheet can hold it and a person can
 * read it, which beats asking for nested JSON in a cell.
 */
function records(raw: string | undefined, fields: number): string[][] {
  return (raw ?? "")
    .split("|")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => record.split("::").map((field) => field.trim()))
    .filter((parts) => parts.length >= fields);
}

function highlightsOf(row: Row) {
  return records(row.highlights, 2).map(([title, subtitle, icon]) => ({
    title,
    subtitle,
    ...(icon ? { icon } : {}),
  }));
}

function faqsOf(row: Row) {
  return records(row.faqs, 2).map(([question, answer]) => ({ question, answer }));
}

/** Only emit a rating when both halves are present. A star with no
 *  review count, or a count with no star, is worse than nothing. */
function ratingOf(row: Row) {
  const value = num(row, "rating_value");
  const count = num(row, "rating_count");
  if (value === undefined || count === undefined) return undefined;
  return { value, count };
}

function toProduct(row: Row): Product {
  const brand = required(row, "brand");
  const model = required(row, "model");

  const dims = {
    lengthMm: num(row, "length_mm"),
    widthMm: num(row, "width_mm"),
    heightMm: num(row, "height_mm"),
  };
  const hasDims = dims.lengthMm && dims.widthMm && dims.heightMm;

  const images = (row.image_files ?? "")
    .split("|")
    .map((f) => f.trim())
    .filter(Boolean)
    .map((file) => ({
      src: `${IMAGE_DIR}/${file}`,
      alt: `${brand} ${model}`,
      ...DEFAULT_IMAGE_SIZE,
    }));

  return productSchema.parse({
    tenantId: site.tenantId,
    slug: slugify(brand, model),
    sku: required(row, "sku"),
    brand,
    model,
    gtin: required(row, "gtin"),
    hsn: required(row, "hsn"),
    title: required(row, "title"),
    description: required(row, "description"),
    category: required(row, "category"),
    subCategory: row.sub_category?.trim() || undefined,
    mrp: num(row, "mrp"),
    sellingPrice: num(row, "selling_price"),
    gstRate: num(row, "gst_rate"),
    availability: required(row, "availability"),
    stockCount: num(row, "stock_count"),
    condition: required(row, "condition"),
    installationIncluded: bool(row, "installation_included"),
    warrantyMonths: num(row, "warranty_months"),
    compressorWarrantyMonths: num(row, "compressor_warranty_months"),
    highlights: highlightsOf(row),
    faqs: faqsOf(row),
    weightKg: num(row, "weight_kg"),
    dimensions: hasDims ? dims : undefined,
    capacity: row.capacity?.trim() || undefined,
    color: row.color?.trim() || undefined,
    rating: ratingOf(row),
    starRating: num(row, "star_rating"),
    inverter: bool(row, "inverter"),
    images,
    specs: {},
  });
}

/** Flattens a Zod error into one readable "field: what is wrong" line per
 *  issue, so a spreadsheet with five mistakes reports all five at once. */
function describe(error: unknown): string[] {
  if (error instanceof z.ZodError) {
    return error.issues.map(
      (issue) => `${issue.path.join(".") || "row"}: ${issue.message}`,
    );
  }
  return [error instanceof Error ? error.message : String(error)];
}

function main() {
  const source = process.argv[2] ?? "data/products.csv";
  const rows = parse(readFileSync(source, "utf8"), {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  }) as Row[];

  const products: Product[] = [];
  const errors: string[] = [];

  rows.forEach((row, i) => {
    // +2 because spreadsheet rows are 1-indexed and row 1 is the header.
    const line = i + 2;
    try {
      products.push(toProduct(row));
    } catch (error) {
      for (const detail of describe(error)) {
        errors.push(`  row ${line} (${row.sku || "no sku"}): ${detail}`);
      }
    }
  });

  const slugs = new Set<string>();
  const skus = new Set<string>();
  for (const p of products) {
    if (slugs.has(p.slug)) errors.push(`  duplicate slug: ${p.slug}`);
    if (skus.has(p.sku)) errors.push(`  duplicate sku: ${p.sku}`);
    slugs.add(p.slug);
    skus.add(p.sku);
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} problem(s) in ${source}:\n`);
    console.error(errors.join("\n"));
    console.error("\nNothing was written. Fix the spreadsheet and re-run.\n");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  for (const stale of readdirSync(OUT_DIR).filter((f) => f.endsWith(".json"))) {
    rmSync(join(OUT_DIR, stale));
  }
  for (const product of products) {
    writeFileSync(
      join(OUT_DIR, `${product.slug}.json`),
      JSON.stringify(product, null, 2) + "\n",
    );
  }

  console.log(`Wrote ${products.length} product(s) to ${OUT_DIR}`);
}

main();
