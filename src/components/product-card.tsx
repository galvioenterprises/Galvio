import Link from "next/link";
import type { Product } from "@/lib/product-schema";
import { discountPercent } from "@/lib/pricing";
import { formatPrice } from "@/lib/format";
import { productEnquiryLink } from "@/lib/whatsapp";
import { StarIcon } from "./icons";
import { ProductImage } from "./product-image";

/**
 * The Figma card has a wishlist heart and a compare toggle. Both need
 * persisted per-visitor state, which Phase 1 does not have, so they are
 * left out rather than shipped as controls that do nothing. The primary
 * action is a WhatsApp enquiry, because that is what checkout is until
 * Phase 2.
 *
 * Every row of the card has a reserved height. Titles run to one or two
 * lines and chip counts vary, and without that the price and the button
 * sit at a different height on every card — which reads as sloppy long
 * before anyone works out why.
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
  return (
    // Fixed height and no wrapping: a card whose chips run to two lines
    // pushes its own price down and breaks the row.
    <ul className="flex h-6 items-center gap-1.5 overflow-hidden">
      {chips.map((chip) => (
        <li
          key={chip}
          className="eyebrow shrink-0 rounded bg-canvas px-2 py-1 text-[0.625rem] text-text-muted"
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
    <span className="flex shrink-0 items-center gap-1 text-[0.6875rem] text-text-muted">
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
      {/* The height is held even at full price, so a discounted card and
          an undiscounted one line up in the same row. */}
      <p className="h-4 text-xs text-text-muted">
        {off > 0 && (
          <>
            <s>{formatPrice(product.mrp)}</s>{" "}
            <span className="font-medium text-accent">{off}% off</span>
          </>
        )}
      </p>
    </div>
  );
}

function EnquireButton({ product }: { product: Product }) {
  return (
    <a
      href={productEnquiryLink(product)}
      className="inline-flex h-9 shrink-0 items-center rounded-lg bg-ink px-4 text-xs font-medium text-white transition-colors hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Enquire
      <span className="sr-only"> about {product.title}</span>
    </a>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="absolute left-3 top-3 z-10 rounded bg-scarcity px-2 py-1 text-[0.625rem] font-medium text-scarcity-text">
      {label}
    </span>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const badge = badgeFor(product);
  const image = product.images[0];
  const soldOut = product.availability === "out_of_stock";

  return (
    <article className="group flex flex-col rounded-card border border-line bg-surface p-3 transition-shadow hover:shadow-[0_2px_16px_rgba(17,19,24,0.08)]">
      <div className="relative">
        {badge && <Badge label={badge} />}
        {/* The design sets the product on a light panel rather than on the
            card itself, which stops a white appliance disappearing. */}
        <Link
          href={`/product/${product.slug}/`}
          tabIndex={-1}
          aria-hidden
          className="block overflow-hidden rounded-xl bg-canvas"
        >
          <ProductImage
            src={image.src}
            alt={image.alt}
            sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 90vw"
            className={`mx-auto h-40 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] ${
              soldOut ? "opacity-45" : ""
            }`}
          />
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-1 pb-1 pt-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="eyebrow truncate text-text-muted">{product.brand}</p>
          <Rating product={product} />
        </div>

        {/* Two lines reserved so single-line titles do not shorten the card. */}
        <h3 className="min-h-[2.6rem] text-sm font-medium leading-snug">
          <Link
            href={`/product/${product.slug}/`}
            className="line-clamp-2 rounded-sm hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {product.title}
          </Link>
        </h3>

        <Chips product={product} />

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
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
  const soldOut = product.availability === "out_of_stock";

  return (
    <article className="flex gap-5 rounded-card border border-line bg-surface p-4">
      <Link
        href={`/product/${product.slug}/`}
        tabIndex={-1}
        aria-hidden
        className="shrink-0 self-center overflow-hidden rounded-xl bg-canvas"
      >
        <ProductImage
          src={image.src}
          alt={image.alt}
          sizes="112px"
          className={`h-28 w-28 object-contain ${soldOut ? "opacity-45" : ""}`}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="eyebrow text-text-muted">{product.brand}</p>
          <Rating product={product} />
          {badge && (
            <span className="rounded bg-scarcity px-2 py-0.5 text-[0.625rem] font-medium text-scarcity-text">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-sm font-medium">
          <Link
            href={`/product/${product.slug}/`}
            className="rounded-sm hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
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
