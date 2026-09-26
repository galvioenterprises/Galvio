"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FEEDBACK_EVENT, type CartFeedbackDetail } from "./add-to-cart-button";
import { CheckIcon } from "./icons";

/**
 * The one animation after "Add to cart": the product photo flies into the
 * header's cart icon, which bumps as it lands. A small status message gives
 * an explicit route to the cart without interrupting catalogue browsing.
 *
 * Native Web Animations API, so there is no animation library to
 * download; skipped entirely under prefers-reduced-motion.
 */
export function CartFeedback() {
  const [added, setAdded] = useState<CartFeedbackDetail | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    function onAdded(event: Event) {
      const detail = (event as CustomEvent<CartFeedbackDetail>).detail;
      setAdded(detail);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setAdded(null), 4200);

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const target = document.getElementById("header-cart");
        if (target) fly(detail.source, target);
      }
    }
    window.addEventListener(FEEDBACK_EVENT, onAdded);
    return () => {
      window.removeEventListener(FEEDBACK_EVENT, onAdded);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  if (!added) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-20 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-[0_16px_45px_rgba(17,19,24,0.18)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[23rem]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
        <CheckIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm text-emerald-900">Added to cart</strong>
        <span className="block truncate text-xs text-text-muted">{added.title}</span>
      </span>
      <Link
        href="/cart/"
        className="inline-flex h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold text-accent hover:bg-accent/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        View cart
      </Link>
    </div>
  );
}

/** Flies a copy of the product photo along an arc into the cart icon. */
function fly(source: HTMLImageElement | null, target: HTMLElement) {
  const to = target.getBoundingClientRect();
  const bump = () =>
    target.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.35) rotate(-8deg)" }, { transform: "scale(0.9)" }, { transform: "scale(1)" }],
      { duration: 450, easing: "ease-out" },
    );

  if (!source || !source.currentSrc) {
    bump();
    return;
  }
  const from = source.getBoundingClientRect();
  // Off-screen sources (a sticky bar on a scrolled page) just bump the icon.
  if (from.bottom < 0 || from.top > window.innerHeight || from.width === 0) {
    bump();
    return;
  }

  const size = Math.min(from.width, from.height, 220);
  const clone = document.createElement("img");
  clone.src = source.currentSrc;
  clone.alt = "";
  Object.assign(clone.style, {
    position: "fixed",
    left: `${from.left + (from.width - size) / 2}px`,
    top: `${from.top + (from.height - size) / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "contain",
    zIndex: "60",
    pointerEvents: "none",
    borderRadius: "16px",
    background: "white",
    boxShadow: "0 12px 30px rgba(0,0,0,.25)",
  });
  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const animation = clone.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 90}px) scale(0.55)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.08)`, opacity: 0.6 },
    ],
    { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" },
  );
  animation.onfinish = () => {
    clone.remove();
    bump();
  };
}
