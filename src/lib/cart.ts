"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The cart, the "saved for later" list and the coupon being applied.
 *
 * State lives in localStorage: it is per-visitor, survives a reload, and
 * needs no server until checkout. Every read is guarded — private windows
 * and blocked site data both throw — and a failure degrades to an empty
 * cart rather than a broken page.
 *
 * Prices are not trusted from here. `priceAtAdd` exists only to tell the
 * customer "price updated since added"; the Worker prices every order from
 * the catalogue.
 */

const KEY = "galvio.cart.v2";
const LEGACY_KEY = "galvio.cart.v1";
const CHANGED = "galvio:cart-changed";
/** Fired with the product slug, so the header can play the add animation. */
export const ADDED_EVENT = "galvio:cart-added";

export type CartLine = { slug: string; qty: number; priceAtAdd?: number; selected: boolean };
type CartState = { lines: CartLine[]; saved: string[]; coupon: string };

const EMPTY: CartState = { lines: [], saved: [], coupon: "" };

function clean(raw: unknown): CartState {
  if (Array.isArray(raw)) {
    // v1 stored a bare array of { slug, qty }.
    return { ...EMPTY, lines: cleanLines(raw) };
  }
  if (typeof raw !== "object" || raw === null) return EMPTY;
  const r = raw as Partial<CartState>;
  return {
    lines: cleanLines(r.lines),
    saved: Array.isArray(r.saved) ? r.saved.filter((s): s is string => typeof s === "string") : [],
    coupon: typeof r.coupon === "string" ? r.coupon : "",
  };
}

function cleanLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((line) => {
    if (typeof line !== "object" || line === null || typeof line.slug !== "string") return [];
    return [
      {
        slug: line.slug,
        qty: Math.min(10, Math.max(1, Number(line.qty) || 1)),
        priceAtAdd: typeof line.priceAtAdd === "number" ? line.priceAtAdd : undefined,
        selected: line.selected !== false,
      },
    ];
  });
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
  } catch {
    return null;
  }
}

function read(): CartState {
  const raw = readRaw();
  if (!raw) return EMPTY;
  try {
    return clean(JSON.parse(raw));
  } catch {
    return EMPTY;
  }
}

function write(state: CartState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage unavailable. The cart still works for this page view.
  }
  // Same-tab listeners: the storage event only fires in *other* tabs.
  window.dispatchEvent(new CustomEvent(CHANGED));
}

/**
 * Cached snapshot. useSyncExternalStore compares snapshots by reference,
 * so the raw string is the cache key.
 */
let cachedRaw: string | null = null;
let cachedState: CartState = EMPTY;

function snapshot(): CartState {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = read();
  }
  return cachedState;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function update(fn: (state: CartState) => CartState) {
  write(fn(read()));
}

export function useCart() {
  // The server snapshot is empty because the server has no idea what is in
  // this visitor's cart; the real contents arrive right after hydration.
  const state = useSyncExternalStore(subscribe, snapshot, () => EMPTY);

  const add = useCallback((slug: string, qty = 1, price?: number) => {
    update((s) => {
      const existing = s.lines.find((l) => l.slug === slug);
      const lines = existing
        ? s.lines.map((l) => (l.slug === slug ? { ...l, qty: Math.min(10, l.qty + qty), selected: true } : l))
        : [...s.lines, { slug, qty, priceAtAdd: price, selected: true }];
      return { ...s, lines, saved: s.saved.filter((x) => x !== slug) };
    });
    window.dispatchEvent(new CustomEvent(ADDED_EVENT, { detail: { slug } }));
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    update((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.slug === slug ? { ...l, qty: Math.min(10, qty) } : l)).filter((l) => l.qty > 0),
    }));
  }, []);

  const remove = useCallback((slug: string) => {
    update((s) => ({ ...s, lines: s.lines.filter((l) => l.slug !== slug) }));
  }, []);

  const toggle = useCallback((slug: string, selected: boolean) => {
    update((s) => ({ ...s, lines: s.lines.map((l) => (l.slug === slug ? { ...l, selected } : l)) }));
  }, []);

  const toggleAll = useCallback((selected: boolean) => {
    update((s) => ({ ...s, lines: s.lines.map((l) => ({ ...l, selected })) }));
  }, []);

  const saveForLater = useCallback((slug: string) => {
    update((s) => ({
      ...s,
      lines: s.lines.filter((l) => l.slug !== slug),
      saved: [slug, ...s.saved.filter((x) => x !== slug)].slice(0, 50),
    }));
  }, []);

  /** The heart on product cards: save or unsave without touching the cart. */
  const toggleSaved = useCallback((slug: string) => {
    update((s) => ({
      ...s,
      saved: s.saved.includes(slug) ? s.saved.filter((x) => x !== slug) : [slug, ...s.saved].slice(0, 50),
    }));
  }, []);

  const unsave = useCallback((slug: string) => {
    update((s) => ({ ...s, saved: s.saved.filter((x) => x !== slug) }));
  }, []);

  const setCoupon = useCallback((coupon: string) => update((s) => ({ ...s, coupon })), []);

  /** After an order: drop exactly what was ordered, keep the rest. */
  const removeOrdered = useCallback((slugs: string[]) => {
    const ordered = new Set(slugs);
    update((s) => ({ ...s, lines: s.lines.filter((l) => !ordered.has(l.slug)), coupon: "" }));
  }, []);

  const clear = useCallback(() => update((s) => ({ ...s, lines: [], coupon: "" })), []);

  const count = state.lines.reduce((n, l) => n + l.qty, 0);
  const selectedLines = state.lines.filter((l) => l.selected);

  return {
    lines: state.lines,
    selectedLines,
    saved: state.saved,
    coupon: state.coupon,
    count,
    add,
    setQty,
    remove,
    toggle,
    toggleAll,
    saveForLater,
    toggleSaved,
    unsave,
    setCoupon,
    removeOrdered,
    clear,
  };
}
