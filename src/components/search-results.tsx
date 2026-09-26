"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/lib/product-schema";
import { trackCommerceEvent } from "@/lib/analytics";
import { matchedCategories, search } from "@/lib/search";
import { ProductCard } from "./product-card";
import { loadSearchIndex } from "./site-search";
import { SearchIcon } from "./icons";

export function SearchResults({ products }: { products: Product[] }) {
  const q = useSearchParams().get("q") ?? "";
  const router = useRouter();
  const [index, setIndex] = useState<Awaited<ReturnType<typeof loadSearchIndex>> | null>(null);
  const [input, setInput] = useState(q);
  const [category, setCategory] = useState("");

  useEffect(() => {
    void loadSearchIndex().then(setIndex);
  }, []);

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);
  const matches = useMemo(() => (index ? search(index, q) : []), [index, q]);
  const categories = matchedCategories(matches);
  const shown = matches
    .filter((m) => !category || m.categorySlug === category)
    .flatMap((m) => (bySlug.get(m.slug) ? [bySlug.get(m.slug)!] : []));

  useEffect(() => {
    if (!index || !q.trim()) return;
    trackCommerceEvent(matches.length > 0 ? "search" : "search_no_results", {
      result_count: matches.length,
      query_length: q.trim().length,
    });
  }, [index, matches.length, q]);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setCategory("");
          router.push(`/search/?q=${encodeURIComponent(input.trim())}`);
        }}
        className="relative max-w-2xl"
      >
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search ACs, coolers, 1.5 ton…"
          aria-label="Search products"
          className="h-14 w-full rounded-2xl border border-line-strong bg-surface pl-12 pr-4 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
      </form>

      <h1 className="mt-8 text-[1.75rem] font-semibold tracking-[-0.02em]">
        {q ? (
          <>
            {index ? matches.length : "…"} result{matches.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
          </>
        ) : (
          "Search the catalogue"
        )}
      </h1>

      {categories.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip active={!category} onClick={() => setCategory("")}>All ({matches.length})</Chip>
          {categories.map((c) => (
            <Chip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)}>
              {c.title} ({c.count})
            </Chip>
          ))}
        </div>
      )}

      {index && q && shown.length === 0 && (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="font-medium">Nothing matches &ldquo;{q}&rdquo;.</p>
          <p className="mt-1 text-sm text-text-muted">Check the spelling, or try a broader word like &ldquo;AC&rdquo; or &ldquo;cooler&rdquo;.</p>
          <Link href="/products/" className="mt-4 inline-block text-sm font-semibold text-accent">Browse all products</Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {shown.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm ${active ? "border-accent bg-accent text-white" : "border-line-strong bg-surface hover:border-text"}`}
    >
      {children}
    </button>
  );
}
