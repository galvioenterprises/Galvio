"use client";

import { useEffect, useState } from "react";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "../icons";

/**
 * Mobile buy bar.
 *
 * On a phone the real Enquire button scrolls off after the first screen,
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
  enquiryHref,
  phone,
}: {
  /** The real enquiry button. The bar appears once this scrolls away. */
  anchorId: string;
  title: string;
  price: string;
  enquiryHref: string;
  phone?: string;
}) {
  const [visible, setVisible] = useState(false);

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
      setVisible(anchorElement.getBoundingClientRect().bottom < 0);
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
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur transition-transform duration-200 lg:hidden ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
        // Hidden from assistive tech while off screen: the same actions
        // are already in the page above.
        aria-hidden={!visible}
      >
        <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-text-muted">{title}</p>
            <p className="text-lg font-semibold leading-tight">{price}</p>
          </div>

          {phone && (
            <a
              href={`tel:${phone}`}
              aria-label="Call the store"
              tabIndex={visible ? 0 : -1}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line"
            >
              <PhoneIcon className="size-5" />
            </a>
          )}

          <a
            href={enquiryHref}
            tabIndex={visible ? 0 : -1}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-white"
          >
            {enquiryHref.startsWith("https://wa.me/") ? (
              <WhatsAppIcon className="size-4" />
            ) : (
              <MailIcon className="size-4" />
            )}
            Enquire
          </a>
        </div>
      </div>
    </>
  );
}
