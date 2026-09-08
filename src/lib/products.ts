import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { productSchema, type Product } from "./product-schema";

/**
 * Loads the catalogue at build time.
 *
 * This only ever runs during `next build` and `next dev` — the exported
 * site ships the products already baked into HTML, so there is no runtime
 * file access and no data dependency in production.
 */

const PRODUCTS_DIR = join(process.cwd(), "data", "products");

/** SKUs from `data/products.sample.csv`, which exists so the pages can be
 *  developed before the real catalogue is collected. */
const SAMPLE_SKU_PREFIX = "SAMPLE-";

function load(): Product[] {
  const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith(".json"));

  const products = files.map((file) => {
    const raw: unknown = JSON.parse(readFileSync(join(PRODUCTS_DIR, file), "utf8"));
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `    ${i.path.join(".") || "root"}: ${i.message}`)
        .join("\n");
      throw new Error(`data/products/${file} is invalid:\n${issues}`);
    }
    return parsed.data;
  });

  // Placeholder products must never reach a real deployment. Failing the
  // build is the only reliable guard: a warning in a build log is a
  // warning nobody reads until a customer asks why the fridge has no photo.
  const samples = products.filter((p) => p.sku.startsWith(SAMPLE_SKU_PREFIX));
  if (samples.length > 0 && !process.env.ALLOW_SAMPLE_DATA) {
    throw new Error(
      `${samples.length} placeholder product(s) are still in data/products/.\n` +
        `Import the real catalogue with \`pnpm import:products\`, or run\n` +
        `\`pnpm build:preview\` if you meant to build with sample data.`,
    );
  }

  return products.sort((a, b) => a.title.localeCompare(b.title));
}

let cache: Product[] | undefined;

export function getAllProducts(): Product[] {
  cache ??= load();
  return cache;
}

export function getProductsByCategory(category: string): Product[] {
  return getAllProducts().filter((p) => p.category === category);
}

export function getProductBySlug(slug: string): Product | undefined {
  return getAllProducts().find((p) => p.slug === slug);
}
