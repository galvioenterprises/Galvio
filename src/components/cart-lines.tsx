"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartLine } from "@/lib/cart";
import { api, type Quote } from "@/lib/api";
import { business } from "@/config/business";
import { requiresAssistedOrder } from "@/lib/availability";
import type { CartProduct } from "@/lib/cart-products";
import { formatPrice } from "@/lib/format";
import { trackCommerceEvent } from "@/lib/analytics";
import { cartEnquiryLink } from "@/lib/whatsapp";
import { ProductImage } from "./product-image";
import { Card, SpecChips, TotalsList, TrustTiles } from "./checkout/parts";
import { useRuntimeProductRecord } from "./runtime-catalogue";
import {
  AlertIcon,
  ArrowRightIcon,
  CartIcon,
  CheckIcon,
  HeartIcon,
  InfoIcon,
  LockIcon,
  TicketIcon,
  TrashIcon,
} from "./icons";

export type CartRow = { line: CartLine; product: CartProduct };

/** Totals for the selected lines, before any coupon. */
export function localTotals(rows: CartRow[], deliveryFee: number, plans: string[] = []) {
  const selected = rows.filter((r) => r.line.selected && r.product.orderable);
  const subtotal = selected.reduce((s, r) => s + r.product.price * r.line.qty, 0);
  const mrpTotal = selected.reduce((s, r) => s + r.product.mrp * r.line.qty, 0);
  const addonTotal = selected.reduce(
    (s, r) => s + (r.product.plan && plans.includes(r.line.slug) ? r.product.plan.price * r.line.qty : 0),
    0,
  );
  return {
    itemCount: selected.reduce((n, r) => n + r.line.qty, 0),
    mrpTotal,
    subtotal,
    addonTotal,
    deliveryFee: selected.length > 0 ? deliveryFee : 0,
    total: subtotal + (selected.length > 0 ? deliveryFee : 0) + addonTotal,
  };
}

/** Server-checked coupon for the current selection; null when none applies. */
export function useCouponQuote(rows: CartRow[], coupon: string, plans: string[] = [], alwaysQuote = false) {
  const [result, setResult] = useState<{ key: string; quote: Quote | null; error: string | null } | null>(null);
  const items = rows
    .filter((r) => r.line.selected && r.product.orderable)
    .map((r) => ({ slug: r.line.slug, qty: r.line.qty, plan: Boolean(r.product.plan && plans.includes(r.line.slug)) }));
  const key = JSON.stringify([items, coupon]);
  const active = items.length > 0 && (alwaysQuote || Boolean(coupon));

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    api<Quote>("/quote", { body: { items, coupon } })
      .then((quote) => !cancelled && setResult({ key, quote, error: null }))
      .catch((e: Error) => !cancelled && setResult({ key, quote: null, error: e.message }));
    return () => {
      cancelled = true;
    };
    // `key` captures items and coupon by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active]);

  if (!active || result?.key !== key) return { quote: null, error: null, pending: active };
  return { quote: result.quote, error: result.error, pending: false };
}

/** Keep every displayed amount aligned with the Worker's authoritative quote. */
export function totalsFromQuote(base: ReturnType<typeof localTotals>, quote: Quote | null) {
  if (!quote) return base;
  return {
    itemCount: base.itemCount,
    mrpTotal: quote.mrpTotal,
    subtotal: quote.subtotal,
    addonTotal: quote.addonTotal,
    couponCode: quote.couponCode,
    couponDiscount: quote.couponDiscount,
    deliveryFee: quote.deliveryFee,
    total: quote.total,
  };
}

/**
 * Compact coupon entry shared by cart and checkout summaries. Codes are only
 * committed on submit, then `/api/quote` remains the source of truth for every
 * validation message and discount calculation.
 */
export function CouponControl({
  coupon,
  setCoupon,
  quote,
  error,
  pending,
}: {
  coupon: string;
  setCoupon: (coupon: string) => void;
  quote: Quote | null;
  error: string | null;
  pending: boolean;
}) {
  const currentCode = coupon.trim().toUpperCase();
  const id = useId();
  const entryId = `${id}-entry`;
  const inputId = `${id}-code`;
  const [draft, setDraft] = useState(currentCode);
  const [open, setOpen] = useState(Boolean(currentCode));
  const draftCode = draft.trim().toUpperCase();
  const isCurrentCode = Boolean(currentCode) && draftCode === currentCode;

  useEffect(() => {
    // The cart hydrates from localStorage after the first client render. Keep
    // the entry open so a persisted invalid or expired code cannot fail silently.
    /* eslint-disable react-hooks/set-state-in-effect -- synchronizes controlled UI with the external cart store */
    setDraft(currentCode);
    setOpen(Boolean(currentCode));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [currentCode]);

  if (quote && quote.couponCode === currentCode) {
    return (
      <div className="mt-4 border-t border-line pt-4">
        <div className="flex items-start justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
          <span role="status" aria-live="polite" aria-atomic="true" className="flex min-w-0 gap-2">
            <TicketIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="block font-semibold">
                Coupon <span className="font-mono">{quote.couponCode}</span> applied
              </span>
              <span className="mt-0.5 block">
                You save {formatPrice(quote.couponDiscount)}
                {quote.couponDescription ? ` · ${quote.couponDescription}` : ""}
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setCoupon("");
              setDraft("");
              setOpen(false);
            }}
            className="min-h-11 shrink-0 px-2 font-semibold text-accent hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-line pt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={entryId}
        onClick={() => {
          if (open && error) {
            setCoupon("");
            setDraft("");
          }
          setOpen((value) => !value);
        }}
        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-accent hover:underline"
      >
        <span className="inline-flex items-center gap-2">
          <TicketIcon className="size-4" /> Have a coupon?
        </span>
        <span aria-hidden="true" className="text-lg font-normal">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div id={entryId} className="pb-2">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (draftCode) setCoupon(draftCode);
            }}
          >
            <label htmlFor={inputId} className="sr-only">Coupon code</label>
            <input
              id={inputId}
              required
              maxLength={30}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(event) => setDraft(event.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm uppercase outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
            <button
              type="submit"
              disabled={!draftCode || (pending && isCurrentCode)}
              className="h-11 shrink-0 rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending && isCurrentCode ? "Checking…" : "Apply"}
            </button>
          </form>
          {pending && isCurrentCode ? (
            <p role="status" className="mt-2 text-xs text-text-muted">Checking this coupon…</p>
          ) : error && isCurrentCode ? (
            <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>
          ) : (
            <p className="mt-2 text-xs text-text-muted">The discount is checked before it changes your total.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function useCartRows(products: Record<string, CartProduct>) {
  const cart = useCart();
  const rows: CartRow[] = cart.lines.flatMap((line) =>
    products[line.slug] ? [{ line, product: products[line.slug] }] : [],
  );
  return { cart, rows };
}

/** "?added=slug" from AddToCartButton: confirm what was just added, once. */
function useAddedBanner(products: Record<string, CartProduct>) {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const added = url.searchParams.get("added");
    if (!added) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL
    setSlug(added);
    // A reload should not announce it again.
    url.searchParams.delete("added");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);
  return slug ? products[slug] ?? null : null;
}

export function CartLines({ products, deliveryFee }: { products: Record<string, CartProduct>; deliveryFee: number }) {
  const runtimeProducts = useRuntimeProductRecord(products);
  const { cart, rows } = useCartRows(runtimeProducts);
  const router = useRouter();
  const saved = cart.saved.flatMap((slug) => (runtimeProducts[slug] ? [runtimeProducts[slug]] : []));
  const { quote, error: couponError, pending: couponPending } = useCouponQuote(rows, cart.coupon);

  const base = localTotals(rows, deliveryFee);
  const totals = totalsFromQuote(base, quote);
  const allSelected = rows.length > 0 && rows.every((r) => r.line.selected);
  const added = useAddedBanner(runtimeProducts);
  const blocked = rows.some((r) => r.line.selected && !r.product.orderable);
  const overCodLimit =
    business.cashOnDelivery &&
    !business.onlinePayments &&
    totals.total > business.codLimit;
  const assistedOrderHref = cartEnquiryLink(
    rows
      .filter((row) => row.line.selected && row.product.orderable)
      .map((row) => ({ title: row.product.title, qty: row.line.qty })),
    totals.total,
  );

  function proceedToCheckout() {
    if (overCodLimit) return;
    trackCommerceEvent("begin_checkout", {
      value: totals.total,
      item_count: totals.itemCount,
    });
    router.push("/checkout/");
  }

  if (rows.length === 0) {
    return (
      <div>
        <div className="rounded-2xl border border-line bg-surface px-6 py-20 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-canvas">
            <CartIcon className="size-7 text-text-muted" />
          </span>
          <p className="mt-5 text-lg font-semibold">Your cart is empty</p>
          <p className="mt-1 text-sm text-text-muted">Browse the catalogue and add what you need.</p>
          <Link
            href="/products/"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Browse products <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        <SavedForLater saved={saved} />
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-0">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
        {added && (
          <div role="status" className="mb-4 flex animate-[pop_400ms_cubic-bezier(.2,1.2,.4,1)] items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 motion-reduce:animate-none">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <CheckIcon className="size-4" />
            </span>
            <p className="min-w-0 text-sm">
              <strong className="block text-emerald-800">Added to cart</strong>
              <span className="line-clamp-1 text-emerald-900/80">{added.title}</span>
            </p>
          </div>
        )}
        <div className="rounded-2xl border border-line bg-surface">
          <label className="flex items-center gap-3 border-b border-line px-5 py-3.5 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => cart.toggleAll(e.target.checked)}
              className="size-4 accent-accent"
            />
            Select all ({rows.length})
          </label>

          <ul className="divide-y divide-line">
            {rows.map(({ line, product }) => {
              const atLimit = product.stockCount !== null && line.qty >= product.stockCount;
              const priceChanged = line.priceAtAdd !== undefined && line.priceAtAdd !== product.price;
              const save = product.mrp - product.price;
              return (
                <li
                  key={line.slug}
                  className="grid grid-cols-[auto_5.5rem_1fr] gap-x-4 gap-y-3 px-5 py-5 sm:grid-cols-[auto_8rem_minmax(0,1fr)_10.5rem_8.5rem]"
                >
                  <label className="mt-8 flex size-11 cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      checked={line.selected}
                      onChange={(e) => cart.toggle(line.slug, e.target.checked)}
                      aria-label={`Include ${product.title} in this order`}
                      className="size-4 accent-accent"
                    />
                  </label>
                  <Link
                    href={`/product/${product.slug}/`}
                    aria-label={`View ${product.title}`}
                    className="flex aspect-square items-center justify-center rounded-xl bg-canvas p-2 [&>picture]:contents"
                  >
                    <ProductImage src={product.image} alt="" sizes="128px" className="max-h-full w-auto object-contain" />
                  </Link>

                  <div className="min-w-0">
                    <p className="eyebrow text-text-muted">{product.brand}</p>
                    <Link href={`/product/${product.slug}/`} className="mt-1 block font-semibold leading-snug hover:text-accent">
                      {product.title}
                    </Link>
                    <SpecChips chips={product.chips} />
                    {!product.orderable ? (
                      <p className="mt-2 text-xs font-medium text-red-600">Currently unavailable</p>
                    ) : product.stockCount !== null && product.stockCount <= 5 ? (
                      <p className="mt-2 text-xs font-medium text-scarcity-text">Only {product.stockCount} units available</p>
                    ) : product.availability === "in_stock" ? (
                      <p className="mt-2 text-xs font-medium text-emerald-700">In stock</p>
                    ) : null}
                  </div>

                  <div className="col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto">
                    <p className="text-xl font-semibold">{formatPrice(product.price)}</p>
                    {save > 0 && (
                      <p className="text-xs">
                        <s className="text-text-muted">{formatPrice(product.mrp)}</s>{" "}
                        <span className="font-medium text-offer">Save {formatPrice(save)}</span>
                      </p>
                    )}
                    <QtyStepper
                      qty={line.qty}
                      max={Math.min(10, product.stockCount ?? 10)}
                      title={product.title}
                      onChange={(q) => cart.setQty(line.slug, q)}
                      onRemove={() => cart.remove(line.slug)}
                    />
                    {atLimit && (
                      <p className="mt-2 flex w-fit items-center gap-1.5 rounded-md bg-scarcity px-2 py-1 text-xs text-scarcity-text">
                        <AlertIcon className="size-3.5" /> Stock limit reached
                      </p>
                    )}
                    {priceChanged && (
                      <p className="mt-2 flex w-fit items-center gap-1.5 rounded-md bg-accent/10 px-2 py-1 text-xs text-accent">
                        <InfoIcon className="size-3.5" /> Price updated since added
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 col-start-2 flex gap-4 text-sm sm:col-span-1 sm:col-start-auto sm:flex-col sm:gap-2 sm:pt-8">
                    <button type="button" onClick={() => cart.saveForLater(line.slug)} className="inline-flex min-h-11 items-center gap-1.5 hover:text-accent">
                      <HeartIcon className="size-4" /> Save for later
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

        </div>

        <SavedForLater saved={saved} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[5.5rem]">
          <Card title="Order Summary">
            <TotalsList totals={totals} />
            {blocked && (
              <p role="status" className="mt-4 text-xs text-scarcity-text">
                Untick or remove unavailable items to continue.
              </p>
            )}
            {overCodLimit && !blocked ? (
              <>
                <p role="status" className="mt-4 text-xs leading-relaxed text-scarcity-text">
                  Online Cash on Delivery checkout is available up to {formatPrice(business.codLimit)}.
                  Contact us to arrange this {formatPrice(totals.total)} cart.
                </p>
                <a
                  href={assistedOrderHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackCommerceEvent("whatsapp_click", { context: "cod_limit_cart", value: totals.total })}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  Contact to order <ArrowRightIcon className="size-4" />
                </a>
              </>
            ) : (
              <button
                type="button"
                disabled={blocked || totals.itemCount === 0}
                onClick={proceedToCheckout}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-text-muted"
              >
                Proceed to Checkout <ArrowRightIcon className="size-4" />
              </button>
            )}
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-text-muted">
              <LockIcon className="size-3.5" /> {overCodLimit ? "Stock and delivery confirmed directly" : "No payment collected now"}
            </p>
            <CouponControl
              coupon={cart.coupon}
              setCoupon={cart.setCoupon}
              quote={quote}
              error={couponError}
              pending={couponPending}
            />
          </Card>
          <TrustTiles />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 shadow-[0_-10px_30px_rgba(17,19,24,0.10)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4 pb-[env(safe-area-inset-bottom)]">
          <div className="min-w-0 flex-1">
            <p className={`text-xs ${blocked ? "font-medium text-scarcity-text" : "text-text-muted"}`}>
              {blocked
                ? "Remove unavailable items to continue"
                : overCodLimit
                  ? `Contact us to order this cart (COD limit ${formatPrice(business.codLimit)})`
                : `${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"} selected`}
            </p>
            <p className="text-lg font-semibold leading-tight">{formatPrice(totals.total)}</p>
          </div>
          {overCodLimit && !blocked ? (
            <a
              href={assistedOrderHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackCommerceEvent("whatsapp_click", { context: "cod_limit_cart_mobile", value: totals.total })}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Contact to order <ArrowRightIcon className="size-4" />
            </a>
          ) : (
            <button
              type="button"
              disabled={blocked || totals.itemCount === 0}
              onClick={proceedToCheckout}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-text-muted"
            >
              Checkout <ArrowRightIcon className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Amazon-style quantity control: at one unit the minus becomes a bin, so
 * removing an item is the same gesture as reducing it, not a separate link.
 */
export function QtyStepper({
  qty,
  max,
  title,
  onChange,
  onRemove,
}: {
  qty: number;
  max: number;
  title: string;
  onChange: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-3 inline-flex h-11 items-center overflow-hidden rounded-full border-2 border-amber-400 bg-surface">
      {qty <= 1 ? (
        <button type="button" onClick={onRemove} aria-label={`Remove ${title} from cart`} className="flex h-full w-11 items-center justify-center hover:bg-red-50 hover:text-red-600">
          <TrashIcon className="size-4" />
        </button>
      ) : (
        <button type="button" onClick={() => onChange(qty - 1)} aria-label="Decrease quantity" className="flex h-full w-11 items-center justify-center text-lg hover:bg-canvas">
          −
        </button>
      )}
      <span className="w-8 text-center text-sm font-semibold" aria-live="polite" aria-label={`Quantity ${qty}`}>
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        disabled={qty >= max}
        aria-label="Increase quantity"
        className="flex h-full w-11 items-center justify-center text-lg hover:bg-canvas disabled:text-text-faint disabled:hover:bg-transparent"
      >
        +
      </button>
    </div>
  );
}

function SavedForLater({ saved }: { saved: CartProduct[] }) {
  const cart = useCart();
  if (saved.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Saved for later ({saved.length})</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {saved.map((p) => (
          <li key={p.slug} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-canvas p-2 [&>picture]:contents">
              <ProductImage src={p.image} alt="" sizes="80px" className="max-h-full w-auto object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <Link href={`/product/${p.slug}/`} className="line-clamp-2 text-sm font-medium hover:text-accent">
                {p.title}
              </Link>
              <p className="mt-1 text-sm font-semibold">{formatPrice(p.price)}</p>
              <div className="mt-2 flex gap-3 text-xs">
                {p.orderable && !requiresAssistedOrder(p.price) && (
                  <button type="button" onClick={() => cart.add(p.slug, 1, p.price)} className="min-h-11 font-semibold text-accent hover:underline">
                    Move to cart
                  </button>
                )}
                {p.orderable && requiresAssistedOrder(p.price) && (
                  <Link href={`/product/${p.slug}/`} className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
                    Contact to order
                  </Link>
                )}
                <button type="button" onClick={() => cart.unsave(p.slug)} className="min-h-11 text-text-muted hover:text-red-600">
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
