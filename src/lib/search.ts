import type { Product } from "./product-schema";

/**
 * Product search over the static index (public/search-index.json).
 *
 * Shared by the header search and the /search/ results page. It is
 * forgiving in the ways shoppers type:
 *
 *  - synonyms: "ac" finds air conditioners, "fridge" finds refrigerators;
 *  - numbers with units: "1.5ton", "1.5 t" and "1.5 ton" are the same;
 *  - prefixes: "refri" matches "refrigerator";
 *  - one typo in longer words: "voltass", "coller".
 *
 * Every typed word has to match something (so "split 1.5 ton" narrows
 * rather than widens), and results are ranked so title hits come first.
 */

export type SearchEntry = {
  slug: string;
  title: string;
  brand: string;
  category: string;
  categorySlug: string;
  price: number;
  mrp?: number;
  availability: Product["availability"];
  image: string;
  haystack: string;
};

const SYNONYMS: Record<string, string[]> = {
  ac: ["air conditioner"],
  aircon: ["air conditioner"],
  fridge: ["refrigerator"],
  freeze: ["freezer"],
  deepfreezer: ["freezer"],
  cooler: ["air cooler"],
  stabilizer: ["stabiliser"],
  stabiliser: ["stabilizer"],
  inverter: ["inverter"],
  window: ["window ac"],
  split: ["split ac"],
  visi: ["visi cooler"],
  dispenser: ["water dispenser"],
  geyser: ["water heater"],
  heater: ["water heater"],
  washing: ["washing machine"],
  tv: ["television"],
  purifier: ["air purifier"],
};

export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/(\d)\s*(tons?|tr)\b/g, "$1 ton")
    .replace(/(\d)\s*(l|ltr|litres?|liters?)\b/g, "$1l")
    .replace(/(\d)\s*(kva)\b/g, "$1kva")
    .replace(/(\d)\s*(star)\b/g, "$1 star")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(query: string): string[] {
  return normalise(query)
    .replace(/(\d) ton/g, "$1ton")
    .replace(/(\d) star/g, "$1star")
    .split(" ")
    .filter(Boolean);
}

/** Levenshtein distance, capped: we only care whether it is 0, 1 or more. */
function withinOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

type Prepared = SearchEntry & { words: string[]; text: string; titleText: string };

export function prepare(entries: SearchEntry[]): Prepared[] {
  return entries.map((e) => {
    const text = normalise(`${e.haystack} ${e.title} ${e.category}`)
      .replace(/(\d) ton/g, "$1ton $1 ton")
      .replace(/(\d) star/g, "$1star $1 star");
    return { ...e, text, titleText: normalise(e.title), words: [...new Set(text.split(" "))] };
  });
}

/** How well one query word matches an entry: 0 means not at all. */
function termScore(entry: Prepared, term: string): number {
  const alternatives = [term, ...(SYNONYMS[term] ?? [])];
  let best = 0;
  for (const alt of alternatives) {
    if (alt.includes(" ")) {
      if (entry.text.includes(alt)) best = Math.max(best, entry.titleText.includes(alt) ? 6 : 4);
      continue;
    }
    for (const word of entry.words) {
      let score = 0;
      if (word === alt) score = 5;
      else if (word.startsWith(alt) && alt.length >= 2) score = 3;
      // Typos are forgiven in words, never in numbers ("5star" is not "3star").
      else if (alt.length >= 5 && !/\d/.test(alt) && withinOne(word, alt)) score = 2;
      if (score && entry.titleText.split(" ").includes(word)) score += 1;
      best = Math.max(best, score);
    }
  }
  return best;
}

export function search(entries: Prepared[], query: string, limit = Infinity): Prepared[] {
  const terms = tokens(query);
  if (terms.length === 0) return [];
  const scored: { entry: Prepared; score: number }[] = [];
  for (const entry of entries) {
    let total = 0;
    let ok = true;
    for (const term of terms) {
      const s = termScore(entry, term);
      if (s === 0) {
        ok = false;
        break;
      }
      total += s;
    }
    if (!ok) continue;
    if (entry.titleText.startsWith(terms[0])) total += 2;
    scored.push({ entry, score: total });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.price - b.entry.price)
    .slice(0, limit)
    .map((s) => s.entry);
}

/** Categories among the matches, most frequent first, for quick filters. */
export function matchedCategories(results: SearchEntry[]): { title: string; slug: string; count: number }[] {
  const counts = new Map<string, { title: string; slug: string; count: number }>();
  for (const r of results) {
    if (!r.categorySlug) continue;
    const c = counts.get(r.categorySlug) ?? { title: r.category, slug: r.categorySlug, count: 0 };
    c.count++;
    counts.set(r.categorySlug, c);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}
