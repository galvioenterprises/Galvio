/**
 * Turns the product spreadsheet into validated per-product JSON.
 *
 *   pnpm import:products                         # merge data/products.csv
 *   pnpm import:products --replace path.csv      # replace the catalogue
 *   pnpm import:products --check path.csv        # validate without writing
 *
 * Supplier catalogues rarely contain every commercial field on day one.
 * Identity-complete rows are therefore retained as drafts, while only rows
 * satisfying the strict product schema can become visible products.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import {
  draftProductSchema,
  productSchema,
  productVariantSchema,
  statusSchema,
  storedProductSchema,
  type ProductVariant,
  type StoredProduct,
} from "../src/lib/product-schema.ts";
import { categories } from "../src/config/categories.ts";
import { site } from "../src/config/site.ts";

const IMAGE_DIR = "/images/products";
const OUT_DIR = resolve("data/products");
const CATEGORY_NAMES = new Set(categories.map((category) => category.name));

/** Placeholder intrinsic size. The image pipeline rewrites these with the
 *  real dimensions once the source photographs land in the repo. */
const DEFAULT_IMAGE_SIZE = { width: 1600, height: 1600 };

type Row = Record<string, string>;
type ImportMode = "merge" | "replace";

type ImportedRow = {
  line: number;
  variantOf?: string;
  product: StoredProduct;
  publishable: boolean;
  missing: string[];
};

type CatalogueRecord = {
  /** Existing drafts may predate generated slugs, so their filename remains
   *  the storage key until that SKU is imported again. */
  fileSlug: string;
  product: StoredProduct;
};

function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugify(brand: string, model: string): string {
  return slugifyText(`${brand} ${model}`);
}

/** A deterministic SKU hash keeps collision suffixes short without making a
 *  later batch's order part of a public URL. */
function skuDiscriminator(sku: string): string {
  let hash = 0x811c9dc5;
  for (const character of sku.toLowerCase()) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(6, "0").slice(-6);
}

function value(row: Row, key: string): string | undefined {
  return row[key]?.trim() || undefined;
}

function num(row: Row, key: string): number | undefined {
  const raw = value(row, key);
  if (!raw) return undefined;
  const parsed = Number(raw.replace(/[₹,\s]/g, ""));
  if (Number.isNaN(parsed)) {
    throw new Error(`"${key}" is not a number: ${raw}`);
  }
  return parsed;
}

function bool(row: Row, key: string): boolean | undefined {
  const raw = value(row, key)?.toLowerCase();
  if (!raw) return undefined;
  if (["true", "yes", "y", "1"].includes(raw)) return true;
  if (["false", "no", "n", "0"].includes(raw)) return false;
  throw new Error(`"${key}" must be true or false, got: ${raw}`);
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

/** Review aggregates are not part of supplier data. Reject them here so a
 *  plausible-looking number can never reach Product structured data. */
function ratingOf(row: Row) {
  const ratingValue = num(row, "rating_value");
  const ratingCount = num(row, "rating_count");
  if (ratingValue !== undefined || ratingCount !== undefined) {
    throw new Error("rating_value and rating_count must always be blank");
  }
  return undefined;
}

function candidateOf(row: Row): Record<string, unknown> {
  const brand = value(row, "brand");
  const model = value(row, "model");
  const title = value(row, "title");
  const category = value(row, "category");
  const status = statusSchema.parse(value(row, "status") ?? "active");

  if (category && !CATEGORY_NAMES.has(category)) {
    throw new Error(
      `category: unknown category "${category}"; expected one of: ${[
        ...CATEGORY_NAMES,
      ].join(", ")}`,
    );
  }

  const dimensions = {
    lengthMm: num(row, "length_mm"),
    widthMm: num(row, "width_mm"),
    heightMm: num(row, "height_mm"),
  };
  const suppliedDimensions = Object.values(dimensions).filter(
    (dimension) => dimension !== undefined,
  ).length;
  if (suppliedDimensions > 0 && suppliedDimensions < 3) {
    throw new Error(
      "dimensions: length_mm, width_mm and height_mm must be supplied together",
    );
  }

  const images = (row.image_files ?? "")
    .split("|")
    .map((file) => file.trim())
    .filter(Boolean)
    .map((file) => ({
      // No extension means the image pipeline owns it and will emit the
      // AVIF/WebP set; anything else is used as a literal path.
      src: file.includes(".") ? `${IMAGE_DIR}/${file}` : file,
      // The full title is useful to a listener; a bare model number is not.
      alt: title,
      ...DEFAULT_IMAGE_SIZE,
    }));

  return {
    tenantId: site.tenantId,
    slug: brand && model ? slugify(brand, model) : undefined,
    sku: value(row, "sku"),
    brand,
    model,
    status,
    internalCode: value(row, "internal_code"),
    series: value(row, "series"),
    variantOf: value(row, "variant_of"),
    gtin: value(row, "gtin"),
    hsn: value(row, "hsn"),
    title,
    description: value(row, "description"),
    category,
    subCategory: value(row, "sub_category"),
    mrp: num(row, "mrp"),
    sellingPrice: num(row, "selling_price"),
    gstRate: num(row, "gst_rate"),
    availability: value(row, "availability"),
    stockCount: num(row, "stock_count"),
    condition: value(row, "condition"),
    installationIncluded: bool(row, "installation_included"),
    warrantyMonths: num(row, "warranty_months"),
    compressorWarrantyMonths: num(row, "compressor_warranty_months"),
    highlights: highlightsOf(row),
    faqs: faqsOf(row),
    weightKg: num(row, "weight_kg"),
    dimensions: suppliedDimensions === 3 ? dimensions : undefined,
    capacity: value(row, "capacity"),
    color: value(row, "color"),
    rating: ratingOf(row),
    starRating: num(row, "star_rating"),
    inverter: bool(row, "inverter"),
    images: images.length > 0 ? images : undefined,
    specs: {},
  };
}

const CSV_FIELD_BY_PRODUCT_FIELD: Record<string, string> = {
  internalCode: "internal_code",
  variantOf: "variant_of",
  subCategory: "sub_category",
  sellingPrice: "selling_price",
  gstRate: "gst_rate",
  stockCount: "stock_count",
  installationIncluded: "installation_included",
  warrantyMonths: "warranty_months",
  compressorWarrantyMonths: "compressor_warranty_months",
  weightKg: "weight_kg",
  dimensions: "dimensions",
  starRating: "star_rating",
  rating: "rating",
  images: "images",
};

const REPORT_FIELD_ORDER = [
  "sku",
  "internal_code",
  "status",
  "brand",
  "series",
  "model",
  "variant_of",
  "gtin",
  "hsn",
  "title",
  "description",
  "category",
  "sub_category",
  "mrp",
  "selling_price",
  "gst_rate",
  "availability",
  "stock_count",
  "condition",
  "installation_included",
  "warranty_months",
  "compressor_warranty_months",
  "weight_kg",
  "dimensions",
  "capacity",
  "color",
  "star_rating",
  "inverter",
  "rating",
  "highlights",
  "faqs",
  "images",
] as const;

function missingFrom(error: z.ZodError): string[] {
  const fields = error.issues.map((issue) => {
    const field = String(issue.path[0] ?? "row");
    return CSV_FIELD_BY_PRODUCT_FIELD[field] ?? field;
  });
  return [...new Set(fields)];
}

function parseRow(row: Row, line: number): ImportedRow {
  const candidate = candidateOf(row);
  const status = candidate.status;
  const strict = productSchema.safeParse(candidate);
  const missing = strict.success
    ? status === "draft"
      ? ["status"]
      : []
    : missingFrom(strict.error);
  const publishable = strict.success && status !== "draft";

  if (publishable) {
    return {
      line,
      variantOf: value(row, "variant_of"),
      product: strict.data,
      publishable: true,
      missing,
    };
  }

  // Invalid supplied values still fail here. Only absent strict fields are
  // relaxed; a malformed GTIN or negative price is not converted to a draft.
  const draft = draftProductSchema.parse({
    ...candidate,
    status: "draft",
    missing,
  });

  return {
    line,
    variantOf: value(row, "variant_of"),
    product: draft,
    publishable: false,
    missing,
  };
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

function loadExisting(): CatalogueRecord[] {
  if (!existsSync(OUT_DIR)) return [];

  return readdirSync(OUT_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const raw: unknown = JSON.parse(readFileSync(join(OUT_DIR, file), "utf8"));
      const parsed = storedProductSchema.safeParse(raw);
      if (!parsed.success) {
        const issues = describe(parsed.error).map((issue) => `    ${issue}`);
        throw new Error(
          `data/products/${file} is invalid:\n${issues.join("\n")}`,
        );
      }
      return {
        fileSlug: basename(file, ".json"),
        product: parsed.data,
      };
    });
}

function variantOf(product: StoredProduct): ProductVariant {
  return productVariantSchema.parse({
    sku: product.sku,
    internalCode: product.internalCode,
    color: product.color,
  });
}

function withVariants(
  product: StoredProduct,
  variants: ProductVariant[],
): StoredProduct {
  const withoutVariants = { ...product };
  delete withoutVariants.variants;
  return storedProductSchema.parse(
    variants.length > 0 ? { ...withoutVariants, variants } : withoutVariants,
  );
}

function withSlug(product: StoredProduct, slug: string): StoredProduct {
  return storedProductSchema.parse({ ...product, slug });
}

function validateParentReferences(
  rows: ImportedRow[],
  existing: CatalogueRecord[],
  mode: ImportMode,
): string[] {
  const errors: string[] = [];
  const inputBySku = new Map(rows.map((row) => [row.product.sku, row]));
  const canonicalInput = new Set(
    rows.filter((row) => !row.variantOf).map((row) => row.product.sku),
  );
  const existingCanonical = new Set(
    mode === "merge" ? existing.map((record) => record.product.sku) : [],
  );

  for (const row of rows) {
    if (!row.variantOf) continue;
    const parentInBatch = inputBySku.get(row.variantOf);
    const parentIsCanonicalInBatch = canonicalInput.has(row.variantOf);
    const parentWillRemain = !parentInBatch && existingCanonical.has(row.variantOf);
    if (!parentIsCanonicalInBatch && !parentWillRemain) {
      errors.push(
        `  row ${row.line} (${row.product.sku}): variant_of: parent SKU "${row.variantOf}" is absent or is itself a variant`,
      );
    }
  }

  return errors;
}

function validateExisting(records: CatalogueRecord[]): void {
  const topLevel = new Map<string, string>();
  const nested = new Map<string, string>();

  for (const record of records) {
    const previous = topLevel.get(record.product.sku);
    if (previous) {
      throw new Error(
        `duplicate existing SKU ${record.product.sku}: ${previous}.json and ${record.fileSlug}.json`,
      );
    }
    topLevel.set(record.product.sku, record.fileSlug);

    for (const variant of record.product.variants ?? []) {
      if (variant.sku === record.product.sku) continue;
      const owner = nested.get(variant.sku);
      if (owner && owner !== record.product.sku) {
        throw new Error(
          `existing variant SKU ${variant.sku} belongs to both ${owner} and ${record.product.sku}`,
        );
      }
      nested.set(variant.sku, record.product.sku);
    }
  }

  for (const [sku, owner] of nested) {
    if (topLevel.has(sku)) {
      throw new Error(
        `existing SKU ${sku} is both a canonical product and a variant of ${owner}`,
      );
    }
  }
}

function assignStableSlugs(
  recordsBySku: Map<string, CatalogueRecord>,
  newCanonicalSkus: Set<string>,
): void {
  const occupied = new Map<string, string>();

  for (const [sku, record] of recordsBySku) {
    if (newCanonicalSkus.has(sku)) continue;
    const slug = record.product.slug ?? record.fileSlug;
    const owner = occupied.get(slug);
    if (owner && owner !== sku) {
      throw new Error(`duplicate existing slug: ${slug} (${owner}, ${sku})`);
    }
    occupied.set(slug, sku);
  }

  for (const sku of [...newCanonicalSkus].sort()) {
    const record = recordsBySku.get(sku);
    if (!record) continue;
    const base = slugify(record.product.brand, record.product.model);
    let slug = base;
    if (occupied.has(slug)) {
      slug = `${base}-${skuDiscriminator(sku)}`;
    }
    if (occupied.has(slug)) {
      throw new Error(
        `could not derive a unique stable slug for SKU ${sku}; collision at ${slug}`,
      );
    }
    occupied.set(slug, sku);
    record.product = withSlug(record.product, slug);
    record.fileSlug = slug;
  }
}

function buildCatalogue(
  rows: ImportedRow[],
  existing: CatalogueRecord[],
  mode: ImportMode,
): CatalogueRecord[] {
  validateExisting(existing);

  const existingBySku = new Map(
    existing.map((record) => [record.product.sku, record]),
  );
  const recordsBySku = new Map<string, CatalogueRecord>();
  if (mode === "merge") {
    for (const record of existing) {
      recordsBySku.set(record.product.sku, {
        fileSlug: record.fileSlug,
        product: withVariants(record.product, [...(record.product.variants ?? [])]),
      });
    }
  }

  const importedSkus = new Set(rows.map((row) => row.product.sku));
  for (const record of recordsBySku.values()) {
    record.product = withVariants(
      record.product,
      (record.product.variants ?? []).filter(
        (variant) => !importedSkus.has(variant.sku),
      ),
    );
  }

  // A SKU explicitly reclassified as a variant must stop owning a page.
  for (const row of rows) {
    if (row.variantOf) recordsBySku.delete(row.product.sku);
  }

  const newCanonicalSkus = new Set<string>();
  for (const row of rows) {
    if (row.variantOf) continue;

    const previous = recordsBySku.get(row.product.sku);
    const existingRecord = existingBySku.get(row.product.sku);
    const retainedSlug =
      mode === "merge" && existingRecord
        ? (existingRecord.product.slug ?? existingRecord.fileSlug)
        : undefined;
    const previousVariants = previous?.product.variants ?? [];
    let product = withVariants(
      storedProductSchema.parse({ ...row.product, variantOf: undefined }),
      [...previousVariants],
    );

    if (retainedSlug) {
      product = withSlug(product, retainedSlug);
    } else {
      newCanonicalSkus.add(row.product.sku);
    }

    recordsBySku.set(row.product.sku, {
      fileSlug: retainedSlug ?? (product.slug ?? slugify(product.brand, product.model)),
      product,
    });
  }

  for (const row of rows) {
    if (!row.variantOf) continue;
    const parent = recordsBySku.get(row.variantOf);
    // Parent references are checked with row numbers before this function.
    if (!parent) continue;
    parent.product = withVariants(parent.product, [
      ...(parent.product.variants ?? []),
      variantOf(row.product),
    ]);
  }

  // A variant group includes the canonical SKU as a selectable finish. An
  // orphaned self entry is removed when the last child becomes canonical.
  for (const record of recordsBySku.values()) {
    const bySku = new Map<string, ProductVariant>();
    for (const variant of record.product.variants ?? []) {
      if (variant.sku !== record.product.sku) bySku.set(variant.sku, variant);
    }
    const children = [...bySku.values()].sort((a, b) =>
      a.sku.localeCompare(b.sku),
    );
    record.product = withVariants(
      record.product,
      children.length > 0 ? [variantOf(record.product), ...children] : [],
    );
  }

  assignStableSlugs(recordsBySku, newCanonicalSkus);

  const records = [...recordsBySku.values()].sort((a, b) =>
    a.fileSlug.localeCompare(b.fileSlug),
  );
  const filenames = new Set<string>();
  const topLevelSkus = new Set(records.map((record) => record.product.sku));
  const nestedOwners = new Map<string, string>();

  for (const record of records) {
    record.product = storedProductSchema.parse(record.product);
    if (filenames.has(record.fileSlug)) {
      throw new Error(`duplicate output filename: ${record.fileSlug}.json`);
    }
    filenames.add(record.fileSlug);

    for (const variant of record.product.variants ?? []) {
      if (variant.sku === record.product.sku) continue;
      if (topLevelSkus.has(variant.sku)) {
        throw new Error(
          `SKU ${variant.sku} is both a canonical product and a variant of ${record.product.sku}`,
        );
      }
      const owner = nestedOwners.get(variant.sku);
      if (owner && owner !== record.product.sku) {
        throw new Error(
          `variant SKU ${variant.sku} belongs to both ${owner} and ${record.product.sku}`,
        );
      }
      nestedOwners.set(variant.sku, record.product.sku);
    }
  }

  return records;
}

function writeAtomically(records: CatalogueRecord[]): void {
  const parent = dirname(OUT_DIR);
  mkdirSync(parent, { recursive: true });
  const temporary = mkdtempSync(join(parent, ".products-import-"));
  const backup = join(
    parent,
    `.products-backup-${process.pid}-${Date.now().toString(36)}`,
  );
  let movedCurrent = false;

  try {
    for (const record of records) {
      writeFileSync(
        join(temporary, `${record.fileSlug}.json`),
        `${JSON.stringify(record.product, null, 2)}\n`,
      );
    }

    if (existsSync(OUT_DIR)) {
      renameSync(OUT_DIR, backup);
      movedCurrent = true;
    }
    try {
      renameSync(temporary, OUT_DIR);
    } catch (error) {
      if (movedCurrent) renameSync(backup, OUT_DIR);
      throw error;
    }
    if (movedCurrent) rmSync(backup, { recursive: true, force: true });
  } finally {
    if (existsSync(temporary)) {
      rmSync(temporary, { recursive: true, force: true });
    }
  }
}

function readinessReport(rows: ImportedRow[]): void {
  const publishable = rows.filter((row) => row.publishable).length;
  const drafts = rows.length - publishable;
  const width = Math.max(1, String(rows.length).length);
  const missing = new Map<string, number>();

  for (const row of rows) {
    if (row.publishable) continue;
    for (const field of row.missing) {
      missing.set(field, (missing.get(field) ?? 0) + 1);
    }
  }

  console.log(`${String(rows.length).padStart(width)} rows imported`);
  console.log(`${String(publishable).padStart(width)} publishable`);
  console.log(`${String(drafts).padStart(width)} draft`);
  console.log("\nMissing across drafts:");
  if (missing.size === 0) {
    console.log("  none");
    return;
  }
  const fieldWidth = Math.max(...[...missing.keys()].map((field) => field.length)) + 2;
  const orderedMissing = [...missing].sort(([fieldA], [fieldB]) => {
    const indexA = REPORT_FIELD_ORDER.indexOf(
      fieldA as (typeof REPORT_FIELD_ORDER)[number],
    );
    const indexB = REPORT_FIELD_ORDER.indexOf(
      fieldB as (typeof REPORT_FIELD_ORDER)[number],
    );
    if (indexA === -1 && indexB === -1) return fieldA.localeCompare(fieldB);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  for (const [field, count] of orderedMissing) {
    console.log(`  ${field.padEnd(fieldWidth)}${count}`);
  }
}

function commandLine(): { source: string; mode: ImportMode; check: boolean } {
  let source = "data/products.csv";
  let sourceWasSet = false;
  let mode: ImportMode = "merge";
  let modeWasSet = false;
  let check = false;

  for (const argument of process.argv.slice(2)) {
    if (argument === "--") continue;
    if (argument === "--check") {
      check = true;
      continue;
    }
    if (argument === "--merge" || argument === "--replace") {
      const nextMode = argument.slice(2) as ImportMode;
      if (modeWasSet && mode !== nextMode) {
        throw new Error("--merge and --replace cannot be used together");
      }
      mode = nextMode;
      modeWasSet = true;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`unknown option: ${argument}`);
    }
    if (sourceWasSet) {
      throw new Error(`more than one CSV path supplied: ${source}, ${argument}`);
    }
    source = argument;
    sourceWasSet = true;
  }

  return { source, mode, check };
}

function main(): void {
  const { source, mode, check } = commandLine();
  const rows = parse(readFileSync(source, "utf8"), {
    columns: (header: string[]) => header.map((column) => column.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
  }) as Row[];

  const imported: ImportedRow[] = [];
  const errors: string[] = [];
  const inputSkuLines = new Map<string, number>();

  rows.forEach((row, index) => {
    // +2 because spreadsheet rows are 1-indexed and row 1 is the header.
    const line = index + 2;
    try {
      const parsed = parseRow(row, line);
      const previousLine = inputSkuLines.get(parsed.product.sku);
      if (previousLine) {
        errors.push(
          `  row ${line} (${parsed.product.sku}): duplicate sku; first appears on row ${previousLine}`,
        );
      } else {
        inputSkuLines.set(parsed.product.sku, line);
      }
      imported.push(parsed);
    } catch (error) {
      for (const detail of describe(error)) {
        errors.push(`  row ${line} (${row.sku || "no sku"}): ${detail}`);
      }
    }
  });

  let existing: CatalogueRecord[] = [];
  if (errors.length === 0 && mode === "merge") {
    existing = loadExisting();
  }
  if (errors.length === 0) {
    errors.push(...validateParentReferences(imported, existing, mode));
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} problem(s) in ${source}:\n`);
    console.error(errors.join("\n"));
    console.error("\nNothing was written. Fix the spreadsheet and re-run.\n");
    process.exitCode = 1;
    return;
  }

  const catalogue = buildCatalogue(imported, existing, mode);
  if (!check) writeAtomically(catalogue);

  readinessReport(imported);
  console.log(
    check
      ? "\nCheck complete. Nothing was written."
      : `\nWrote ${catalogue.length} canonical product(s) to ${OUT_DIR} (${mode}).`,
  );
}

try {
  main();
} catch (error) {
  console.error(`\n${describe(error).join("\n")}\n`);
  console.error("Nothing was written.\n");
  process.exitCode = 1;
}
