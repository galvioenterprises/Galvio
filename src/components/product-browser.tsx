"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/product-schema";
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
        className="flex size-8 items-center justify-center rounded-lg border border-line text-text-muted disabled:opacity-40"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      {pages.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-current={n === page ? "page" : undefined}
          className={`size-8 rounded-lg border text-xs transition-colors ${
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
        className="flex size-8 items-center justify-center rounded-lg border border-line text-text-muted disabled:opacity-40"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </nav>
  );
}

export function ProductBrowser({ products }: { products: Product[] }) {
  const priceLimits = useMemo(() => priceBounds(products), [products]);

  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [price, setPrice] = useState<[number, number]>(priceLimits);
  const [sort, setSort] = useState<SortId>("relevance");
  const [view, setView] = useState<View>("grid");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const facets = useMemo(() => buildFacets(products, selection), [products, selection]);

  const filtered = useMemo(() => {
    const matched = products.filter(
      (p) =>
        matchesSelection(p, selection) &&
        p.sellingPrice >= price[0] &&
        p.sellingPrice <= price[1],
    );
    return sortProducts(matched, sort);
  }, [products, selection, price, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // A filter change can leave you past the last page; clamp rather than
  // render an empty grid with pagination still showing page 4.
  const currentPage = Math.min(page, pageCount);
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

  const filterPanel = (
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
    />
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-16">
      <aside className="hidden w-[266px] shrink-0 lg:block">{filterPanel}</aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium">
            {filtered.length} {filtered.length === 1 ? "Product" : "Products"}
          </p>

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs lg:hidden"
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
              className="h-9 rounded-lg border border-line bg-surface px-3 text-xs focus:border-accent focus:outline-none"
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
                  className={`flex size-9 items-center justify-center transition-colors ${
                    view === id ? "bg-ink text-white" : "bg-surface text-text-muted"
                  }`}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtersOpen && <div className="mb-5 lg:hidden">{filterPanel}</div>}

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
          <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
