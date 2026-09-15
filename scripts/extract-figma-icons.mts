/**
 * Splits the "Icon set" frame exported from Figma into individual assets.
 *
 *   node scripts/extract-figma-icons.mts "~/Downloads/Icon set.svg"
 *
 * The frame is a 6x6 grid of 22.2px cells. Roughly half the cells hold
 * true vector artwork and the rest hold 512x512 PNGs that were pasted
 * into Figma rather than drawn there, so each cell is emitted in whatever
 * form it actually is: SVG for vectors, WebP for the rasters.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const CELL = 22.2;
const STEP = 42.2;
const OUT = resolve("public/images/icons");

type Cell = { col: number; row: number };

function cellOf(x: number, y: number): Cell {
  return { col: Math.round(x / STEP), row: Math.round(y / STEP) };
}

function cellName(cell: Cell): string {
  return `r${cell.row + 1}c${cell.col + 1}`;
}

async function main() {
  const source = process.argv[2] ?? "Icon set.svg";
  const svg = readFileSync(source, "utf8");
  mkdirSync(OUT, { recursive: true });

  const raster: string[] = [];
  const vector: string[] = [];

  // --- raster cells -------------------------------------------------
  for (const match of svg.matchAll(
    /<rect(?:\s+x="([\d.]+)")?(?:\s+y="([\d.]+)")?\s+width="([\d.]+)"\s+height="([\d.]+)"\s+fill="url\(#pattern(\d+)_/g,
  )) {
    const [, xs, ys, , , index] = match;
    const cell = cellOf(Number(xs ?? 0), Number(ys ?? 0));

    const useRef = new RegExp(
      `<pattern id="pattern${index}_[^"]*"[\\s\\S]*?xlink:href="#(image\\d+_[^"]*)"`,
    ).exec(svg);
    if (!useRef) continue;

    const image = new RegExp(
      `<image id="${useRef[1]}"[^>]*xlink:href="data:image/png;base64,([^"]+)"`,
    ).exec(svg);
    if (!image) continue;

    const png = Buffer.from(image[1], "base64");
    const name = cellName(cell);
    // 128px covers a 64px icon at 2x, which is larger than anything the
    // UI actually renders.
    await sharp(png)
      .resize({ width: 128, height: 128, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 92, effort: 6 })
      .toFile(`${OUT}/${name}.webp`);
    raster.push(name);
  }

  // --- vector cells -------------------------------------------------
  const body = svg.slice(svg.indexOf(">") + 1, svg.indexOf("<defs>"));
  const elements = [
    ...body.matchAll(/<g clip-path="url\(#clip\d+_[^"]*\)">[\s\S]*?<\/g>/g),
    ...body.matchAll(/<path d="[^"]+"[^>]*\/>/g),
  ].map((m) => m[0]);

  const seen = new Set<string>();
  for (const element of elements) {
    const numbers = [...element.matchAll(/-?\d+\.?\d*/g)].map((m) => Number(m[0]));
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      xs.push(numbers[i]);
      ys.push(numbers[i + 1]);
    }
    if (xs.length === 0) continue;

    const cell = cellOf(Math.min(...xs), Math.min(...ys));
    if (cell.col < 0 || cell.col > 5 || cell.row < 0 || cell.row > 5) continue;

    const name = cellName(cell);
    if (seen.has(name)) continue;
    seen.add(name);

    // currentColor so the icon inherits the text colour of wherever it is
    // used. A hard-coded grey cannot sit on both the light page and the
    // dark header.
    const artwork = element.replace(/fill="#[0-9A-Fa-f]{3,8}"/g, 'fill="currentColor"');

    writeFileSync(
      `${OUT}/${name}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(cell.col * STEP).toFixed(2)} ${(cell.row * STEP).toFixed(2)} ${CELL} ${CELL}" width="24" height="24" fill="none">${artwork}</svg>\n`,
    );
    vector.push(name);
  }

  console.log(`vector icons: ${vector.length} -> ${vector.sort().join(", ")}`);
  console.log(`raster icons: ${raster.length} -> ${raster.sort().join(", ")}`);
  console.log(`written to ${OUT}`);
}

main();
