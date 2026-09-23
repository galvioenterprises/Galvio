/**
 * Matches the distributor's stock list against the Voltas catalogue.
 *
 *   node scripts/match-voltas.mts            # report only
 *   node scripts/match-voltas.mts --csv out.csv
 *
 * The stock list is an ERP export written for humans who already know the
 * range: "Voltas 1.5T SAC 183 INV Vertis Zephyr Gold". The catalogue
 * titles it the long way: "Voltas Split Air Conditioner, 1.5 Ton, 3 Star
 * - 183INV Vertis Zephyr Gold". Matching them is a scoring problem, and
 * the scores are reported rather than hidden so a human decides the
 * borderline cases.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Catalogue = {
  handle: string;
  title: string;
  productType: string;
  description: string;
  images: { src: string; width: number; height: number }[];
  variants: { sku: string | null; price: number; mrp: number | null; barcode: string | null; grams: number }[];
}[];

const STOPWORDS = new Set([
  "voltas", "beko", "the", "and", "with", "star", "ton", "litre", "litres",
  "split", "window", "air", "conditioner", "ac", "kg", "tata", "product",
  "a", "of", "for", "in", "w",
]);

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Tokens, plus every adjacent pair joined.
 *
 * The stock list writes "183 INV" and the catalogue writes "183INV". Both
 * mean the same model, and joining adjacent tokens is what lets them meet
 * without a table of special cases.
 */
function tokenSet(s: string): Set<string> {
  const raw = normalise(s).split(" ").filter(Boolean);
  const out = new Set<string>();

  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    if (t.length > 1 && !STOPWORDS.has(t)) out.add(t);
    if (i + 1 < raw.length) out.add(t + raw[i + 1]);
  }
  return out;
}

/** A token carrying digits is a model code, and worth far more than a
 *  marketing word that half the range shares. */
const isCode = (t: string) => /\d/.test(t) && t.length >= 3;

/**
 * Longer codes are stronger evidence. "wtt70dgrt" identifies one machine;
 * "70" appears in half the washing machines on the page, and treating the
 * two as equal is what pairs a WTT with a WTL.
 */
const codeWeight = (t: string) => (t.length >= 6 ? 10 : t.length >= 4 ? 4 : 1);

function score(line: string, title: string): number {
  const a = tokenSet(line);
  const b = tokenSet(title);

  let codeHits = 0;
  let wordHits = 0;
  let wordTotal = 0;

  for (const t of a) {
    if (isCode(t)) {
      if (b.has(t)) codeHits += codeWeight(t);
    } else {
      wordTotal++;
      if (b.has(t)) wordHits++;
    }
  }

  const wordScore = wordTotal === 0 ? 0 : wordHits / wordTotal;
  return codeHits + wordScore * 6;
}

/** One shared model code, or very strong word agreement. */
const CONFIDENT = 10;

function main() {
  const lines = readFileSync(resolve("data/sources/stock-list.txt"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const catalogue = JSON.parse(
    readFileSync(resolve("data/sources/voltas-catalogue.json"), "utf8"),
  ) as Catalogue;

  const rows: string[] = [];
  let confident = 0;
  let weak = 0;
  let none = 0;

  for (const line of lines) {
    let best: { p: Catalogue[number]; s: number } | null = null;
    for (const p of catalogue) {
      const s = score(line, p.title);
      if (!best || s > best.s) best = { p, s };
    }

    if (!best || best.s < 2) {
      none++;
      rows.push(`NONE\t0\t${line}\t`);
      continue;
    }
    if (best.s >= CONFIDENT) confident++;
    else weak++;

    const v = best.p.variants[0];
    const img = best.p.images.sort((a, b) => b.width - a.width)[0];
    rows.push(
      [
        best.s >= CONFIDENT ? "MATCH" : "WEAK",
        best.s.toFixed(1),
        line,
        best.p.title,
        v ? `MRP ${v.mrp ?? "-"} / ${v.price}` : "-",
        v?.sku ?? "-",
        img ? `${img.width}x${img.height}` : "no image",
        best.p.handle,
      ].join("\t"),
    );
  }

  console.log(`stock lines      : ${lines.length}`);
  console.log(`confident matches: ${confident}`);
  console.log(`weak matches     : ${weak}  (review these)`);
  console.log(`no match         : ${none}`);

  const outFlag = process.argv.indexOf("--csv");
  if (outFlag !== -1 && process.argv[outFlag + 1]) {
    writeFileSync(process.argv[outFlag + 1], rows.join("\n") + "\n");
    console.log(`\nreport -> ${process.argv[outFlag + 1]}`);
  } else {
    console.log("\nsample:");
    rows.slice(0, 12).forEach((r) => console.log("  " + r.split("\t").slice(0, 5).join("  |  ")));
  }
}

main();
