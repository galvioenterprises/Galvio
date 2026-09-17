"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The enquiry basket.
 *
 * "Add to cart" has to actually add to something, so this is a real cart
 * — it just does not end in a payment, because there is no checkout yet.
 * It ends in one WhatsApp message listing everything the customer chose,
 * which is a far better enquiry than "is this available?" and is how the
 * business already sells.
 *
 * State lives in localStorage: it is per-visitor, survives a reload, and
 * needs no server. Every read is guarded — private windows and blocked
 * site data both throw — and a failure degrades to an empty cart rather
 * than a broken page.
 */

const KEY = "galvio.cart.v1";
const CHANGED = "galvio:cart-changed";

export type CartLine = { slug: string; qty: number };

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((line) =>
      typeof line === "object" &&
      line !== null &&
      typeof (line as CartLine).slug === "string"
        ? [{ slug: (line as CartLine).slug, qty: Math.max(1, Number((line as CartLine).qty) || 1) }]
        : [],
    );
  } catch {
    return [];
  }
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Storage unavailable. The cart still works for this page view.
  }
  // Same-tab listeners: the storage event only fires in *other* tabs.
  window.dispatchEvent(new CustomEvent(CHANGED));
}

/**
 * Cached snapshot.
 *
 * useSyncExternalStore compares snapshots by reference, so parsing the
 * JSON afresh on every read would hand back a new array each time and
 * loop forever. The raw string is the cache key.
 */
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = [];
const EMPTY: CartLine[] = [];

function snapshot(): CartLine[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = read();
  }
  return cachedLines;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCart() {
  // localStorage is an external store, so it is subscribed to rather than
  // copied into state inside an effect. The server snapshot is empty
  // because the server has no idea what is in this visitor's cart, and
  // rendering anything else would mismatch on hydration.
  // No separate "ready" flag is needed: the server snapshot is empty, so
  // the first client render already matches the prerendered HTML and the
  // real contents arrive on the update that follows hydration.
  const lines = useSyncExternalStore(subscribe, snapshot, () => EMPTY);

  const add = useCallback((slug: string, qty = 1) => {
    const next = read();
    const existing = next.find((l) => l.slug === slug);
    if (existing) existing.qty += qty;
    else next.push({ slug, qty });
    write(next);
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    const next = read()
      .map((l) => (l.slug === slug ? { ...l, qty } : l))
      .filter((l) => l.qty > 0);
    write(next);
  }, []);

  const remove = useCallback((slug: string) => {
    write(read().filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => write([]), []);

  const count = lines.reduce((n, l) => n + l.qty, 0);

  return { lines, count, add, setQty, remove, clear };
}
