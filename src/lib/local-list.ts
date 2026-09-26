"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A short list of product slugs kept in this browser — compare picks,
 * recently viewed. Same guarded-localStorage approach as the cart: a
 * blocked store degrades to an empty list, never a broken page.
 */
export function createListStore(key: string, max: number) {
  const EVENT = `galvio:list:${key}`;
  const EMPTY: string[] = [];
  let cachedRaw: string | null | undefined;
  let cached: string[] = EMPTY;

  function readRaw(): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function snapshot(): string[] {
    const raw = readRaw();
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        cached = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, max) : EMPTY;
      } catch {
        cached = EMPTY;
      }
    }
    return cached;
  }

  function write(list: string[]) {
    try {
      localStorage.setItem(key, JSON.stringify(list.slice(0, max)));
    } catch {
      // Storage unavailable: the list lasts for this page view only.
    }
    window.dispatchEvent(new CustomEvent(EVENT));
  }

  function subscribe(onChange: () => void) {
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }

  return function useList() {
    const list = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
    const add = useCallback((slug: string) => write([slug, ...snapshot().filter((s) => s !== slug)]), []);
    const remove = useCallback((slug: string) => write(snapshot().filter((s) => s !== slug)), []);
    const toggle = useCallback((slug: string) => {
      const now = snapshot();
      write(now.includes(slug) ? now.filter((s) => s !== slug) : [...now, slug]);
    }, []);
    const clear = useCallback(() => write([]), []);
    return { list, add, remove, toggle, clear, max };
  };
}

export const useCompare = createListStore("galvio.compare.v1", 3);
export const useRecentlyViewed = createListStore("galvio.recent.v1", 12);
