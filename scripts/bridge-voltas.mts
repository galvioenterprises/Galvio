/**
 * Convert safe or explicitly reviewed Voltas matches into an import batch.
 *
 *   pnpm bridge:voltas
 *   pnpm bridge:voltas -- --out /tmp/voltas-products.csv
 *
 * The bridge never writes data/products.csv and never imports. Supplier data
 * is staged under data/sources so a person can inspect the diff first.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Product = {
  handle: string;
  title: string;
  productType: string;
  description: string;
  images: { src: string; width: number; height: number }[];
  variants: {
    sku: string | null;
    price: number;
    mrp: number | null;
    barcode: string | null;
    grams: number;
  }[];
};

type ReportRow = {
  verdict: string;
  line: string;
  suggestedHandle: string;
  fingerprint: string;
};

type StoredDecision = {
  handle: string | null;
  fingerprint: string;
};

const CATEGORY: Record<string, string> = {
  "Adjustable Inverter AC": "Air Conditioner",
  "Non-Inverter Window AC": "Air Conditioner",
  "Adjustable Inverter Window AC": "Air Conditioner",
  "Fixed Speed AC": "Air Conditioner",
  "Fixed Speed Split AC": "Air Conditioner",
  Convertibles: "Air Conditioner",
  "Direct Cool": "Refrigerator",
  "Frost Free": "Refrigerator",
  "Side by Side": "Refrigerator",
  "Desert Cooler": "Air Cooler",
  "Personal Coolers": "Air Cooler",
  "Room Air Coolers": "Air Cooler",
  "Tower Coolers": "Air Cooler",
  "Window Coolers": "Air Cooler",
  "Storage Geyser": "Water Heater",
  "Instant Geyser": "Water Heater",
  "Semi-automatic Twin Tub": "Washing Machine",
  "Fully Automatic Top Load": "Washing Machine",
  "Fully Automatic Front Load": "Washing Machine",
  "Bottom Mount Water Dispensers": "Water Dispenser",
  "Table Top Water Dispensers": "Water Dispenser",
  "Water Coolers": "Water Dispenser",
  "Visi Cooler": "Visi Cooler",
  Stabilizer: "Stabiliser",
  "Glass Top Chest Freezers": "Freezer",
};

const SUB_CATEGORY: Record<string, string> = {
  "Adjustable Inverter AC": "Split AC",
  "Non-Inverter Window AC": "Window AC",
  "Adjustable Inverter Window AC": "Window AC",
  "Fixed Speed AC": "Split AC",
  "Fixed Speed Split AC": "Split AC",
  Convertibles: "Split AC",
  "Direct Cool": "Single Door",
  "Frost Free": "Double Door",
  "Side by Side": "Side by Side",
  "Desert Cooler": "Desert",
  "Personal Coolers": "Personal",
  "Room Air Coolers": "Personal",
  "Tower Coolers": "Tower",
  "Window Coolers": "Personal",
  "Storage Geyser": "Storage",
  "Instant Geyser": "Instant",
  "Semi-automatic Twin Tub": "Semi Automatic",
  "Fully Automatic Top Load": "Top Load",
  "Fully Automatic Front Load": "Front Load",
  "Glass Top Chest Freezers": "Chest",
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
};

const HEADER =
  "sku,internal_code,status,brand,series,model,variant_of,gtin,hsn,title,description,category,sub_category,mrp,selling_price,gst_rate,availability,stock_count,condition,installation_included,warranty_months,compressor_warranty_months,weight_kg,length_mm,width_mm,height_mm,capacity,color,star_rating,inverter,rating_value,rating_count,highlights,faqs,image_files";

function csv(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function atomicText(file: string, contents: string): void {
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, contents);
  renameSync(temporary, file);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&deg;/g, "°");
}

function sentenceSafeExcerpt(value: string, maximum = 900): string {
  if (value.length <= maximum) return value;

  const prefix = value.slice(0, maximum + 1);
  const boundaries = [...prefix.matchAll(/[.!?](?=\s|$)/g)];
  const lastBoundary = boundaries.at(-1)?.index;

  // Product prose normally contains several complete sentences before the
  // limit. If it does not, retain the source instead of manufacturing a full
  // stop or publishing a clipped fragment.
  return lastBoundary !== undefined && lastBoundary >= 200
    ? prefix.slice(0, lastBoundary + 1).trim()
    : value;
}

function descriptionOf(raw: string): string {
  let value = decodeHtml(raw).replace(/<[^>]+>/g, " ");
  const refund = /Refund will be credited within 14 working days/i.exec(value);
  if (refund?.index !== undefined) value = value.slice(refund.index + refund[0].length);

  const keyFeatures = /Key Features\s*:/i.exec(value);
  if (keyFeatures?.index !== undefined && value.slice(0, keyFeatures.index).trim().length >= 40) {
    value = value.slice(0, keyFeatures.index);
  } else if (keyFeatures?.index !== undefined) {
    value = value.slice(keyFeatures.index + keyFeatures[0].length);
  }

  value = value.split(/View Product Catalogue|Brand Name\s*:|Country of Origin\s*:|Manufacturers?\s*\/\s*Importers?\s*:|Cancellation Refund Policy/i)[0];
  const normalized = value
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])(?=[A-Za-z])/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();

  return sentenceSafeExcerpt(normalized);
}

function capacityOf(category: string, title: string, description: string): string {
  if (category === "Air Conditioner") {
    const ton = /(\d+(?:\.\d+)?)\s*Ton\b/i.exec(title);
    return ton ? `${ton[1]} Ton` : "";
  }
  if (category === "Washing Machine") {
    const kg = /(\d+(?:\.\d+)?)\s*Kg\b/i.exec(title);
    return kg ? `${kg[1]} kg` : "";
  }
  if (["Refrigerator", "Air Cooler", "Water Heater", "Water Dispenser", "Freezer", "Visi Cooler"].includes(category)) {
    const litre = /(\d+(?:\.\d+)?)\s+(?:L\b|Litre\b)|\b(\d+(?:\.\d+)?)\s*L\b/i.exec(
      `${title} ${description}`,
    );
    const value = litre?.[1] ?? litre?.[2];
    return value ? `${value}L` : "";
  }
  return "";
}

/** "Inverter" in words, or Voltas's model suffix such as "183INV". */
function isInverter(title: string): boolean {
  return /inverter|\d+\s*INV/i.test(title);
}

function starOf(title: string): string {
  return /(\d)\s*Star/i.exec(title)?.[1] ?? "";
}

function stableKey(
  category: string,
  product: Product,
): { sku: string; assetKey: string; article: string } | undefined {
  const article = product.variants[0]?.sku?.trim();
  if (!article || !/^[A-Za-z0-9-]+$/.test(article)) return undefined;
  const identity = article.toUpperCase();
  const prefix = PREFIX[category];
  return {
    article,
    sku: `GAL-${prefix}-${identity}`,
    assetKey: `voltas-${identity.toLowerCase()}`,
  };
}

function cleanTitle(title: string): string {
  return decodeHtml(title)
    .replace(/\s*,?\s*A Tata Product\s*$/i, "")
    .replace(/\s*,\s*Voltas Beko\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "…Refrigerator (RDC215D/S0RFR0M0000GO, Fressia Ruby)…" -> "RDC215D". */
function modelCodeOf(title: string): string {
  return /\(\s*([A-Z]{2,4}\d{3}[A-Z]?)\s*\//.exec(title)?.[1] ?? "";
}

/** The finish named inside the brackets, e.g. "Fressia Ruby". */
function colourOf(title: string): string {
  const inner = /\(([^)]*)\)/.exec(title)?.[1] ?? "";
  const parts = inner.split(",").map((part) => part.trim());
  const colour = parts[1] && !/with|star|inverter|drawer|freeze|humid/i.test(parts[1]) ? parts[1] : "";
  // One spelling per finish, so the colour filter does not list "Inox steel"
  // and "Inox Steel" separately.
  return colour.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A model-level title for a colour group: the brackets keep only the code. */
function groupTitle(title: string): string {
  return title.replace(/\(([^)]*)\)/, (_, inner: string) => `(${inner.split(/[/,]/)[0].trim()})`);
}

function manufacturerPhotos(product: Product): Product["images"] {
  const seen = new Set<string>();
  return product.images.filter((photo) => {
    if (!photo.src || seen.has(photo.src)) return false;
    seen.add(photo.src);
    return true;
  });
}

function imageAssetKeys(assetKey: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => index === 0 ? assetKey : `${assetKey}-${index + 1}`,
  );
}

function reportRows(): ReportRow[] {
  return readFileSync(resolve("data/sources/voltas-match-report.tsv"), "utf8")
    .trim()
    .split("\n")
    .map((raw) => {
      const [verdict, , line, , , , , suggestedHandle] = raw.split("\t");
      return {
        verdict,
        line,
        suggestedHandle,
        fingerprint: createHash("sha256").update(raw).digest("hex"),
      };
    });
}

function preferredLine(lines: string[]): string {
  return [...lines].sort((left, right) => {
    const leftVariant = /(?:-|\/)\s*1\s*$/i.test(left) ? 1 : 0;
    const rightVariant = /(?:-|\/)\s*1\s*$/i.test(right) ? 1 : 0;
    return leftVariant - rightVariant || left.length - right.length || left.localeCompare(right);
  })[0];
}

function main() {
  if (process.argv.includes("--all")) {
    throw new Error("--all was removed: unreviewed weak matches must never be imported");
  }
  const outIndex = process.argv.indexOf("--out");
  const output = resolve(outIndex >= 0 && process.argv[outIndex + 1]
    ? process.argv[outIndex + 1]
    : "data/sources/voltas-products.csv");

  const catalogue = JSON.parse(
    readFileSync(resolve("data/sources/voltas-catalogue.json"), "utf8"),
  ) as Product[];
  const byHandle = new Map(catalogue.map((product) => [product.handle, product]));
  const decisionsPath = resolve("data/sources/voltas-decisions.json");
  const decisions: Record<string, StoredDecision | string | null> = existsSync(decisionsPath)
    ? JSON.parse(readFileSync(decisionsPath, "utf8"))
    : {};

  const selected = new Map<string, string[]>();
  let rejected = 0;
  let staleDecisions = 0;
  for (const row of reportRows()) {
    const decision = decisions[row.line];
    const currentDecision = row.verdict === "WEAK" && decision !== null &&
      typeof decision === "object" && decision.fingerprint === row.fingerprint
      ? decision
      : undefined;
    const staleDecision = decision !== undefined && !currentDecision;
    if (staleDecision) staleDecisions++;
    const handle = staleDecision
      ? null
      : currentDecision
        ? currentDecision.handle
        : row.verdict === "MATCH"
          ? row.suggestedHandle
          : null;
    if (!handle) {
      rejected++;
      continue;
    }
    if (!byHandle.has(handle)) {
      throw new Error(`review decision for "${row.line}" points to unknown Voltas handle "${handle}"`);
    }
    const lines = selected.get(handle) ?? [];
    lines.push(row.line);
    selected.set(handle, lines);
  }

  const rows: string[] = [];
  const images: { assetKey: string; urls: string[] }[] = [];
  const outsideScope: string[] = [];
  const missingIdentity: string[] = [];
  let duplicates = 0;

  for (const [handle, lines] of [...selected].sort(([left], [right]) => left.localeCompare(right))) {
    const product = byHandle.get(handle)!;
    const category = /freezer/i.test(product.title)
      ? "Freezer"
      : /stabili[sz]er/i.test(product.title)
        ? "Stabiliser"
        : CATEGORY[product.productType] ?? "";
    if (!category) {
      outsideScope.push(`${preferredLine(lines)} -> ${product.title} [${product.productType || "no type"}]`);
      continue;
    }
    duplicates += lines.length - 1;
    const sourceLine = preferredLine(lines);
    const variant = product.variants[0];
    const identity = stableKey(category, product);
    if (!identity) {
      missingIdentity.push(`${sourceLine} -> ${product.title}`);
      continue;
    }
    // Shopify's product image array is already in the manufacturer's display
    // order. Preserve it: sorting by dimensions can move a secondary feature
    // panel ahead of the intended hero image. Exact duplicate URLs add no
    // gallery value, so retain only their first occurrence.
    const photos = manufacturerPhotos(product);
    if (photos.length > 0) {
      images.push({ assetKey: identity.assetKey, urls: photos.map((photo) => photo.src) });
    }

    const barcode = variant?.barcode?.replace(/\D/g, "") ?? "";
    const gtin = /^(?:\d{8}|\d{12,14})$/.test(barcode) ? barcode : "";
    const title = cleanTitle(product.title);
    const description = descriptionOf(product.description);

    rows.push([
      identity.sku,
      csv(sourceLine),
      "active",
      /beko/i.test(product.title) ? "Voltas Beko" : "Voltas",
      "",
      csv(identity.article),
      "",
      gtin,
      "",
      csv(title),
      csv(description),
      category,
      category === "Freezer" ? "Chest" : SUB_CATEGORY[product.productType] ?? "",
      variant?.mrp ?? "",
      variant?.price ?? "",
      "",
      "unknown",
      "",
      "new",
      "",
      "",
      "",
      variant && variant.grams > 0 ? (variant.grams / 1000).toFixed(1) : "",
      "",
      "",
      "",
      capacityOf(category, title, description),
      "",
      starOf(title),
      isInverter(title) ? "true" : "",
      "",
      "",
      "",
      "",
      photos.length > 0 ? imageAssetKeys(identity.assetKey, photos.length).join("|") : "",
    ].join(","));
  }

  // Additions: voltas.com products the business asked for that are not on
  // the distributor price list (data/sources/voltas-additions.json). Colour
  // versions of one model are grouped: the cheapest becomes the listed
  // product and the others are folded into it as colour variants.
  const additionsPath = resolve("data/sources/voltas-additions.json");
  let added = 0;
  if (existsSync(additionsPath)) {
    const additions = JSON.parse(readFileSync(additionsPath, "utf8")) as { handles: string[]; maxImages?: number };
    const alreadyIn = new Set(selected.keys());
    const groups = new Map<string, Product[]>();
    for (const handle of additions.handles) {
      if (alreadyIn.has(handle)) continue;
      const product = byHandle.get(handle);
      if (!product) throw new Error(`voltas-additions.json lists unknown handle "${handle}"`);
      const code = modelCodeOf(product.title);
      const key = `${code}|${/inverter/i.test(product.title) ? "inv" : ""}|${/6-in-1/i.test(product.title) ? "6in1" : ""}`;
      groups.set(key, [...(groups.get(key) ?? []), product]);
    }
    for (const members of groups.values()) {
      members.sort((a, b) => (a.variants[0]?.price ?? 0) - (b.variants[0]?.price ?? 0));
      const parent = members[0];
      const parentCategory = CATEGORY[parent.productType] ?? "";
      const parentIdentity = parentCategory ? stableKey(parentCategory, parent) : undefined;
      if (!parentIdentity) {
        missingIdentity.push(`addition -> ${parent.title}`);
        continue;
      }
      const photos = manufacturerPhotos(parent).slice(0, additions.maxImages ?? 8);
      if (photos.length > 0) {
        images.push({ assetKey: parentIdentity.assetKey, urls: photos.map((photo) => photo.src) });
      }
      const imageFiles = photos.length > 0 ? imageAssetKeys(parentIdentity.assetKey, photos.length).join("|") : "";
      for (const product of members) {
        const category = CATEGORY[product.productType] ?? "";
        const identity = stableKey(category, product);
        if (!identity) {
          missingIdentity.push(`addition -> ${product.title}`);
          continue;
        }
        const variant = product.variants[0];
        const full = cleanTitle(product.title);
        const title = product === parent ? groupTitle(full) : full;
        const description = descriptionOf(product.description);
        const barcode = variant?.barcode?.replace(/\D/g, "") ?? "";
        rows.push([
          identity.sku,
          csv(`voltas.com: ${product.handle}`),
          "active",
          "Voltas Beko",
          "",
          csv(
            (modelCodeOf(product.title) || identity.article) +
              (/6-in-1/i.test(product.title) ? " 6-in-1" : ""),
          ),
          product === parent ? "" : parentIdentity.sku,
          /^(?:\d{8}|\d{12,14})$/.test(barcode) ? barcode : "",
          "",
          csv(title),
          csv(description),
          category,
          SUB_CATEGORY[product.productType] ?? "",
          variant?.mrp ?? "",
          variant?.price ?? "",
          "",
          "unknown",
          "",
          "new",
          "",
          "",
          "",
          variant && variant.grams > 0 ? (variant.grams / 1000).toFixed(1) : "",
          "",
          "",
          "",
          capacityOf(category, full, description),
          csv(colourOf(product.title)),
          starOf(full),
          isInverter(full) ? "true" : "",
          "",
          "",
          "",
          "",
          imageFiles,
        ].join(","));
        added++;
      }
    }
  }

  atomicText(output, `${HEADER}\n${rows.join("\n")}\n`);
  atomicText(
    resolve("data/sources/voltas-images.json"),
    `${JSON.stringify(images, null, 2)}\n`,
  );

  console.log(`${rows.length} unique reviewed rows -> ${output} (${added} from voltas-additions.json)`);
  console.log(`${duplicates} duplicate stock aliases folded into canonical products`);
  console.log(`${rejected} unmatched or unreviewed stock lines left out`);
  console.log(`${images.length} products have manufacturer photography`);
  if (staleDecisions > 0) {
    console.log(`${staleDecisions} stale review decision(s) require re-review because match evidence changed`);
  }
  if (outsideScope.length > 0) {
    console.log(`\n${outsideScope.length} safe matches fall outside the agreed eleven categories:`);
    outsideScope.forEach((item) => console.log(`  ${item}`));
  }
  if (missingIdentity.length > 0) {
    console.log(`\n${missingIdentity.length} reviewed matches were omitted because Voltas supplied no stable article code:`);
    missingIdentity.forEach((item) => console.log(`  ${item}`));
  }
}

main();
