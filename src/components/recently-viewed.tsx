"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRecentlyViewed } from "@/lib/local-list";
import { formatPrice } from "@/lib/format";
import type { SearchEntry } from "@/lib/search";
import { loadSearchIndex, Thumb } from "./site-search";
import { Container } from "./container";
import { useRuntimeProducts } from "./runtime-catalogue";

const EMPTY_INDEX: SearchEntry[] = [];

/** Adds this product to the visitor's recently viewed list. */
export function RecordView({ slug }: { slug: string }) {
  const { add } = useRecentlyViewed();
  useEffect(() => add(slug), [add, slug]);
  return null;
}

/** A strip of what this visitor looked at recently (this browser only). */
export function RecentlyViewed({ exclude, title = "Recently viewed" }: { exclude?: string; title?: string }) {
  const { list, clear } = useRecentlyViewed();
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const slugs = list.filter((s) => s !== exclude).slice(0, 8);
  const liveIndex = useRuntimeProducts(index ?? EMPTY_INDEX);
  const bySlug = useMemo(
    () => new Map(liveIndex.map((entry) => [entry.slug, entry])),
    [liveIndex],
  );

  useEffect(() => {
    if (slugs.length && !index) void loadSearchIndex().then(setIndex);
  }, [slugs.length, index]);

  const items = slugs.map((slug) => bySlug.get(slug)).filter((entry): entry is SearchEntry => Boolean(entry));
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-title" className="pt-16">
      <Container size="listing">
        <div className="flex items-end justify-between">
          <h2 id="recent-title" className="text-xl font-semibold">{title}</h2>
          <button type="button" onClick={clear} className="text-xs text-text-muted hover:text-text">Clear</button>
        </div>
        <ul className="mt-4 flex gap-4 overflow-x-auto pb-2">
          {items.map((e) => (
            <li key={e.slug} className="w-44 shrink-0">
              <Link href={`/product/${e.slug}/`} className="group block rounded-2xl border border-line bg-surface p-3 hover:border-line-strong">
                <Thumb src={e.image} className="h-32 w-full" />
                <p className="mt-2 line-clamp-2 text-xs font-medium group-hover:text-accent">{e.title}</p>
                <p className="mt-1 text-sm font-semibold">{formatPrice(e.price)}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
