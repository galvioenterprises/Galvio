import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllProducts, getUnpublishedProducts } from "./products";

/**
 * Every model the distributor stocks, and where it stands on the website.
 *
 * Built at build time from the distributor's stock list and the voltas.com
 * match report (`pnpm match:voltas`), so the admin can see models that are
 * not on the site as well as the ones that are.
 */

export type ModelState = "live" | "draft" | "unlisted";

export type ModelRow = {
  /** The line as it appears in the distributor's stock list, or the draft's title. */
  line: string;
  state: ModelState;
  /** Storefront slug when live, draft slug when a draft. */
  slug?: string;
  title?: string;
  /** For drafts: what is missing before it can go live. */
  missing?: string[];
  /** For unlisted lines: the closest voltas.com product, if any. */
  suggestion?: string;
};

const REPORT = join(process.cwd(), "data", "sources", "voltas-match-report.tsv");

export function getModelReport(): ModelRow[] {
  const live = new Map(getAllProducts().map((p) => [p.slug, p]));
  const drafts = getUnpublishedProducts();
  const usedDrafts = new Set<string>();
  const usedLive = new Set<string>();

  let report: string[][] = [];
  try {
    report = readFileSync(REPORT, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => l.split("\t"));
  } catch {
    // No match report yet: drafts are still listed below.
  }

  const rows: ModelRow[] = report.map(([verdict, , line, voltasTitle, , voltasId]) => {
    const liveProduct = verdict === "MATCH" && voltasId ? live.get(`voltas-${voltasId}`) : undefined;
    if (liveProduct) {
      usedLive.add(liveProduct.slug);
      return { line, state: "live", slug: liveProduct.slug, title: liveProduct.title };
    }
    const compact = line.toUpperCase().replace(/\s+/g, "");
    const draft = drafts.find((d) => d.model && compact.includes(d.model.toUpperCase()));
    if (draft) {
      usedDrafts.add(draft.slug);
      return { line, state: "draft", slug: draft.slug, title: draft.title, missing: draft.missing };
    }
    return { line, state: "unlisted", suggestion: verdict !== "NONE" && voltasTitle ? voltasTitle : undefined };
  });

  // Live products that came from voltas.com rather than the stock list.
  for (const p of live.values()) {
    if (!usedLive.has(p.slug)) rows.push({ line: p.title, state: "live", slug: p.slug, title: p.title });
  }
  for (const d of drafts) {
    if (!usedDrafts.has(d.slug)) {
      rows.push({ line: `${d.title} (${d.model})`, state: "draft", slug: d.slug, title: d.title, missing: d.missing });
    }
  }
  return rows;
}
