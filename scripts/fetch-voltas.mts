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

import { writeFileSync, mkdirSync } from "node:fs";
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

async function main() {
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

  mkdirSync(resolve("data/sources"), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      products.map((p) => ({
        handle: p.handle,
        title: p.title,
        vendor: p.vendor,
        productType: p.product_type,
        // Tags and the full HTML body are dropped: the body is marketing
        // copy we rewrite anyway, and keeping it bloats the diff on every
        // sync for no benefit.
        description: p.body_html
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
        images: p.images
          .filter((i) => i.width >= 800)
          .map((i) => ({ src: i.src.split("?")[0], width: i.width, height: i.height })),
        variants: p.variants.map((v) => ({
          sku: v.sku,
          price: Number(v.price),
          mrp: v.compare_at_price ? Number(v.compare_at_price) : null,
          barcode: v.barcode,
          grams: v.grams,
        })),
      })),
      null,
      2,
    ) + "\n",
  );

  console.log(`\n${products.length} products -> ${OUT}`);
}

main();
