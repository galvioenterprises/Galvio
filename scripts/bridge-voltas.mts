/**
 * Turns confirmed Voltas matches into importable product rows.
 *
 *   node scripts/bridge-voltas.mts            # confident matches only
 *   node scripts/bridge-voltas.mts --all      # include reviewed weak ones
 *
 * Reads the match report and the cached catalogue, downloads the product
 * photography into assets/products/<sku>/, and writes a CSV in the shape
 * the importer expects.
 *
 * Decisions a human has made about weak matches live in
 * data/sources/voltas-decisions.json and always win over the score.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

type Catalogue = {
  handle: string;
  title: string;
  productType: string;
  description: string;
  images: { src: string; width: number; height: number }[];
  variants: { sku: string | null; price: number; mrp: number | null; barcode: string | null; grams: number }[];
}[];

/** Voltas' own product types, mapped to our category registry. Anything
 *  unmapped is imported as `not-listed` rather than guessed at. */
const CATEGORY: Record<string, string> = {
  "Adjustable Inverter AC": "Air Conditioner",
  "Non-Inverter Window AC": "Air Conditioner",
  "Adjustable Inverter Window AC": "Air Conditioner",
  "Fixed Speed AC": "Air Conditioner",
  Convertibles: "Air Conditioner",
  "Direct Cool": "Refrigerator",
  "Frost Free": "Refrigerator",
  "Side by Side": "Refrigerator",
  "Desert Cooler": "Air Cooler",
  "Personal Coolers": "Air Cooler",
  "Room Air Coolers": "Air Cooler",
  "Tower Coolers": "Air Cooler",
  "Storage Geyser": "Water Heater",
  "Instant Geyser": "Water Heater",
  "Semi-automatic Twin Tub": "Washing Machine",
  "Fully Automatic Top Load": "Washing Machine",
  "Fully Automatic Front Load": "Washing Machine",
  "Bottom Mount Water Dispensers": "Water Dispenser",
  "Water Coolers": "Water Dispenser",
  "Visi Cooler": "Visi Cooler",
  Stabilizer: "Stabiliser",
};

const SUB: Record<string, string> = {
  "Adjustable Inverter AC": "Split AC",
  "Non-Inverter Window AC": "Window AC",
  "Adjustable Inverter Window AC": "Window AC",
  Convertibles: "Split AC",
  "Direct Cool": "Single Door",
  "Frost Free": "Double Door",
  "Side by Side": "Side by Side",
  "Desert Cooler": "Desert",
  "Personal Coolers": "Personal",
  "Storage Geyser": "Storage",
  "Instant Geyser": "Instant",
  "Semi-automatic Twin Tub": "Semi Automatic",
  "Fully Automatic Top Load": "Top Load",
  "Fully Automatic Front Load": "Front Load",
};

const PREFIX: Record<string, string> = {
  "Air Conditioner": "AC",
  Refrigerator: "RF",
  "Washing Machine": "WM",
  "Air Cooler": "CO",
  "Water Dispenser": "WD",
  "Water Heater": "WH",
  Stabiliser: "ST",
  Freezer: "FZ",
  "Visi Cooler": "VC",
  "Air Purifier": "AP",
  Television: "TV",
  Microwave: "MW",
};

const HEADER =
  "sku,internal_code,status,brand,series,model,variant_of,gtin,hsn,title,description,category,sub_category,mrp,selling_price,gst_rate,availability,stock_count,condition,installation_included,warranty_months,compressor_warranty_months,weight_kg,length_mm,width_mm,height_mm,capacity,color,star_rating,inverter,rating_value,rating_count,highlights,faqs,image_files";

const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Capacity as the customer says it, pulled out of the Voltas title. */
function capacityOf(title: string): string {
  const ton = /(\d+(?:\.\d+)?)\s*Ton/i.exec(title);
  if (ton) return `${ton[1]} Ton`;
  const litre = /(\d+)\s*L\b/i.exec(title);
  if (litre) return `${litre[1]}L`;
  const kg = /(\d+(?:\.\d+)?)\s*Kg/i.exec(title);
  if (kg) return `${kg[1]} kg`;
  return "";
}

function starOf(title: string): string {
  const m = /(\d)\s*Star/i.exec(title);
  return m ? m[1] : "";
}

/** The first two sentences of the Voltas copy, with their shipping and
 *  returns boilerplate stripped — that is our policy to state, not
 *  theirs, and it is wrong for us anyway. */
function describe(text: string): string {
  const cleaned = text
    .replace(/For Installation\/Demo request click here\s*\.?/gi, "")
    .replace(/Standard Installation is FREE[^.]*\.?/gi, "")
    .replace(/Delivery timeline is[^.]*\.?/gi, "")
    .replace(/Order once Invoiced[^.]*\.?/gi, "")
    .replace(/Refund will be credited[^.]*\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const sentences = cleaned.split(/(?<=\.)\s+/).filter((s) => s.length > 30);
  return sentences.slice(0, 3).join(" ").slice(0, 600);
}

async function main() {
  const includeWeak = process.argv.includes("--all");
  const catalogue = JSON.parse(
    readFileSync(resolve("data/sources/voltas-catalogue.json"), "utf8"),
  ) as Catalogue;
  const byHandle = new Map(catalogue.map((p) => [p.handle, p]));

  const decisionsPath = resolve("data/sources/voltas-decisions.json");
  const decisions: Record<string, string | null> = existsSync(decisionsPath)
    ? JSON.parse(readFileSync(decisionsPath, "utf8"))
    : {};

  const report = readFileSync(resolve("data/sources/voltas-match-report.tsv"), "utf8")
    .trim()
    .split("\n")
    .map((l) => l.split("\t"));

  const counters: Record<string, number> = {};
  const rows: string[] = [];
  const images: { sku: string; urls: string[] }[] = [];
  let skipped = 0;

  for (const [verdict, , line, , , , , handle] of report) {
    const decided = decisions[line];
    // An explicit decision always wins; null means "reviewed, not a match".
    const useHandle =
      decided !== undefined
        ? decided
        : verdict === "MATCH" || (includeWeak && verdict === "WEAK")
          ? handle
          : null;

    if (!useHandle) {
      skipped++;
      continue;
    }
    const p = byHandle.get(useHandle);
    if (!p) {
      skipped++;
      continue;
    }

    const category = CATEGORY[p.productType] ?? (/stabili[sz]er/i.test(p.title) ? "Stabiliser" : "");
    const status = category ? "active" : "not-listed";
    const prefix = PREFIX[category] ?? "XX";
    counters[prefix] = (counters[prefix] ?? 0) + 1;
    const sku = `GAL-${prefix}-${String(counters[prefix]).padStart(3, "0")}`;

    const v = p.variants[0];
    const best = [...p.images].sort((a, b) => b.width - a.width).slice(0, 3);
    if (best.length) images.push({ sku, urls: best.map((i) => i.src) });

    rows.push(
      [
        sku,
        q(line),
        status,
        /beko/i.test(p.title) ? "Voltas Beko" : "Voltas",
        "",
        q(v?.sku ?? p.handle),
        "",
        "",
        "",
        q(p.title.replace(/\s*,?\s*A Tata Product\s*$/i, "").replace(/\s*,\s*Voltas Beko\s*$/i, "")),
        q(describe(p.description)),
        category,
        SUB[p.productType] ?? "",
        v?.mrp ?? "",
        v?.price ?? "",
        "",
        "in_stock",
        "",
        "new",
        "",
        "",
        "",
        v && v.grams > 0 ? (v.grams / 1000).toFixed(1) : "",
        "",
        "",
        "",
        capacityOf(p.title),
        "",
        starOf(p.title),
        /inverter/i.test(p.title) ? "true" : "",
        "",
        "",
        "",
        "",
        best.length ? sku.toLowerCase() : "",
      ].join(","),
    );
  }

  writeFileSync(resolve("data/products.csv"), [HEADER, ...rows].join("\n") + "\n");
  writeFileSync(
    resolve("data/sources/voltas-images.json"),
    JSON.stringify(images, null, 2) + "\n",
  );

  mkdirSync(resolve("assets/products"), { recursive: true });
  console.log(`${rows.length} rows -> data/products.csv`);
  console.log(`${skipped} lines skipped (no match or reviewed as not a match)`);
  console.log(`${images.length} products with photography -> run: pnpm sync:images`);
}

main();
