"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/product-schema";
import { site } from "@/config/site";
import { ProductImage } from "./product-image";
import { ArrowRightIcon, MailIcon, TrashIcon, WhatsAppIcon } from "./icons";

type Entry = {
  slug: string;
  title: string;
  brand: string;
  category: string;
  price: number;
  image: string;
  availability: Product["availability"];
};

const AVAILABILITY_LABEL: Record<Product["availability"], string> = {
  unknown: "Confirm availability",
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  preorder: "Available to pre-order",
  backorder: "On backorder",
};

/**
 * The cart contents.
 *
 * Product details come from the same search index the header search uses,
 * fetched once. Storing titles and prices in localStorage alongside the
 * slugs would mean a cart showing last month's price after a price
 * revision — the slug is the only thing worth persisting.
 */
export function CartLines({
  availabilityBySlug,
}: {
  availabilityBySlug: Record<string, Product["availability"]>;
}) {
  const { lines, setQty, remove, clear } = useCart();
  const [index, setIndex] = useState<Record<string, Entry> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/search-index.json");
        const entries = (await response.json()) as Omit<Entry, "availability">[];
        if (cancelled) return;
        setIndex(
          Object.fromEntries(
            entries.map((entry) => [
              entry.slug,
              {
                ...entry,
                availability: availabilityBySlug[entry.slug] ?? "out_of_stock",
              },
            ]),
          ),
        );
      } catch {
        if (!cancelled) setIndex({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [availabilityBySlug]);

  if (index === null) {
    return <p className="text-sm text-text-muted">Loading your cart…</p>;
  }

  const items = lines
    .map((line) => ({ line, product: index[line.slug] }))
    .filter((row): row is { line: typeof row.line; product: Entry } =>
      Boolean(row.product),
    );

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-12 text-center">
        <p className="text-sm font-medium">Your cart is empty</p>
        <Link
          href="/products/"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          Browse the catalogue
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    );
  }

  const total = items.reduce((sum, { line, product }) => sum + product.price * line.qty, 0);

  const hasUnavailableItems = items.some(
    ({ product }) => product.availability !== "in_stock",
  );
  const message = [
    `Hi ${site.shortName}, I would like to ${hasUnavailableItems ? "enquire about" : "buy"}:`,
    "",
    ...items.map(
      ({ line, product }) =>
        `• ${product.title} × ${line.qty} — ${formatPrice(product.price * line.qty)}` +
        (product.availability === "in_stock"
          ? ""
          : ` (${AVAILABILITY_LABEL[product.availability]})`),
    ),
    "",
    `Total at listed prices: ${formatPrice(total)}`,
    "Could you confirm availability and the delivery date?",
  ].join("\n");

  const href = site.contact.whatsapp
    ? `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(message)}`
    : `mailto:${site.contact.email}?subject=${encodeURIComponent("Product list enquiry")}&body=${encodeURIComponent(message)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {items.map(({ line, product }) => (
          <li key={product.slug} className="flex gap-4 p-4">
            <Link
              href={`/product/${product.slug}/`}
              tabIndex={-1}
              aria-hidden
              className="shrink-0 self-center overflow-hidden rounded-xl bg-canvas"
            >
              <ProductImage
                src={product.image}
                alt=""
                sizes="96px"
                className="size-24 object-contain"
              />
            </Link>

            <div className="min-w-0 flex-1">
              <p className="eyebrow text-text-muted">{product.brand}</p>
              <h2 className="mt-1 text-sm font-medium leading-snug">
                <Link href={`/product/${product.slug}/`} className="hover:text-accent">
                  {product.title}
                </Link>
              </h2>
              <p className="mt-1 truncate text-xs text-text-muted">
                {product.category}
                {product.availability !== "in_stock" && (
                  <span className="text-scarcity-text">
                    {" · "}
                    {AVAILABILITY_LABEL[product.availability]}
                  </span>
                )}
              </p>

              <div className="mt-3 flex items-center gap-3">
                <label className="sr-only" htmlFor={`qty-${product.slug}`}>
                  Quantity for {product.title}
                </label>
                <div className="flex items-center rounded-lg border border-line">
                  <button
                    type="button"
                    disabled={product.availability !== "in_stock"}
                    onClick={() => setQty(product.slug, line.qty - 1)}
                    className="flex size-8 items-center justify-center text-text-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span
                    id={`qty-${product.slug}`}
                    className="w-8 text-center text-sm font-medium"
                  >
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    disabled={product.availability !== "in_stock"}
                    onClick={() => setQty(product.slug, line.qty + 1)}
                    className="flex size-8 items-center justify-center text-text-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => remove(product.slug)}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text"
                >
                  <TrashIcon className="size-3.5" />
                  Remove
                </button>
              </div>
            </div>

            <p className="shrink-0 text-sm font-semibold">
              {formatPrice(product.price * line.qty)}
            </p>
          </li>
        ))}
      </ul>

      <aside className="rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-6">
        <p className="text-sm font-semibold">Order summary</p>

        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Items</dt>
            <dd className="font-medium">{items.reduce((n, i) => n + i.line.qty, 0)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-2.5">
            <dt className="text-text-muted">At listed prices</dt>
            <dd className="text-base font-semibold">{formatPrice(total)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          These are the current manufacturer-listed prices. The showroom will
          confirm the final price, tax invoice and availability before an order.
        </p>

        <a
          href={href}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          {site.contact.whatsapp ? (
            <WhatsAppIcon className="size-4" />
          ) : (
            <MailIcon className="size-4" />
          )}
          Send this list to us
        </a>

        <button
          type="button"
          onClick={clear}
          className="mt-3 w-full text-xs text-text-muted hover:text-text"
        >
          Clear cart
        </button>
      </aside>
    </div>
  );
}
