"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/product-schema";
import { canAddToCart } from "@/lib/availability";
import { AddToCartButton } from "../add-to-cart-button";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "../icons";
import { formatPrice } from "@/lib/format";
import { useRuntimeProduct } from "../runtime-catalogue";

/**
 * Mobile buy bar.
 *
 * On a phone the main purchase controls scroll off after the first screen,
 * and the specifications below it are long. This puts the price and the
 * action back within thumb reach for the rest of the page.
 *
 * It appears only once the real button has scrolled out of view, so the
 * two are never on screen together competing for the same tap — and it is
 * hidden entirely on desktop, where the button stays visible beside a
 * sticky panel anyway.
 */
export function StickyBuyBar({
  anchorId,
  title,
  price,
  priceValue,
  image,
  slug,
  availability,
  enquiryHref,
  phone,
}: {
  /** The main purchase controls. The bar appears once these scroll away. */
  anchorId: string;
  title: string;
  price: string;
  priceValue: number;
  image: string;
  slug: string;
  availability: Product["availability"];
  enquiryHref: string;
  phone?: string;
}) {
  const [visible, setVisible] = useState(false);
  const runtime = useRuntimeProduct({ slug, availability, price: priceValue });

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    // Deliberately a scroll listener rather than an IntersectionObserver.
    // The obvious implementation observes a 1px sentinel placed after the
    // button, and a box that small does not reliably produce intersection
    // callbacks at all — it silently never fires, leaving the bar pinned
    // open. Measuring the button itself is both simpler and honest about
    // what the question actually is.
    let frame = 0;

    function measure() {
      frame = 0;
      const anchorElement = document.getElementById(anchorId);
      if (!anchorElement) return;
      const rect = anchorElement.getBoundingClientRect();
      // A partly clipped button is not a usable action. Hide the duplicate
      // only while the full primary-action row is within the viewport.
      const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
      setVisible(!fullyVisible);
    }

    function onScroll() {
      if (frame === 0) frame = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [anchorId]);

  return (
    <>
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 shadow-[0_-10px_30px_rgba(17,19,24,0.10)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none lg:hidden ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        // Hidden from assistive tech while off screen: the same actions
        // are already in the page above.
        aria-hidden={!visible}
      >
        <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-text-muted">{title}</p>
            <p className="text-lg font-semibold leading-tight">
              {runtime.price === priceValue ? price : formatPrice(runtime.price)}
            </p>
          </div>

          {phone && (
            <a
              href={`tel:${phone.replace(/\s/g, "")}`}
              aria-label="Call the store"
              tabIndex={visible ? 0 : -1}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line"
            >
              <PhoneIcon className="size-5" />
            </a>
          )}

          {canAddToCart(runtime.availability) ? (
            <AddToCartButton
              slug={slug}
              title={title}
              availability={runtime.availability}
              price={runtime.price}
              image={image}
              enquiryHref={enquiryHref}
              tabIndex={visible ? 0 : -1}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white"
            />
          ) : (
            <a
              href={enquiryHref}
              tabIndex={visible ? 0 : -1}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white"
            >
              {enquiryHref.startsWith("https://wa.me/") ? (
                <WhatsAppIcon className="size-4" />
              ) : (
                <MailIcon className="size-4" />
              )}
              Contact us
            </a>
          )}
        </div>
      </div>
    </>
  );
}
