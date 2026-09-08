import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/product-schema";
import { discountPercent } from "@/lib/pricing";
import { formatPrice } from "@/lib/format";
import { productEnquiryLink } from "@/lib/whatsapp";
import { StarIcon } from "./icons";

/**
 * The Figma card has a wishlist heart and a compare toggle. Both need
 * persisted per-visitor state, which Phase 1 does not have, so they are
 * left out rather than shipped as controls that do nothing. The primary
 * action is a WhatsApp enquiry, because that is what checkout is until
 * Phase 2.
 */

/** Up to three short spec chips, in the order the design shows them. */
function chipsFor(product: Product): string[] {
  const chips: string[] = [];
  if (product.capacity) chips.push(product.capacity);
  if (product.inverter) chips.push("Inverter");
  if (product.starRating) chips.push(`${product.starRating} Star`);
  return chips.slice(0, 3);
}

/** Scarcity and availability share one slot; only one can be true. */
function badgeFor(product: Product): string | null {
  switch (product.availability) {
    case "out_of_stock":
      return "Out of stock";
    case "preorder":
      return "Pre-order";
    case "backorder":
      return "Backorder";
    case "in_stock":
      return product.stockCount !== undefined && product.stockCount <= 5
        ? `Only ${product.stockCount} left`
        : null;
  }
}

function Chips({ product }: { product: Product }) {
  const chips = chipsFor(product);
  if (chips.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <li
          key={chip}
          className="eyebrow rounded bg-canvas px-2 py-1 text-[0.625rem] text-text-muted"
        >
          {chip}
        </li>
      ))}
    </ul>
  );
}

function Rating({ product }: { product: Product }) {
  if (!product.rating) return null;
  return (
    <span className="flex items-center gap-1 text-[0.6875rem] text-text-muted">
      <StarIcon className="size-3 text-star" />
      <span className="font-medium text-text">{product.rating.value}</span>(
      {product.rating.count})
    </span>
  );
}

function Price({ product }: { product: Product }) {
  const off = discountPercent(product);
  return (
    <div>
      <p className="text-lg font-semibold tracking-tight">
        {formatPrice(product.sellingPrice)}
      </p>
      {off > 0 && (
        <p className="text-xs text-text-muted">
          <s>{formatPrice(product.mrp)}</s>{" "}
          <span className="font-medium text-accent">{off}% off</span>
        </p>
      )}
    </div>
  );
}

function EnquireButton({ product }: { product: Product }) {
  return (
    <a
      href={productEnquiryLink(product)}
      className="inline-flex h-9 shrink-0 items-center rounded-lg bg-ink px-4 text-xs font-medium text-white transition-colors hover:bg-ink-soft"
    >
      Enquire
    </a>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const badge = badgeFor(product);
  const image = product.images[0];

  return (
    <article className="group flex flex-col rounded-card border border-line bg-surface transition-shadow hover:shadow-[0_2px_16px_rgba(17,19,24,0.08)]">
      <div className="relative">
        {badge && (
          <span className="absolute left-3 top-3 z-10 rounded bg-canvas px-2 py-1 text-[0.625rem] font-medium text-text-muted">
            {badge}
          </span>
        )}
        <Link href={`/product/${product.slug}/`} className="block p-4">
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="mx-auto h-36 w-auto object-contain"
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 border-t border-line p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="eyebrow text-text-muted">{product.brand}</p>
          <Rating product={product} />
        </div>

        <h3 className="text-sm font-medium leading-snug">
          <Link href={`/product/${product.slug}/`} className="line-clamp-2 hover:text-accent">
            {product.title}
          </Link>
        </h3>

        <Chips product={product} />

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <Price product={product} />
          <EnquireButton product={product} />
        </div>
      </div>
    </article>
  );
}

export function ProductRow({ product }: { product: Product }) {
  const badge = badgeFor(product);
  const image = product.images[0];

  return (
    <article className="flex gap-5 rounded-card border border-line bg-surface p-4">
      <Link href={`/product/${product.slug}/`} className="shrink-0 self-center">
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className="h-28 w-28 object-contain"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="eyebrow text-text-muted">{product.brand}</p>
          <Rating product={product} />
          {badge && (
            <span className="rounded bg-canvas px-2 py-0.5 text-[0.625rem] font-medium text-text-muted">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-sm font-medium">
          <Link href={`/product/${product.slug}/`} className="hover:text-accent">
            {product.title}
          </Link>
        </h3>

        <p className="line-clamp-2 max-w-2xl text-xs leading-relaxed text-text-muted">
          {product.description}
        </p>

        <Chips product={product} />
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-3">
        <Price product={product} />
        <EnquireButton product={product} />
      </div>
    </article>
  );
}
