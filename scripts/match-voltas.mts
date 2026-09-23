/**
 * Match the distributor stock list to the Voltas catalogue without turning a
 * plausible suggestion into a published product.
 *
 *   pnpm match:voltas -- --csv data/sources/voltas-match-report.tsv
 *
 * MATCH means the source and candidate agree on a discriminating model/name
 * and on every typed attribute we can compare. WEAK is only a review hint.
 * NONE means there is not enough evidence to show a candidate at all.
 */

import { readFileSync, renameSync, writeFileSync } from "node:fs";
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

type Kind =
  | "ac-split"
  | "ac-window"
  | "air-cooler"
  | "water-cooler"
  | "water-heater"
  | "water-dispenser"
  | "refrigerator"
  | "washing-machine"
  | "stabiliser"
  | "freezer"
  | "visi-cooler"
  | "microwave"
  | "service"
  | "unsupported"
  | "unknown";

type Attributes = {
  kind: Kind;
  ton?: number;
  litres?: number;
  kg?: number;
  star?: number;
  kva?: number;
  codes: Set<string>;
  words: Set<string>;
};

type Candidate = {
  product: Product;
  score: number;
  blocked: string[];
  evidence: string[];
  missingWords: string[];
  exactCode: boolean;
};

const COMMON = new Set([
  "voltas", "beko", "air", "conditioner", "cooler", "water", "heater",
  "refrigerator", "washing", "machine", "stabilizer", "stabiliser",
  "split", "window", "inverter", "fixed", "speed", "desert", "room",
  "personal", "tower", "automatic", "fully", "semi", "load", "top",
  "front", "star", "ton", "litre", "liter", "ltr", "kg", "kva", "ac",
  "sac", "wac", "inv", "fs", "wm", "wd", "the", "and", "with", "for",
  "product", "tata", "plus", "pro", "model", "smart",
]);

const PRODUCT_TYPE_KIND: Record<string, Kind> = {
  "Adjustable Inverter AC": "ac-split",
  "Fixed Speed Split AC": "ac-split",
  "Fixed Speed AC": "ac-split",
  Convertibles: "ac-split",
  "Non-Inverter Window AC": "ac-window",
  "Adjustable Inverter Window AC": "ac-window",
  "Desert Cooler": "air-cooler",
  "Personal Coolers": "air-cooler",
  "Room Air Coolers": "air-cooler",
  "Tower Coolers": "air-cooler",
  "Window Coolers": "air-cooler",
  "Water Coolers": "water-cooler",
  "Storage Geyser": "water-heater",
  "Instant Geyser": "water-heater",
  "Table Top Water Dispensers": "water-dispenser",
  "Bottom Mount Water Dispensers": "water-dispenser",
  "Direct Cool": "refrigerator",
  "Frost Free": "refrigerator",
  "Side by Side": "refrigerator",
  "Semi-automatic Twin Tub": "washing-machine",
  "Fully Automatic Top Load": "washing-machine",
  "Fully Automatic Front Load": "washing-machine",
  Stabilizer: "stabiliser",
  "Glass Top Chest Freezers": "freezer",
  "Visi Cooler": "visi-cooler",
  Convection: "microwave",
  Solo: "microwave",
};

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/&amp;/g, " and ")
    .replace(/\bstablizer\b/g, "stabilizer")
    .replace(/\bsac\b/g, " split air conditioner ")
    .replace(/\bwac\b/g, " window air conditioner ")
    .replace(/\binv\b/g, " inverter ")
    .replace(/\bw\s*\/\s*m\b/g, " washing machine ")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function atomicText(file: string, contents: string): void {
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, contents);
  renameSync(temporary, file);
}

function numberFrom(value: string, expression: RegExp): number | undefined {
  const match = expression.exec(value);
  const captured = match?.slice(1).find((part) => part !== undefined);
  return captured === undefined ? undefined : Number(captured);
}

function kindFromText(raw: string): Kind {
  const value = normalise(raw);
  if (/\b(?:amc|annual maintenance|comprehensive service)\b/.test(value)) return "service";
  if (/\b(?:iron|mixer grinder|luggage|motor|pump|spare parts?|tablet|bag)\b/.test(value)) {
    return "unsupported";
  }
  if (/window air conditioner/.test(value)) return "ac-window";
  if (/split air conditioner/.test(value)) return "ac-split";
  if (/\b(?:stabilizer|stabiliser|va\s*\d{3,4})\b/.test(value)) return "stabiliser";
  if (/\b(?:water heater|geyser|aqua m|aqua prime|aquapro|aqua pro|magna|crysta|insta plus|linea)\b/.test(value)) return "water-heater";
  if (/\b(?:water dispenser|minimagic|wd)\b/.test(value)) return "water-dispenser";
  if (/\b(?:water cooler|wc)\b/.test(value)) return "water-cooler";
  if (/\b(?:air cooler|jetmax|epicool|victor|tejas|windsor|magic air|frost air|slimm|velocity|virat|thunder)\b/.test(value)) return "air-cooler";
  if (/\b(?:washing machine|wtt\d|wtl\d|wfl\d)\b/.test(value)) return "washing-machine";
  if (/\b(?:refrigerator|rdc\d|rff\d|rsb\d|r4d\d)\b/.test(value)) return "refrigerator";
  if (/\b(?:chest freezer|freezer|cvf\d[a-z0-9]*)\b/.test(value)) return "freezer";
  if (/\b(?:visi cooler|vc gt)\b/.test(value)) return "visi-cooler";
  if (/\b(?:microwave|ms\d+[a-z0-9]*)\b/.test(value)) return "microwave";
  return "unknown";
}

function catalogueKind(product: Product): Kind {
  // Shopify product types contain at least one known error: a chest freezer is
  // labelled "Convertibles" (also used for ACs). Prefer the explicit title.
  const fromTitle = kindFromText(product.title);
  if (product.productType === "Convertibles" && fromTitle !== "unknown") return fromTitle;
  return PRODUCT_TYPE_KIND[product.productType] ?? fromTitle;
}

function codesFrom(raw: string): Set<string> {
  const value = normalise(raw);
  const tokens = value.split(" ").filter(Boolean);
  const codes = new Set<string>();

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index].replace(/\./g, "");
    if (token.length >= 5 && /[a-z]/.test(token) && /\d/.test(token)) codes.add(token);
    const next = tokens[index + 1]?.replace(/\./g, "");
    if (!COMMON.has(token) && /^[a-z]{2,}$/.test(token) && /^\d{2,4}[a-z0-9]*$/.test(next ?? "")) {
      codes.add(`${token}${next}`);
    }
    if (/^\d{3}$/.test(token) && /^(?:inv|fs)$/.test(next ?? "")) {
      codes.add(`${token}${next}`);
    }
    if (/^\d{3}$/.test(token) && tokens[index + 1] === "inverter") {
      codes.add(`${token}inv`);
      if (tokens[index + 2] === "hc") codes.add(`${token}invhc`);
    }
  }
  return codes;
}

function wordsFrom(raw: string): Set<string> {
  const words = normalise(raw)
    .split(" ")
    .map((word) => word.replace(/\./g, ""))
    .filter((word) => word.length >= 3 && !COMMON.has(word) && !/\d/.test(word));
  return new Set(words);
}

function attributes(raw: string, explicitKind?: Kind): Attributes {
  const value = normalise(raw);
  return {
    kind: explicitKind ?? kindFromText(raw),
    ton: numberFrom(value, /\b(\d(?:\.\d+)?)\s*t\b|\b(\d+(?:\.\d+)?)\s*ton\b/),
    litres: numberFrom(value, /\b(\d+(?:\.\d+)?)\s*(?:l\b|ltr\b|litre\b|liter\b)/),
    kg: numberFrom(value, /\b(\d+(?:\.\d+)?)\s*kg\b/),
    star: numberFrom(value, /\b([1-5])\s*star\b/),
    kva: numberFrom(value, /\b(\d+(?:\.\d+)?)\s*kva\b/),
    codes: codesFrom(raw),
    words: wordsFrom(raw),
  };
}

function differs(left: number | undefined, right: number | undefined): boolean {
  return left !== undefined && right !== undefined && Math.abs(left - right) > 0.01;
}

function genericAcCode(code: string): boolean {
  return /^\d{3}(?:inv|fs)$/.test(code) || /^r\d+[a-z]?$/.test(code);
}

function compare(line: string, product: Product): Candidate {
  const source = attributes(line);
  const targetText = `${product.title} ${product.description} ${product.handle} ${product.variants
    .map((variant) => variant.sku ?? "")
    .join(" ")}`;
  const target = attributes(targetText, catalogueKind(product));
  const blocked: string[] = [];
  const evidence: string[] = [];

  if (source.kind !== "unknown" && target.kind !== "unknown" && source.kind !== target.kind) {
    blocked.push(`type ${source.kind} != ${target.kind}`);
  }
  if (source.kind === "service" || source.kind === "unsupported") blocked.push(`source ${source.kind}`);
  if (target.kind === "service" || target.kind === "unsupported") blocked.push(`target ${target.kind}`);
  for (const [label, left, right] of [
    ["capacity-ton", source.ton, target.ton],
    ["capacity-litre", source.litres, target.litres],
    ["capacity-kg", source.kg, target.kg],
    ["star", source.star, target.star],
    ["kva", source.kva, target.kva],
  ] as const) {
    if (differs(left, right)) blocked.push(`${label} ${left} != ${right}`);
    else if (left !== undefined && right !== undefined) evidence.push(`${label}=${left}`);
  }

  const sharedCodes = [...source.codes].filter((code) => target.codes.has(code));
  const strongCodes = sharedCodes.filter((code) => !genericAcCode(code));

  // A finish code can agree while the appliance model does not. If both
  // sides carry a code from the same family (VA, WTT, RFF...) and those
  // codes differ, the shared secondary code must never overrule it.
  for (const sourceCode of source.codes) {
    if (target.codes.has(sourceCode)) continue;
    const sourcePrefix = /^[a-z]{2,}/.exec(sourceCode)?.[0];
    if (!sourcePrefix) continue;
    const conflicting = [...target.codes].find(
      (targetCode) => targetCode !== sourceCode && targetCode.startsWith(sourcePrefix),
    );
    if (conflicting) blocked.push(`model ${sourceCode} != ${conflicting}`);
  }
  const sharedWords = [...source.words].filter((word) => target.words.has(word));
  const missingWords = [...source.words].filter((word) => !target.words.has(word));

  if (strongCodes.length > 0) evidence.push(`model=${strongCodes.join("+")}`);
  else if (sharedCodes.length > 0) evidence.push(`family=${sharedCodes.join("+")}`);
  if (sharedWords.length > 0) evidence.push(`name=${sharedWords.join("+")}`);

  let score = strongCodes.length * 60 + sharedCodes.length * 18 + sharedWords.length * 9;
  if (source.kind !== "unknown" && source.kind === target.kind) score += 12;
  score += evidence.filter((item) => item.startsWith("capacity") || item.startsWith("star") || item.startsWith("kva")).length * 8;
  score -= missingWords.length * 11;
  if (blocked.length > 0) score = Math.min(score, 0);

  return { product, score, blocked, evidence, missingWords, exactCode: strongCodes.length > 0 };
}

function classify(best: Candidate | undefined, second: Candidate | undefined): "MATCH" | "WEAK" | "NONE" {
  if (!best || best.score < 12 || best.blocked.length > 0) return "NONE";
  const margin = best.score - (second?.score ?? 0);
  const nameComplete = best.missingWords.length === 0 && best.evidence.some((item) => item.startsWith("name="));
  const codeEvidence = best.evidence.some(
    (item) => item.startsWith("model=") || item.startsWith("family="),
  );
  const strong = codeEvidence && (best.exactCode || nameComplete);
  return strong && margin >= 8 ? "MATCH" : "WEAK";
}

function main() {
  const lines = readFileSync(resolve("data/sources/stock-list.txt"), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const catalogue = JSON.parse(
    readFileSync(resolve("data/sources/voltas-catalogue.json"), "utf8"),
  ) as Product[];

  const rows: string[] = [];
  const selected = new Map<string, { verdict: string; handle?: string }>();
  const counts = { MATCH: 0, WEAK: 0, NONE: 0 };

  for (const line of lines) {
    const candidates = catalogue
      .map((product) => compare(line, product))
      .sort((left, right) => right.score - left.score || left.product.title.localeCompare(right.product.title));
    const eligible = candidates.filter((candidate) => candidate.blocked.length === 0);
    const best = eligible[0];
    const second = eligible[1];
    const verdict = classify(best, second);
    counts[verdict]++;
    selected.set(line, { verdict, handle: best?.product.handle });

    if (verdict === "NONE" || !best) {
      const reason = candidates[0]?.blocked[0] ?? "no discriminating evidence";
      rows.push(["NONE", "0", line, "", "", "", "", "", reason, "0", "[]"].join("\t"));
      continue;
    }

    const variant = best.product.variants[0];
    const image = [...best.product.images].sort((left, right) => right.width - left.width)[0];
    const margin = best.score - (second?.score ?? 0);
    const top = eligible.slice(0, 3).map((candidate) => ({
      handle: candidate.product.handle,
      title: candidate.product.title,
      score: candidate.score,
      reasons: candidate.evidence,
    }));
    rows.push(
      [
        verdict,
        best.score.toFixed(1),
        line,
        best.product.title,
        variant ? `MRP ${variant.mrp ?? "-"} / ${variant.price}` : "-",
        variant?.sku ?? "-",
        image ? `${image.width}x${image.height}` : "no image",
        best.product.handle,
        best.evidence.join(", ") || "name similarity only",
        margin.toFixed(1),
        JSON.stringify(top),
      ].join("\t"),
    );
  }

  const expected = new Map<string, string>([
    ["Voltas 1.5T WAC 185 INV Elite", "voltas-window-air-conditioner-1-5-ton-5-star-185inv-elite"],
    ["Voltas 1.5T SAC 183 INV HC Vectra Zenith", "voltas-split-air-conditioner-1-5-ton-3-star-183invhc-vectra-zenith"],
  ]);
  for (const [line, handle] of expected) {
    const result = selected.get(line);
    if (result && (result.verdict !== "MATCH" || result.handle !== handle)) {
      throw new Error(`matcher regression: ${line} -> ${result.verdict} ${result.handle ?? "none"}; expected ${handle}`);
    }
  }
  const va1090 = selected.get("Voltas Stablizer VA 1090-90V-300V (1KVA)");
  if (va1090?.handle?.includes("va4090") && va1090.verdict === "MATCH") {
    throw new Error("matcher regression: VA1090 must not auto-match VA4090");
  }

  console.log(`stock lines      : ${lines.length}`);
  console.log(`safe matches     : ${counts.MATCH}`);
  console.log(`review required  : ${counts.WEAK}`);
  console.log(`no safe candidate: ${counts.NONE}`);

  const outputIndex = process.argv.indexOf("--csv");
  if (outputIndex !== -1 && process.argv[outputIndex + 1]) {
    const output = resolve(process.argv[outputIndex + 1]);
    atomicText(output, `${rows.join("\n")}\n`);
    console.log(`report -> ${output}`);
  } else {
    console.log("\nsample:");
    rows.slice(0, 12).forEach((row) => console.log(`  ${row.split("\t").slice(0, 5).join("  |  ")}`));
  }
}

main();
