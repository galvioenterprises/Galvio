/**
 * Downloads product photography listed by the Voltas bridge.
 *
 *   node scripts/sync-images.mts
 *
 * Files land in assets/products/<sku>/ and are then picked up by
 * scripts/build-images.mts, which produces the AVIF and WebP the site
 * serves. Already-downloaded files are skipped, so re-running after a
 * partial failure is cheap and safe.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const LIST = resolve("data/sources/voltas-images.json");
const OUT = resolve("assets/products");

async function main() {
  const items = JSON.parse(readFileSync(LIST, "utf8")) as {
    sku: string;
    urls: string[];
  }[];

  let downloaded = 0;
  let skipped = 0;

  for (const { sku, urls } of items) {
    const dir = join(OUT, sku.toLowerCase());
    mkdirSync(dir, { recursive: true });

    for (const [i, url] of urls.entries()) {
      const ext = url.toLowerCase().endsWith(".png") ? "png" : "jpg";
      const file = join(dir, `${i + 1}.${ext}`);
      if (existsSync(file)) {
        skipped++;
        continue;
      }

      const response = await fetch(url, {
        headers: { "user-agent": "galvioenterprises.com catalogue sync" },
      });
      if (!response.ok) {
        console.warn(`  ${sku} image ${i + 1}: HTTP ${response.status}`);
        continue;
      }

      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
      downloaded++;
      // Politeness, same as the catalogue fetch.
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  console.log(`downloaded ${downloaded}, already present ${skipped}`);
}

main();
