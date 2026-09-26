"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { canAddToCart } from "@/lib/availability";
import { getProductImageManifestEntry } from "@/lib/product-images";
import { matchedCategories, prepare, search, type SearchEntry } from "@/lib/search";
import { ProductImage } from "./product-image";
import { ArrowRightIcon, BoxIcon, SearchIcon } from "./icons";
import { useRuntimeProducts } from "./runtime-catalogue";

const MAX_RESULTS = 6;
const POPULAR = ["1.5 ton split ac", "5 star ac", "desert cooler", "window ac", "stabiliser", "chest freezer"];

let indexPromise: Promise<ReturnType<typeof prepare>> | null = null;
const EMPTY_INDEX: ReturnType<typeof prepare> = [];

/** The index is one JSON file, fetched the first time anyone searches. */
export function loadSearchIndex() {
  indexPromise ??= fetch("/search-index.json")
    .then((r) => r.json() as Promise<SearchEntry[]>)
    .then(prepare)
    .catch(() => {
      indexPromise = null;
      return [];
    });
  return indexPromise;
}

/**
 * Header search: a dropdown on desktop, a full-screen sheet on phones.
 * Matching and ranking live in src/lib/search.ts.
 */
export function SiteSearch() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => trigger?.focus());
    };
  }, [mobileOpen]);

  return (
    <>
      <div className="hidden md:block">
        <SearchBox variant="header" />
      </div>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Search products"
        className="flex size-10 items-center justify-center rounded-lg text-text-invert-muted hover:text-white md:hidden"
      >
        <SearchIcon className="size-5" />
      </button>
      {mobileOpen && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex flex-col bg-surface text-text md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Search products"
        >
          <div className="flex items-center gap-2 border-b border-line p-3">
            <div className="flex-1">
              <SearchBox
                variant="sheet"
                autoFocus
                onNavigate={() => setMobileOpen(false)}
                onDismiss={() => setMobileOpen(false)}
              />
            </div>
            <button type="button" onClick={() => setMobileOpen(false)} className="min-h-11 px-3 text-sm font-medium text-accent">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SearchBox({
  variant,
  autoFocus = false,
  onNavigate,
  onDismiss,
}: {
  variant: "header" | "sheet";
  autoFocus?: boolean;
  onNavigate?: () => void;
  onDismiss?: () => void;
}) {
  const [index, setIndex] = useState<Awaited<ReturnType<typeof loadSearchIndex>> | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(variant === "sheet");
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const router = useRouter();
  const liveIndex = useRuntimeProducts(index ?? EMPTY_INDEX);

  function ensureIndex() {
    if (!index) void loadSearchIndex().then(setIndex);
  }

  useEffect(() => {
    if (variant === "sheet") ensureIndex();
    function onPointerDown(event: MouseEvent) {
      if (variant === "header" && !containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  const all = useMemo(
    () => (index && query.trim() ? search(liveIndex, query) : []),
    [index, liveIndex, query],
  );
  const results = all.slice(0, MAX_RESULTS);
  const categories = matchedCategories(all).slice(0, 3);
  const trimmed = query.trim();

  function go(href: string) {
    setOpen(variant === "sheet");
    onNavigate?.();
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      if (variant === "sheet") onDismiss?.();
      else setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter" && trimmed) {
      event.preventDefault();
      const target = results[active];
      go(target ? `/product/${target.slug}/` : `/search/?q=${encodeURIComponent(trimmed)}`);
    }
  }

  const panel = open && (variant === "sheet" || trimmed.length > 0 || index);
  const header = variant === "header";

  return (
    <div ref={containerRef} className="relative">
      <SearchIcon className={`pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 ${header ? "text-text-invert-muted" : "text-text-muted"}`} />
      <input
        type="search"
        role="combobox"
        aria-expanded={Boolean(panel)}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-option-${active}` : undefined}
        placeholder="Search ACs, coolers, 1.5 ton…"
        aria-label="Search products"
        autoFocus={autoFocus}
        value={query}
        onFocus={() => {
          setOpen(true);
          ensureIndex();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={
          header
            ? "h-10 w-64 rounded-lg border border-ink-line bg-ink-soft pl-10 pr-3 text-sm text-white placeholder:text-text-invert-muted focus:border-accent focus:outline-none lg:w-56 xl:w-80"
            : "h-11 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-3 text-base focus:border-accent focus:outline-none"
        }
      />

      {panel && (
        <div
          id={listId}
          role="listbox"
          className={
            header
              ? "absolute right-0 top-full z-30 mt-2 w-[30rem] overflow-hidden rounded-xl border border-line bg-surface text-text shadow-2xl"
              : "fixed inset-x-0 bottom-0 top-[4.25rem] overflow-y-auto bg-surface"
          }
        >
          {!trimmed ? (
            <div className="p-4">
              <p className="eyebrow text-text-muted">Popular searches</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {POPULAR.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setQuery(q);
                      setActive(-1);
                    }}
                    className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-accent hover:text-accent"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : !index ? (
            <p className="px-4 py-5 text-sm text-text-muted">Searching…</p>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-sm">
              <p className="font-medium">No products match &ldquo;{trimmed}&rdquo;</p>
              <p className="mt-1 text-text-muted">Try a category like &ldquo;AC&rdquo; or &ldquo;cooler&rdquo;, or a capacity like &ldquo;1.5 ton&rdquo;.</p>
              <Link href="/products/" onClick={() => go("/products/")} className="mt-3 inline-block font-medium text-accent">
                Browse all products
              </Link>
            </div>
          ) : (
            <>
              {categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
                  <span className="text-xs text-text-muted">In</span>
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/products/${c.slug}/`}
                      onClick={() => go(`/products/${c.slug}/`)}
                      className="rounded-full bg-canvas px-3 py-1 text-xs font-medium hover:bg-accent/10 hover:text-accent"
                    >
                      {c.title} ({c.count})
                    </Link>
                  ))}
                </div>
              )}
              <ul className="py-1">
                {results.map((entry, i) => (
                  <li key={entry.slug}>
                    <Link
                      id={`${listId}-option-${i}`}
                      href={`/product/${entry.slug}/`}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(`/product/${entry.slug}/`)}
                      className={`flex items-center gap-3 px-4 py-2.5 ${i === active ? "bg-canvas" : ""}`}
                    >
                      <Thumb src={entry.image} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium leading-snug">
                          <Highlight text={entry.title} query={trimmed} />
                        </span>
                        <span className="block text-xs text-text-muted">{entry.category}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-semibold">{formatPrice(entry.price)}</span>
                        {!canAddToCart(entry.availability) ? (
                          <span className="block text-[0.6875rem] font-medium text-scarcity-text">
                            {entry.availability === "out_of_stock"
                              ? "Out of stock"
                              : entry.availability === "preorder"
                                ? "Pre-order"
                                : "Back-order"}
                          </span>
                        ) : entry.mrp && entry.mrp > entry.price ? (
                          <span className="block text-[0.6875rem] font-medium text-emerald-700">
                            {Math.round(((entry.mrp - entry.price) / entry.mrp) * 100)}% off
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/search/?q=${encodeURIComponent(trimmed)}`}
                onClick={() => go(`/search/?q=${encodeURIComponent(trimmed)}`)}
                className="flex items-center justify-between border-t border-line px-4 py-3 text-sm font-medium text-accent hover:bg-canvas"
              >
                See all {all.length} result{all.length === 1 ? "" : "s"} for &ldquo;{trimmed}&rdquo;
                <ArrowRightIcon className="size-4" />
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Thumb({ src, className = "size-12" }: { src: string; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-canvas p-1 [&>picture]:contents ${className}`}>
      {getProductImageManifestEntry(src) ? (
        <ProductImage src={src} alt="" sizes="48px" className="max-h-full w-auto object-contain" />
      ) : (
        <BoxIcon className="size-5 text-text-faint" />
      )}
    </span>
  );
}

/** Bolds the parts of the title the shopper typed. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!words.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${words.join("|")})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-transparent font-semibold text-accent">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}
