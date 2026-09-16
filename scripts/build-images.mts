/**
 * Product image pipeline.
 *
 *   node scripts/build-images.mts
 *
 * Source photographs live in `assets/products/` and are committed as they
 * were supplied. This generates the sizes the site actually serves, in
 * AVIF with a WebP fallback, plus a manifest of intrinsic dimensions so
 * pages can reserve the right box and never shift as images load.
 *
 * The site is a static export with `images.unoptimized`, so nothing
 * resizes at request time — if a size is not generated here, it is not
 * available. That is the trade for having no server.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";

const SOURCE = resolve("assets/products");
const OUT = resolve("public/images/products");
const MANIFEST = join(OUT, "manifest.json");

/** Card renders ~280px, the product page ~440px. These cover both at 2x
 *  without shipping a 1254px file to a phone. */
const WIDTHS = [400, 800, 1600];

type Entry = { width: number; height: number; widths: number[] };

/**
 * Makes near-white pixels transparent.
 *
 * Product photography arrives on a white sweep. The threshold is
 * deliberately high so only the sweep goes: a lower one starts eating the
 * highlights on a stainless-steel door.
 */
async function knockOutWhite(input: Buffer): Promise<Buffer> {
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const THRESHOLD = 244;

  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i] >= THRESHOLD && data[i + 1] >= THRESHOLD && data[i + 2] >= THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const sources = readdirSync(SOURCE).filter((f) => /\.(png|jpe?g)$/i.test(f));
  const manifest: Record<string, Entry> = {};

  for (const file of sources) {
    const base = basename(file, extname(file));
    const input = readFileSync(join(SOURCE, file));
    const meta = await sharp(input).metadata();
    const srcWidth = meta.width ?? 0;
    const srcHeight = meta.height ?? 0;

    // Never upscale: a 400px source blown up to 1600 is a bigger file
    // that looks worse than the original.
    const widths = WIDTHS.filter((w) => w <= srcWidth);
    if (widths.length === 0) widths.push(srcWidth);

    for (const width of widths) {
      const resized = sharp(input).resize({ width, withoutEnlargement: true });
      await resized.clone().avif({ quality: 58, effort: 6 }).toFile(join(OUT, `${base}-${width}.avif`));
      await resized.clone().webp({ quality: 80, effort: 6 }).toFile(join(OUT, `${base}-${width}.webp`));
    }

    manifest[base] = { width: srcWidth, height: srcHeight, widths };

    // A cutout variant with the studio white knocked out, for placing the
    // product on a dark surface. Compositing a white-background photo onto
    // a dark panel otherwise shows the white box, and dropping the opacity
    // to hide it washes the product out with it.
    const cutout = await knockOutWhite(input);
    for (const width of widths) {
      const resized = sharp(cutout).resize({ width, withoutEnlargement: true });
      await resized.clone().avif({ quality: 58, effort: 6 }).toFile(join(OUT, `${base}-cutout-${width}.avif`));
      await resized.clone().webp({ quality: 80, effort: 6 }).toFile(join(OUT, `${base}-cutout-${width}.webp`));
    }
    manifest[`${base}-cutout`] = { width: srcWidth, height: srcHeight, widths };

    const report = widths
      .map((w) => {
        const avif = readFileSync(join(OUT, `${base}-${w}.avif`)).length;
        const webp = readFileSync(join(OUT, `${base}-${w}.webp`)).length;
        return `${w}px avif ${(avif / 1024).toFixed(1)}KB / webp ${(webp / 1024).toFixed(1)}KB`;
      })
      .join(", ");
    console.log(`${base}  ${srcWidth}x${srcHeight}  ->  ${report}`);
  }

  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`manifest: ${Object.keys(manifest).length} image(s)`);
}

main();
