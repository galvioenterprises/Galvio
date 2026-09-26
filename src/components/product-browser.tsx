"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/product-schema";
import { trackCommerceEvent } from "@/lib/analytics";
import { useRuntimeProducts } from "./runtime-catalogue";
import {
  buildFacets,
  emptySelection,
  matchesSelection,
  priceBounds,
  sortProducts,
  SORT_OPTIONS,
  type FacetId,
  type Selection,
  type SortId,
} from "@/lib/facets";
import { ProductCard, ProductRow } from "./product-card";
import { ChevronLeftIcon, ChevronRightIcon, GridIcon, ListIcon } from "./icons";
import { ProductFilters } from "./product-filters";

const PAGE_SIZE = 12;
const FACET_IDS = Object.keys(emptySelection) as FacetId[];
const SORT_IDS = new Set<SortId>(SORT_OPTIONS.map((option) => option.id));

type View = "grid" | "list";

function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="flex size-11 items-center justify-center rounded-xl border border-line text-text-muted disabled:opacity-40"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      {pages.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-current={n === page ? "page" : undefined}
          className={`size-11 rounded-xl border text-xs transition-colors ${
            n === page
              ? "border-accent bg-accent text-white"
              : "border-line text-text-muted hover:border-line-strong"
          }`}
        >
          {n}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
        className="flex size-11 items-center justify-center rounded-xl border border-line text-text-muted disabled:opacity-40"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </nav>
  );
}

export function ProductBrowser({ products }: { products: Product[] }) {
  const runtimeProducts = useRuntimeProducts(products);
  const priceLimits = useMemo(() => priceBounds(runtimeProducts), [runtimeProducts]);

  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [price, setPrice] = useState<[number, number]>(priceLimits);
  const [sort, setSort] = useState<SortId>("relevance");
  const [view, setView] = useState<View>("grid");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterDialogRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const applyingHistoryRef = useRef(false);

  useEffect(() => {
    function readUrl() {
      applyingHistoryRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const nextSelection = Object.fromEntries(
        FACET_IDS.map((id) => [id, params.getAll(id).filter(Boolean)]),
      ) as Selection;
      const minParam = params.get("min");
      const maxParam = params.get("max");
      const rawMin = minParam === null ? Number.NaN : Number(minParam);
      const rawMax = maxParam === null ? Number.NaN : Number(maxParam);
      const min = Number.isFinite(rawMin)
        ? Math.max(priceLimits[0], Math.min(rawMin, priceLimits[1]))
        : priceLimits[0];
      const max = Number.isFinite(rawMax)
        ? Math.max(priceLimits[0], Math.min(rawMax, priceLimits[1]))
        : priceLimits[1];
      const rawSort = params.get("sort") as SortId | null;
      const rawView = params.get("view");
      const rawPage = Number.parseInt(params.get("page") ?? "1", 10);

      setSelection(nextSelection);
      setPrice(min < max ? [min, max] : priceLimits);
      setSort(rawSort && SORT_IDS.has(rawSort) ? rawSort : "relevance");
      setView(rawView === "list" ? "list" : "grid");
      setPage(Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1);
    }

    readUrl();
    const readyFrame = window.requestAnimationFrame(() => setUrlReady(true));
    window.addEventListener("popstate", readUrl);
    return () => {
      window.cancelAnimationFrame(readyFrame);
      window.removeEventListener("popstate", readUrl);
    };
  }, [priceLimits]);

  useEffect(() => {
    const categories = [...new Set(products.map((product) => product.category))];
    trackCommerceEvent("view_item_list", {
      item_count: products.length,
      item_category: categories.length === 1 ? categories[0] : "All products",
    });
  }, [products]);

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        requestAnimationFrame(() => filterButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        filterDialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filtersOpen]);

  const facets = useMemo(() => buildFacets(runtimeProducts, selection), [runtimeProducts, selection]);

  const filtered = useMemo(() => {
    const matched = runtimeProducts.filter(
      (p) =>
        matchesSelection(p, selection) &&
        p.sellingPrice >= price[0] &&
        p.sellingPrice <= price[1],
    );
    return sortProducts(matched, sort);
  }, [runtimeProducts, selection, price, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // A filter change can leave you past the last page; clamp rather than
  // render an empty grid with pagination still showing page 4.
  const currentPage = Math.min(page, pageCount);
  useEffect(() => {
    if (!urlReady) return;
    const url = new URL(window.location.href);
    for (const id of FACET_IDS) {
      url.searchParams.delete(id);
      for (const value of selection[id]) url.searchParams.append(id, value);
    }
    if (price[0] === priceLimits[0]) url.searchParams.delete("min");
    else url.searchParams.set("min", String(price[0]));
    if (price[1] === priceLimits[1]) url.searchParams.delete("max");
    else url.searchParams.set("max", String(price[1]));
    if (sort === "relevance") url.searchParams.delete("sort");
    else url.searchParams.set("sort", sort);
    if (view === "grid") url.searchParams.delete("view");
    else url.searchParams.set("view", view);
    if (currentPage <= 1) url.searchParams.delete("page");
    else url.searchParams.set("page", String(currentPage));
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) {
      applyingHistoryRef.current = false;
      return;
    }
    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false;
      return;
    }

    // Debounce range-slider changes into one useful history entry. Other
    // filters still settle quickly enough that Back restores the previous
    // catalogue state instead of leaving the customer on the same URL.
    const historyTimer = window.setTimeout(() => {
      window.history.pushState(window.history.state, "", nextUrl);
    }, 180);
    return () => window.clearTimeout(historyTimer);
  }, [currentPage, price, priceLimits, selection, sort, urlReady, view]);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const activeCount =
    Object.values(selection).reduce((n, values) => n + values.length, 0) +
    (price[0] !== priceLimits[0] || price[1] !== priceLimits[1] ? 1 : 0);

  function toggle(id: FacetId, value: string) {
    setSelection((current) => {
      const chosen = current[id];
      return {
        ...current,
        [id]: chosen.includes(value)
          ? chosen.filter((v) => v !== value)
          : [...chosen, value],
      };
    });
    setPage(1);
  }

  function clear() {
    setSelection(emptySelection);
    setPrice(priceLimits);
    setPage(1);
  }

  function closeFilters() {
    setFiltersOpen(false);
    requestAnimationFrame(() => filterButtonRef.current?.focus());
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultsRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      resultsRef.current?.focus({ preventScroll: true });
    });
  }

  const filterPanel = (showHeader = true) => (
    <ProductFilters
      facets={facets}
      selection={selection}
      onToggle={toggle}
      price={price}
      priceLimits={priceLimits}
      onPriceChange={(range) => {
        setPrice(range);
        setPage(1);
      }}
      onClear={clear}
      activeCount={activeCount}
      showHeader={showHeader}
    />
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-16">
      <aside className="hidden w-[266px] shrink-0 lg:block">{filterPanel()}</aside>

      <div className="min-w-0 flex-1">
        <div ref={resultsRef} tabIndex={-1} className="mb-5 flex scroll-mt-24 flex-wrap items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          <p className="text-sm font-medium">
            {filtered.length} {filtered.length === 1 ? "Product" : "Products"}
          </p>

          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-expanded={filtersOpen}
            className="inline-flex h-11 items-center rounded-xl border border-line bg-surface px-4 text-sm lg:hidden"
          >
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <label className="sr-only" htmlFor="sort">
              Sort by
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortId);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-line bg-surface px-3 text-xs focus:border-accent focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="flex overflow-hidden rounded-lg border border-line">
              {(
                [
                  ["grid", GridIcon, "Grid view"],
                  ["list", ListIcon, "List view"],
                ] as const
              ).map(([id, Icon, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-label={label}
                  aria-pressed={view === id}
                  className={`flex size-11 items-center justify-center transition-colors ${
                    view === id ? "bg-ink text-white" : "bg-surface text-text-muted"
                  }`}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtersOpen && (
          <div className="lg:hidden">
            <button
              type="button"
              aria-label="Close filters"
              onClick={closeFilters}
              className="fixed inset-0 z-[60] cursor-default bg-black/45"
            />
            <section
              ref={filterDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-filters-title"
              className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3">
                <div>
                  <h2 id="mobile-filters-title" className="font-semibold">Filters</h2>
                  <p className="text-xs text-text-muted">
                    {activeCount > 0 ? `${activeCount} selected` : "Refine the catalogue"}
                  </p>
                </div>
                <button
                  type="button"
                  autoFocus
                  onClick={closeFilters}
                  aria-label="Close filters"
                  className="flex size-11 items-center justify-center rounded-xl border border-line text-xl"
                >
                  ×
                </button>
              </div>
              <div className="overscroll-contain overflow-y-auto p-4">{filterPanel(false)}</div>
              <div className="shrink-0 border-t border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={closeFilters}
                  className="h-12 w-full rounded-xl bg-accent text-sm font-semibold text-white"
                >
                  Show {filtered.length} {filtered.length === 1 ? "product" : "products"}
                </button>
              </div>
            </section>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="rounded-card border border-dashed border-line-strong bg-surface p-12 text-center">
            <p className="text-sm font-medium">Nothing matches those filters</p>
            <button
              type="button"
              onClick={clear}
              className="mt-2 text-sm text-accent hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 xl:gap-8">
            {visible.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((product) => (
              <ProductRow key={product.slug} product={product} />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-text-muted">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length} products
            </p>
            <Pagination page={currentPage} pageCount={pageCount} onChange={changePage} />
          </div>
        )}
      </div>
    </div>
  );
}
