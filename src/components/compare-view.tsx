"use client";

import Link from "next/link";
import { useState } from "react";
import { business } from "@/config/business";
import type { Product } from "@/lib/product-schema";
import { useCompare } from "@/lib/local-list";
import { formatPrice } from "@/lib/format";
import { emiFrom } from "@/lib/emi";
import { formatMonths } from "@/lib/highlights";
import { discountPercent } from "@/lib/pricing";
import { ProductImage } from "./product-image";
import { AddToCartButton } from "./add-to-cart-button";
import { useRuntimeProducts } from "./runtime-catalogue";

type Row = { label: string; value: (p: Product) => string };

const MISSING = "Not supplied";

const BASE_ROWS: Row[] = [
  { label: "Price", value: (p) => formatPrice(p.sellingPrice) },
  { label: "MRP", value: (p) => formatPrice(p.mrp) },
  { label: "Discount", value: (p) => (discountPercent(p) ? `${discountPercent(p)}% off` : "Full price") },
  { label: "Capacity", value: (p) => p.capacity ?? MISSING },
  { label: "Energy rating", value: (p) => (p.starRating ? `${p.starRating} Star` : MISSING) },
  { label: "Compressor", value: (p) => (p.inverter === undefined ? MISSING : p.inverter ? "Inverter" : "Fixed speed") },
  { label: "Warranty", value: (p) => (p.warrantyMonths ? formatMonths(p.warrantyMonths) : MISSING) },
  {
    label: "Compressor warranty",
    value: (p) => (p.compressorWarrantyMonths ? formatMonths(p.compressorWarrantyMonths) : MISSING),
  },
  {
    label: "Installation",
    value: (p) =>
      p.installationIncluded === undefined
        ? MISSING
        : p.installationIncluded
          ? "Included"
          : "Not included",
  },
  {
    label: "Delivery",
    value: () =>
      business.nationwideDelivery
        ? `Pan-India · ${business.deliveryDaysMin}–${business.deliveryDaysMax} days after confirmation · ${business.deliveryFee === 0 ? "Free" : formatPrice(business.deliveryFee)}`
        : "Confirmed after a PIN-code check",
  },
  { label: "Type", value: (p) => p.subCategory ?? MISSING },
  { label: "Colour", value: (p) => p.color ?? MISSING },
  ...(business.onlinePayments
    ? [{
        label: "EMI from",
        value: (p: Product) =>
          emiFrom(p.sellingPrice)
            ? `${formatPrice(emiFrom(p.sellingPrice)!)}/month`
            : MISSING,
      }]
    : []),
];

/**
 * Side-by-side comparison of up to three products, with the rows that
 * differ highlighted — the question is always "what's the difference?".
 */
export function CompareView({ products }: { products: Product[] }) {
  const { list, remove } = useCompare();
  const [differencesOnly, setDifferencesOnly] = useState(true);
  const runtimeProducts = useRuntimeProducts(products);
  const picked = list.flatMap((slug) => runtimeProducts.filter((p) => p.slug === slug));

  if (picked.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-12 text-center">
        <h1 className="text-xl font-semibold">Nothing to compare yet</h1>
        <p className="mt-2 text-sm text-text-muted">Tick &ldquo;Compare&rdquo; on up to three products, then come back here.</p>
        <Link href="/products/" className="mt-5 inline-block text-sm font-semibold text-accent">Browse products</Link>
      </div>
    );
  }

  const priorityLabels = new Set(BASE_ROWS.map((row) => row.label.toLowerCase()));
  const specKeys = [...new Set(picked.flatMap((p) => Object.keys(p.specs ?? {})))]
    .filter((key) => !priorityLabels.has(key.toLowerCase()));
  const suppliedSpecRows: Row[] = [
    ...specKeys.map((key) => ({ label: key, value: (p: Product) => p.specs?.[key] ?? MISSING })),
  ].filter((row) => picked.some((p) => row.value(p) !== MISSING));
  const availableRows: Row[] = [
    ...BASE_ROWS,
    ...suppliedSpecRows,
  ];
  const rows =
    differencesOnly && picked.length > 1
      ? availableRows.filter((row) => new Set(picked.map((p) => row.value(p))).size > 1)
      : availableRows;

  return (
    <div>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">Compare {picked.length} products</h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          Missing supplier details are labelled &ldquo;Not supplied&rdquo;.
        </p>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm">
          <input
            type="checkbox"
            checked={differencesOnly}
            disabled={picked.length < 2}
            onChange={(event) => setDifferencesOnly(event.target.checked)}
            className="size-4 accent-accent"
          />
          Show differences only
        </label>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[640px] table-fixed text-sm">
          <thead>
            <tr>
              <th aria-hidden className="w-40 border-b border-line p-4" />
              {picked.map((p) => (
                <th scope="col" key={p.slug} className="border-b border-l border-line p-4 text-left align-top font-normal">
                  <div className="flex h-36 items-center justify-center rounded-xl bg-canvas p-2 [&>picture]:contents">
                    <ProductImage src={p.images[0].src} alt="" sizes="240px" className="max-h-full max-w-full object-contain" />
                  </div>
                  <Link href={`/product/${p.slug}/`} className="mt-3 line-clamp-2 font-semibold hover:text-accent">{p.title}</Link>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <AddToCartButton
                      slug={p.slug}
                      title={p.title}
                      availability={p.availability}
                      price={p.sellingPrice}
                      image={p.images[0].src}
                      className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-ink px-3 text-xs font-medium text-white"
                    />
                    <button type="button" onClick={() => remove(p.slug)} className="min-h-11 px-2 text-xs text-text-muted hover:text-red-600">Remove</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const values = picked.map((p) => row.value(p));
              const differs = new Set(values).size > 1;
              return (
                <tr key={row.label} className={differs ? "bg-accent/[0.04]" : ""}>
                  <th scope="row" className="sticky left-0 z-10 border-b border-line bg-surface p-4 text-left text-xs font-medium uppercase tracking-wide text-text-muted">{row.label}</th>
                  {values.map((v, i) => (
                    <td key={picked[i].slug} className={`border-b border-l border-line p-4 ${differs ? "font-semibold" : ""}`}>{v}</td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={picked.length + 1} className="p-8 text-center text-sm text-text-muted">
                  No differences in the supplied details. Turn off &ldquo;Show differences only&rdquo; to see every field.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
