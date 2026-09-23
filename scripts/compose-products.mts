/**
 * Compose source-scoped catalogue batches plus dealer-owned overrides into the
 * one CSV consumed by the importer. Supplier refreshes cannot overwrite stock,
 * availability, selling price or publication decisions kept in overrides.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";

const SOURCES = [
  resolve("data/sources/voltas-beko-pdf.csv"),
  resolve("data/sources/voltas-products.csv"),
];
const OVERRIDES = resolve("data/sources/inventory-overrides.json");
const DEFAULT_OUTPUT = resolve("data/products.csv");

type Row = Record<string, string>;
type Override = {
  values: Partial<Record<"status" | "mrp" | "selling_price" | "availability" | "stock_count", string | number>>;
  updatedAt: string;
  updatedBy: string;
};

function quote(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function main() {
  const outIndex = process.argv.indexOf("--out");
  const output = resolve(outIndex >= 0 && process.argv[outIndex + 1]
    ? process.argv[outIndex + 1]
    : DEFAULT_OUTPUT);

  const rows = new Map<string, { row: Row; source: string }>();
  let header: string[] | undefined;

  for (const source of SOURCES) {
    if (!existsSync(source)) throw new Error(`catalogue source is missing: ${source}`);
    const parsed = parse(readFileSync(source, "utf8"), {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    }) as Row[];
    const sourceHeader = Object.keys(parsed[0] ?? parse(readFileSync(source, "utf8"), { to_line: 1 })[0] ?? {});
    if (!header) header = sourceHeader.length > 0 ? sourceHeader : readFileSync(source, "utf8").split("\n", 1)[0].split(",");

    for (const row of parsed) {
      const sku = row.sku?.trim();
      if (!sku) throw new Error(`${source}: row without sku`);
      const existing = rows.get(sku);
      if (existing) {
        throw new Error(`duplicate SKU ${sku} in ${existing.source} and ${source}`);
      }
      rows.set(sku, { row, source });
    }
  }

  if (!header) throw new Error("no catalogue sources were loaded");
  const overrides: Record<string, Override> = existsSync(OVERRIDES)
    ? JSON.parse(readFileSync(OVERRIDES, "utf8"))
    : {};
  for (const [sku, override] of Object.entries(overrides)) {
    const target = rows.get(sku);
    if (!target) throw new Error(`inventory override points to unknown SKU ${sku}`);
    for (const [field, value] of Object.entries(override.values)) {
      target.row[field] = value === "" || value === null ? "" : String(value);
    }
  }

  const outputRows = [...rows.values()]
    .map(({ row }) => header!.map((field) => quote(row[field] ?? "")).join(","));
  const temporary = `${output}.${process.pid}.tmp`;
  writeFileSync(temporary, `${header.join(",")}\n${outputRows.join("\n")}\n`);
  renameSync(temporary, output);
  console.log(`${outputRows.length} rows composed -> ${output}`);
  console.log(`${Object.keys(overrides).length} dealer override(s) applied`);
}

main();
