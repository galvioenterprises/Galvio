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

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";

const SOURCE = resolve("assets/products");
const OUT = resolve("public/images/products");
const MANIFEST = join(OUT, "manifest.json");

/** Gallery thumbnails render ~70px, cards up to ~400px, and the product hero
 *  up to ~700px. The ladder keeps thumbnails light; gallery shots also retain
 *  their natural width between steps for a crisp high-density hero. */
const WIDTHS = [160, 400, 800, 1600];

/**
 * Base names that also get a transparent cutout, for placing on a dark
 * surface such as a category banner. Everything else is served as shot.
 */
const CUTOUTS = new Set([
  "voltas-4504051",
  "voltas-4810348-2",
  "voltas-side-by-side",
  // Hero slides: shots on a plain white background.
  "voltas-5211776-3",
  "voltas-5410921-6",
  "voltas-9014092-2",
  "voltas-4810441-2",
  // Hero-only shots from voltas.com: Voltas Beko 472 L side-by-side
  // (doors open) and the GT440 flat glass-top freezer (two glass lids).
  "voltas-hero-fridge-sbs",
  "voltas-hero-freezer-glasstop",
]);

type Entry = {
  width: number;
  height: number;
  widths: number[];
  /** Cache key for generated transforms whose output is not source-only. */
  processorVersion?: number;
};
type Source = {
  base: string;
  path: string;
  /** The first manufacturer shot is the catalogue/hero photograph. */
  trimBlankEdges: boolean;
};
type SourceResult = {
  entries: [string, Entry][];
  encoded: number;
  cached: number;
};

const WORKERS = 4;
const PRIMARY_PROCESSOR_VERSION = 1;
const SECONDARY_PROCESSOR_VERSION = 1;
const CUTOUT_PROCESSOR_VERSION = 2;

/**
 * Makes the near-white background transparent.
 *
 * Product photography arrives on a white sweep, but many appliances are
 * white too. Only near-white pixels connected to an outer edge are treated
 * as background; removing every white pixel would punch holes through an AC.
 */
async function knockOutWhite(input: Buffer): Promise<Buffer> {
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const THRESHOLD = 250;
  const pixels = info.width * info.height;
  const visited = new Uint8Array(pixels);
  const queue = new Uint32Array(pixels);
  let head = 0;
  let tail = 0;

  const addIfBackground = (pixel: number) => {
    if (visited[pixel]) return;
    visited[pixel] = 1;
    const offset = pixel * info.channels;
    if (
      data[offset] >= THRESHOLD &&
      data[offset + 1] >= THRESHOLD &&
      data[offset + 2] >= THRESHOLD
    ) {
      queue[tail++] = pixel;
    }
  };

  for (let x = 0; x < info.width; x++) {
    addIfBackground(x);
    addIfBackground((info.height - 1) * info.width + x);
  }
  for (let y = 1; y < info.height - 1; y++) {
    addIfBackground(y * info.width);
    addIfBackground(y * info.width + info.width - 1);
  }

  while (head < tail) {
    const pixel = queue[head++];
    data[pixel * info.channels + 3] = 0;
    const x = pixel % info.width;
    if (x > 0) addIfBackground(pixel - 1);
    if (x + 1 < info.width) addIfBackground(pixel + 1);
    if (pixel >= info.width) addIfBackground(pixel - info.width);
    if (pixel + info.width < pixels) addIfBackground(pixel + info.width);
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function processSource(
  { base, path, trimBlankEdges }: Source,
  previousManifest: Record<string, Entry>,
): Promise<SourceResult> {
  const original = readFileSync(path);

  // Manufacturer hero shots commonly put a wide appliance in the middle of
  // a square white canvas. Keeping that unused canvas makes the *product*
  // tiny even when its UI frame is large. Trim only the outer border that
  // matches the corner pixel (white for JPEGs, transparent for PNGs), leaving
  // a small breathing margin and every product pixel intact. Secondary gallery
  // graphics stay exactly as supplied.
  const input = trimBlankEdges
    ? await sharp(original)
        .trim({ threshold: 12, margin: 24 })
        .toBuffer()
    : original;
  const meta = await sharp(input).metadata();
  const srcWidth = meta.width ?? 0;
  const srcHeight = meta.height ?? 0;
  let encoded = 0;
  let cached = 0;

  // Never upscale: a 400px source blown up to 1600 is a bigger file
  // that looks worse than the original.
  const widths = WIDTHS.filter((width) => width <= srcWidth);
  if (widths.length === 0) widths.push(srcWidth);
  // Preserve every gallery photograph's natural detail between ladder steps.
  // A 1,200px source should not top out at 800px when the desktop gallery is
  // 600-700 CSS pixels wide on a high-density display.
  const naturalWidth = Math.min(srcWidth, WIDTHS[WIDTHS.length - 1]);
  if (widths[widths.length - 1] < naturalWidth) {
    widths.push(naturalWidth);
  }

  // Skip anything already generated from an unchanged source. AVIF
  // encoding is slow, and without this every build re-encodes the whole
  // catalogue — which is minutes per build for no change at all.
  const sourceTime = statSync(path).mtimeMs;
  const processorVersion = trimBlankEdges
    ? PRIMARY_PROCESSOR_VERSION
    : SECONDARY_PROCESSOR_VERSION;
  const previousEntry = previousManifest[base];
  // Version 1 formalises the existing secondary transform. Accept an
  // unversioned-but-fresh derivative once, then stamp it in the new manifest;
  // subsequent processor changes increment the version and force a rebuild.
  const legacySecondaryIsCurrent =
    !trimBlankEdges &&
    SECONDARY_PROCESSOR_VERSION === 1 &&
    previousEntry !== undefined &&
    previousEntry.processorVersion === undefined;
  const processorIsCurrent =
    previousEntry?.processorVersion === processorVersion ||
    legacySecondaryIsCurrent;
  const fresh = (file: string) => {
    try {
      return processorIsCurrent && statSync(file).mtimeMs >= sourceTime;
    } catch {
      return false;
    }
  };
  const cutoutBase = `${base}-cutout`;
  const cutoutProcessorIsCurrent =
    previousManifest[cutoutBase]?.processorVersion === CUTOUT_PROCESSOR_VERSION;
  const freshCutout = (file: string) => {
    try {
      return cutoutProcessorIsCurrent && statSync(file).mtimeMs >= sourceTime;
    } catch {
      return false;
    }
  };

  for (const width of widths) {
    const avif = join(OUT, `${base}-${width}.avif`);
    const webp = join(OUT, `${base}-${width}.webp`);
    if (fresh(avif) && fresh(webp)) {
      cached++;
      continue;
    }
    const resized = sharp(input).resize({ width, withoutEnlargement: true });
    await resized.clone().avif({ quality: 58, effort: 6 }).toFile(avif);
    await resized.clone().webp({ quality: 80, effort: 6 }).toFile(webp);
    encoded++;
  }

  const entries: [string, Entry][] = [
    [
      base,
      {
        width: srcWidth,
        height: srcHeight,
        widths,
        processorVersion,
      },
    ],
  ];

  // Cutouts are opt-in. Knocking the white out is a per-pixel pass over
  // a multi-megapixel image, and only the handful placed on a dark
  // surface need one — doing it for the whole catalogue costs minutes
  // per build and produces files nothing references.
  if (!CUTOUTS.has(base)) return { entries, encoded, cached };

  const cutoutIsFresh = widths.every(
    (width) =>
      freshCutout(join(OUT, `${cutoutBase}-${width}.avif`)) &&
      freshCutout(join(OUT, `${cutoutBase}-${width}.webp`)),
  );

  if (cutoutIsFresh) {
    cached += widths.length;
  } else {
    const cutout = await knockOutWhite(input);
    for (const width of widths) {
      const avif = join(OUT, `${cutoutBase}-${width}.avif`);
      const webp = join(OUT, `${cutoutBase}-${width}.webp`);
      if (freshCutout(avif) && freshCutout(webp)) {
        cached++;
        continue;
      }
      const resized = sharp(cutout).resize({ width, withoutEnlargement: true });
      await resized.clone().avif({ quality: 58, effort: 6 }).toFile(avif);
      await resized.clone().webp({ quality: 80, effort: 6 }).toFile(webp);
      encoded++;
    }
  }
  entries.push([
    cutoutBase,
    {
      width: srcWidth,
      height: srcHeight,
      widths,
      processorVersion: CUTOUT_PROCESSOR_VERSION,
    },
  ]);
  return { entries, encoded, cached };
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  // Processor versions make cache invalidation deliberate. Using this
  // script's mtime would re-encode every hero after a comment-only edit.
  let previousManifest: Record<string, Entry> = {};
  try {
    previousManifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  } catch {
    // A cold build simply has no reusable derivatives.
  }

  /**
   * Sources are either a loose file (`voltas-side-by-side.png`) or a
   * folder per SKU holding its shots (`gal-ac-001/1.jpg`). The folder
   * form is what the Voltas sync produces, and it means nobody has to
   * keep filenames in step with a spreadsheet.
   */
  const sources: Source[] = [];
  for (const entry of readdirSync(SOURCE)) {
    const full = join(SOURCE, entry);
    if (statSync(full).isDirectory()) {
      const shots = readdirSync(full)
        .filter((f) => /\.(png|jpe?g)$/i.test(f))
        // The sync stores manufacturer shots as 1.jpg, 2.jpg, ... . A plain
        // lexical sort puts 10 before 2 and silently scrambles galleries.
        .sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
      shots.forEach((shot, i) =>
        sources.push({
          base: i === 0 ? entry : `${entry}-${i + 1}`,
          path: join(full, shot),
          trimBlankEdges: i === 0,
        }),
      );
    } else if (/\.(png|jpe?g)$/i.test(entry)) {
      sources.push({
        base: basename(entry, extname(entry)),
        path: full,
        trimBlankEdges: false,
      });
    }
  }

  // Sharp/libvips can safely process independent files concurrently. Four
  // workers cut a cold catalogue build substantially without letting hundreds
  // of AVIF encodes contend for memory at once. Results are assembled in source
  // order afterward so the manifest stays deterministic across runs.
  const results = new Array<SourceResult>(sources.length);
  let nextSource = 0;
  const worker = async () => {
    while (nextSource < sources.length) {
      const index = nextSource++;
      results[index] = await processSource(sources[index], previousManifest);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(WORKERS, sources.length) }, () => worker()),
  );

  const manifest: Record<string, Entry> = {};
  let encoded = 0;
  let cached = 0;
  for (const result of results) {
    encoded += result.encoded;
    cached += result.cached;
    for (const [base, entry] of result.entries) manifest[base] = entry;
  }

  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `${Object.keys(manifest).length} images in manifest — ${encoded} encoded, ${cached} already current`,
  );
}

main();
