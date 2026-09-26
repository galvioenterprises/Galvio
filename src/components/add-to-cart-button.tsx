"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/product-schema";
import { canAddToCart, requiresAssistedOrder } from "@/lib/availability";
import { trackCommerceEvent } from "@/lib/analytics";
import { CartIcon } from "./icons";
import { useRuntimeProduct } from "./runtime-catalogue";

/** Detail of the event the header's CartFeedback listens for. */
export type CartFeedbackDetail = {
  slug: string;
  title: string;
  price?: number;
  image?: string;
  /** The product photo on screen, to fly from. */
  source: HTMLImageElement | null;
};
export const FEEDBACK_EVENT = "galvio:cart-feedback";

export function AddToCartButton({
  slug,
  title,
  availability,
  price,
  image,
  enquiryHref,
  className = "",
  label = "Add to cart",
  tabIndex,
}: {
  slug: string;
  title: string;
  availability: Product["availability"];
  price?: number;
  image?: string;
  enquiryHref?: string;
  className?: string;
  label?: string;
  tabIndex?: number;
}) {
  const { add } = useCart();
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");
  const ref = useRef<HTMLButtonElement>(null);
  const addedTimer = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const runtime = useRuntimeProduct({ slug, availability, sellingPrice: price });
  const liveAvailability = runtime.availability;
  const livePrice = runtime.sellingPrice;
  const assisted = livePrice !== undefined && requiresAssistedOrder(livePrice);

  useEffect(
    () => () => {
      if (addedTimer.current !== null) window.clearTimeout(addedTimer.current);
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  if (!canAddToCart(liveAvailability) || assisted) {
    const unavailableLabel = liveAvailability === "unknown"
      ? "Confirm availability"
      : liveAvailability === "preorder"
        ? "Pre-order enquiry"
        : liveAvailability === "backorder"
          ? "Backorder enquiry"
          : "Out of stock";
    const content = (
      <>
        {assisted ? "Contact to order" : enquiryHref ? "Enquire" : unavailableLabel}
        <span className="sr-only"> — {title}</span>
      </>
    );

    return enquiryHref ? (
      <a href={enquiryHref} className={className} tabIndex={tabIndex}>
        {content}
      </a>
    ) : (
      <button
        type="button"
        disabled
        tabIndex={tabIndex}
        className={`${className} cursor-not-allowed opacity-60`}
      >
        {content}
      </button>
    );
  }

  function onClick() {
    if (state !== "idle") return;
    setState("adding");
    // The photo to fly: the card's own image, or the product page gallery.
    const root = ref.current?.closest("article");
    const source =
      root?.querySelector<HTMLImageElement>("img") ??
      document.querySelector<HTMLImageElement>("[data-cart-source] img");
    add(slug, 1, livePrice);
    trackCommerceEvent("add_to_cart", { slug, value: livePrice });
    window.dispatchEvent(
      new CustomEvent<CartFeedbackDetail>(FEEDBACK_EVENT, { detail: { slug, title, price: livePrice, image, source } }),
    );
    // A short beat before the tick. Keep the customer on the listing so
    // they can add another product; the global cart toast is the route to
    // review the order when they are ready.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    addedTimer.current = window.setTimeout(() => setState("added"), reduce ? 0 : 350);
    resetTimer.current = window.setTimeout(() => setState("idle"), reduce ? 1400 : 2400);
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={state !== "idle"}
      aria-busy={state === "adding"}
      tabIndex={tabIndex}
      aria-live="polite"
      className={`${className} relative overflow-hidden transition-[transform,background-color] active:scale-[0.97] ${
        state === "added" ? "!bg-emerald-600" : ""
      }`}
    >
      <span className="inline-flex items-center gap-2">
        {state === "added" ? (
          <>
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" className="[stroke-dasharray:24] [stroke-dashoffset:24] animate-[draw_350ms_ease-out_forwards]" />
            </svg>
            Added
          </>
        ) : state === "adding" ? (
          <>
            <CartIcon className="size-4 animate-[nudge_350ms_ease-in-out]" />
            Adding…
          </>
        ) : (
          label
        )}
      </span>
      <span className="sr-only"> — {title}</span>
    </button>
  );
}
