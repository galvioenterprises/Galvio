/**
 * Cuts the split-AC indoor unit out of Voltas's Zephyr Gold dimension
 * photo, for the hero.
 *
 *   node scripts/cut-hero-ac.mts
 *
 * Every Voltas AC gallery image carries printed banners, badges or a brand
 * ambassador; the dimension shot is the one place the indoor unit sits
 * alone, white on a purple gradient. The purple is keyed out by hue, the
 * thin dimension arrows are dropped by keeping only the largest connected
 * shape, and the result lands in assets/products/ so the normal image
 * build turns it into AVIF/WebP.
 *
 * Replace this with a proper studio render from the distributor when one
 * is available.
 */

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const SOURCE = resolve("assets/products/voltas-4504085/3.jpg");
const OUT_DIR = resolve("assets/products/voltas-hero-split-ac");
// The indoor unit, in the 1500 x 1500 source.
const CROP = { left: 170, top: 95, width: 1010, height: 460 };

function isBackground(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  // The unit is white/grey (low saturation) with a gold trim (red > blue).
  // The backdrop is violet: blue clearly above red and green.
  return saturation > 0.12 && b > r && b > g;
}

async function main() {
  const { data, info } = await sharp(SOURCE)
    .extract(CROP)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const n = width * height;

  const foreground = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 3;
    foreground[i] = isBackground(data[o], data[o + 1], data[o + 2]) ? 0 : 1;
  }

  // Largest 4-connected foreground component.
  const label = new Int32Array(n).fill(-1);
  let best = -1;
  let bestSize = 0;
  const stack: number[] = [];
  for (let start = 0; start < n; start++) {
    if (!foreground[start] || label[start] !== -1) continue;
    let size = 0;
    label[start] = start;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % width;
      const neighbours = [p - width, p + width, x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1];
      for (const q of neighbours) {
        if (q >= 0 && q < n && foreground[q] && label[q] === -1) {
          label[q] = start;
          stack.push(q);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = start;
    }
  }

  // Fill holes: background pixels not reachable from the border belong to
  // the unit (vents and logo interiors can read as violet-ish).
  const outside = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && label[i] !== best) {
      outside[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % width;
    const neighbours = [p - width, p + width, x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1];
    for (const q of neighbours) {
      if (q >= 0 && q < n && !outside[q] && label[q] !== best) {
        outside[q] = 1;
        stack.push(q);
      }
    }
  }

  const rgba = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = outside[i] ? 0 : 255;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  // A light blur on the alpha only softens the stair-stepped edge.
  const alpha = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extractChannel(3)
    .blur(0.8)
    .raw()
    .toBuffer();
  for (let i = 0; i < n; i++) rgba[i * 4 + 3] = alpha[i];

  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 1 })
    .png()
    .toFile(resolve(OUT_DIR, "1.png"));
  console.log(`hero AC cut-out -> ${OUT_DIR}/1.png (kept ${bestSize} px)`);
}

main();
