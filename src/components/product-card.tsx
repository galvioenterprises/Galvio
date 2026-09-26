"use client";

import Link from "next/link";
import { BADGES, BADGE_IDS, type BadgeId } from "@/config/badges";
import { business } from "@/config/business";
import type { Product } from "@/lib/product-schema";
import { discountPercent } from "@/lib/pricing";
import { emiFrom } from "@/lib/emi";
import { formatPrice } from "@/lib/format";
import { productEnquiryLink } from "@/lib/whatsapp";
import { StarIcon } from "./icons";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductImage } from "./product-image";
import { CompareToggle, SaveToggle } from "./card-toggles";
import { useRuntimeProduct } from "./runtime-catalogue";

/**
 * The Figma card has a wishlist heart and a compare toggle. Both need
 * persisted per-visitor state, which Phase 1 does not have, so they are
 * left out rather than shipped as controls that do nothing. The primary
 * action adds an eligible product to the COD cart.
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
    // Unconfirmed stock is the normal state for the whole catalogue, so a
    // badge on every card says nothing. The trust band and cart say it once.
    case "unknown":
      return null;
    case "out_of_stock":
      return "Out of stock";
    case "preorder":
      return "Pre-order";
    case "backorder":
      return "Backorder";
    case "in_stock":
      return product.stockCount !== undefined && product.stockCount > 0 && product.stockCount <= 5
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
  const emi = business.onlinePayments ? emiFrom(product.sellingPrice) : null;
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
            <span>MRP </span><s>{formatPrice(product.mrp)}</s>{" "}
            <span className="font-semibold text-emerald-700">{off}% off</span>
          </>
        )}
      </p>
      <p className="mt-0.5 h-4 text-[0.6875rem] text-text-muted">
        {emi !== null && (
          <>
            EMI from <span className="font-semibold text-text">{formatPrice(emi)}/mo</span>
          </>
        )}
      </p>
    </div>
  );
}

function CardAction({ product }: { product: Product }) {
  return (
    <AddToCartButton
      slug={product.slug}
      title={product.title}
      availability={product.availability}
      price={product.sellingPrice}
      image={product.images[0].src}
      enquiryHref={productEnquiryLink(product)}
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-ink px-4 text-xs font-medium text-white transition-colors hover:bg-ink-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    />
  );
}

function Badge({ label, right = false }: { label: string; right?: boolean }) {
  return (
    <span
      className={`absolute top-3 z-10 rounded bg-scarcity px-2 py-1 text-[0.625rem] font-medium text-scarcity-text ${
        right ? "right-3" : "left-3"
      }`}
    >
      {label}
    </span>
  );
}

/** The distributor's highest-priority merchandising badge, if any. */
function merchBadgeFor(product: Product): BadgeId | null {
  const set = new Set(product.badges ?? []);
  return BADGE_IDS.find((id) => set.has(id)) ?? null;
}

export function MerchBadge({ id, className = "" }: { id: BadgeId; className?: string }) {
  const badge = BADGES[id];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-[0.625rem] font-bold uppercase tracking-wider shadow-sm ${badge.className} ${className}`}
    >
      {badge.label}
    </span>
  );
}

export function ProductCard({ product: initialProduct }: { product: Product }) {
  const product = useRuntimeProduct(initialProduct);
  const badge = badgeFor(product);
  const merch = merchBadgeFor(product);
  const image = product.images[0];
  const soldOut = product.availability === "out_of_stock";

  return (
    <article className="group flex flex-col rounded-card border border-line bg-surface p-4 transition-shadow hover:shadow-[0_2px_16px_rgba(17,19,24,0.08)]">
      <div className="relative">
        {merch && <MerchBadge id={merch} className="absolute left-3 top-3 z-10" />}
        {badge && !merch && <Badge label={badge} right={false} />}
        <div className="absolute right-2 top-2 z-10">
          <SaveToggle slug={product.slug} title={product.title} />
        </div>
        {/* A fixed, generous stage keeps every card aligned while letting
            wide and tall appliances use the largest real size available. */}
        <Link
          href={`/product/${product.slug}/`}
          tabIndex={-1}
          aria-hidden
          className="flex h-56 items-center justify-center overflow-hidden rounded-xl bg-surface p-2 sm:h-60 lg:h-64 2xl:h-[17rem] [&>picture]:contents"
        >
          <ProductImage
            src={image.src}
            alt={image.alt}
            sizes="(min-width: 1536px) 380px, (min-width: 1024px) 420px, (min-width: 640px) 45vw, 92vw"
            className={`max-h-full max-w-full object-contain transition-transform duration-300 motion-reduce:transition-none ${
              product.category === "Air Conditioner"
                ? "scale-[1.08] group-hover:scale-[1.12]"
                : "scale-100 group-hover:scale-[1.04]"
            } ${
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
        <h3 className="min-h-[2.8rem] text-[0.9375rem] font-medium leading-snug">
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
          <CardAction product={product} />
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2.5">
          <CompareToggle slug={product.slug} />
          {badge && merch && <span className="text-[0.6875rem] font-medium text-scarcity-text">{badge}</span>}
        </div>
      </div>
    </article>
  );
}

export function ProductRow({ product: initialProduct }: { product: Product }) {
  const product = useRuntimeProduct(initialProduct);
  const badge = badgeFor(product);
  const merch = merchBadgeFor(product);
  const image = product.images[0];
  const soldOut = product.availability === "out_of_stock";

  return (
    <article className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:flex-row sm:gap-5">
      <Link
        href={`/product/${product.slug}/`}
        tabIndex={-1}
        aria-hidden
        className="flex size-28 shrink-0 items-center justify-center self-center overflow-hidden rounded-xl bg-canvas [&>picture]:contents"
      >
        <ProductImage
          src={image.src}
          alt={image.alt}
          sizes="112px"
          className={`max-h-full max-w-full object-contain ${soldOut ? "opacity-45" : ""}`}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          {merch && <MerchBadge id={merch} />}
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

      <div className="flex w-full shrink-0 flex-row items-end justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
        <Price product={product} />
        <CardAction product={product} />
      </div>
    </article>
  );
}
