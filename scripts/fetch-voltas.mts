/**
 * Caches the Voltas product catalogue.
 *
 *   node scripts/fetch-voltas.mts
 *
 * voltas.com runs on Shopify, which publishes a products.json endpoint by
 * design. As an authorised distributor we are using the manufacturer's own
 * product data and imagery for the manufacturer's own products — which is
 * the reason this is the right source and a marketplace is not.
 *
 * The response is cached in data/sources/ and committed, so a build never
 * depends on a third party being up, and so a price change is a reviewable
 * diff rather than a silent difference.
 */

import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const ENDPOINT = "https://www.voltas.com/collections/all/products.json";
const OUT = resolve("data/sources/voltas-catalogue.json");
const PAGE_SIZE = 250;

type ShopifyImage = { src: string; width: number; height: number };
type ShopifyVariant = {
  sku: string | null;
  price: string;
  compare_at_price: string | null;
  barcode: string | null;
  grams: number;
};
type ShopifyProduct = {
  id: number;
  handle: string;
  title: string;
  vendor: string;
  product_type: string;
  body_html: string;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
};

type CatalogueProduct = {
  handle: string;
  title: string;
  vendor: string;
  productType: string;
  description: string;
  images: ShopifyImage[];
  variants: {
    sku: string | null;
    price: number;
    mrp: number | null;
    barcode: string | null;
    grams: number;
  }[];
};

function catalogueProduct(product: ShopifyProduct): CatalogueProduct {
  return {
    handle: product.handle,
    title: product.title,
    vendor: product.vendor,
    productType: product.product_type,
    // Tags and the full HTML body are dropped: the body is marketing
    // copy we rewrite anyway, and keeping it bloats the diff on every
    // sync for no benefit.
    description: product.body_html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
    // Voltas sometimes uses a 500 x 500 transparent product cut-out as the
    // featured image, followed by larger feature panels. Keep that official
    // hero and every later gallery image that meets the catalogue minimum.
    images: product.images
      .filter((image) => image.width >= 500 && image.height >= 500)
      .map((image) => ({
        src: image.src.split("?")[0],
        width: image.width,
        height: image.height,
      })),
    variants: product.variants.map((variant) => ({
      sku: variant.sku,
      price: Number(variant.price),
      mrp: variant.compare_at_price ? Number(variant.compare_at_price) : null,
      barcode: variant.barcode,
      grams: variant.grams,
    })),
  };
}

async function main() {
  const imagesOnly = process.argv.includes("--images-only");
  const products: ShopifyProduct[] = [];

  for (let page = 1; page <= 10; page++) {
    const response = await fetch(`${ENDPOINT}?limit=${PAGE_SIZE}&page=${page}`, {
      headers: { "user-agent": "galvioenterprises.com catalogue sync" },
    });
    if (!response.ok) throw new Error(`page ${page}: HTTP ${response.status}`);

    const body = (await response.json()) as { products: ShopifyProduct[] };
    if (body.products.length === 0) break;

    products.push(...body.products);
    console.log(`page ${page}: ${body.products.length} products`);

    // One request per second. There is no reason to be impolite to a
    // supplier's storefront.
    await new Promise((r) => setTimeout(r, 1000));
  }

  const fetched = products.map(catalogueProduct);
  let output = fetched;

  if (imagesOnly) {
    const existing = JSON.parse(readFileSync(OUT, "utf8")) as CatalogueProduct[];
    const fetchedByHandle = new Map(fetched.map((product) => [product.handle, product]));
    output = existing.map((product) => {
      const current = fetchedByHandle.get(product.handle);
      return current ? { ...product, images: current.images } : product;
    });
  }

  mkdirSync(resolve("data/sources"), { recursive: true });
  const temporary = `${OUT}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(output, null, 2)}\n`);
  renameSync(temporary, OUT);

  console.log(
    `\n${products.length} products fetched; ${imagesOnly ? "images refreshed in" : "snapshot written to"} ${OUT}`,
  );
}

main();
