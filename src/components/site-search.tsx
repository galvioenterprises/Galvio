"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { SearchIcon } from "./icons";

type Entry = {
  slug: string;
  title: string;
  brand: string;
  category: string;
  categorySlug: string;
  price: number;
  image: string;
  haystack: string;
};

const MAX_RESULTS = 6;

/**
 * Header search.
 *
 * The site is a static export, so there is no search endpoint. The index
 * is a single JSON file fetched the first time someone focuses the box —
 * not on page load, because most visitors never search and should not pay
 * for the bytes.
 *
 * Matching is "every typed word appears somewhere in the product", which
 * is what people expect from "voltas 1.5 ton" and is a great deal more
 * useful than a substring match on the title alone.
 */
export function SiteSearch() {
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const router = useRouter();

  async function loadIndex() {
    if (index) return;
    try {
      const response = await fetch("/search-index.json");
      setIndex((await response.json()) as Entry[]);
    } catch {
      // A failed index leaves the box inert rather than breaking the
      // header. Nothing else on the page depends on it.
      setIndex([]);
    }
  }

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results =
    terms.length === 0 || !index
      ? []
      : index
          .filter((entry) => terms.every((term) => entry.haystack.includes(term)))
          .slice(0, MAX_RESULTS);

  const showPanel = open && terms.length > 0;

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      const target = results[active];
      if (target) {
        setOpen(false);
        router.push(`/product/${target.slug}/`);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-invert-muted" />
      <input
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Search products, categories…"
        aria-label="Search products"
        value={query}
        onFocus={() => {
          setOpen(true);
          void loadIndex();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="h-10 w-64 rounded-lg border border-ink-line bg-ink-soft pl-10 pr-3 text-sm text-white placeholder:text-text-invert-muted focus:border-accent focus:outline-none lg:w-80"
      />

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          // Wider than the input: product titles are long, and a result
          // truncated to "Voltas 1.5 Ton 5 Star Inve…" tells you nothing
          // the category line below it did not already say.
          className="absolute right-0 top-full z-30 mt-2 w-[26rem] overflow-hidden rounded-xl border border-line bg-surface text-text shadow-xl"
        >
          {results.length === 0 ? (
            <p className="px-4 py-5 text-sm text-text-muted">
              {index === null
                ? "Searching…"
                : `Nothing matches “${query.trim()}”.`}
            </p>
          ) : (
            <>
              <ul>
                {results.map((entry, i) => (
                  <li key={entry.slug}>
                    <Link
                      href={`/product/${entry.slug}/`}
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        i === active ? "bg-canvas" : ""
                      }`}
                    >
                      <Image
                        src={entry.image}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 object-contain"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium leading-snug">
                          {entry.title}
                        </span>
                        <span className="block text-xs text-text-muted">
                          {entry.category}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatPrice(entry.price)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/products/"
                onClick={() => setOpen(false)}
                className="block border-t border-line px-4 py-3 text-xs font-medium text-accent hover:bg-canvas"
              >
                Browse the full catalogue
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
