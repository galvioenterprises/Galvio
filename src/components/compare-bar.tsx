"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompare } from "@/lib/local-list";
import type { SearchEntry } from "@/lib/search";
import { loadSearchIndex, Thumb } from "./site-search";

/** Appears once something is ticked for comparison, on listing-type pages. */
export function CompareBar() {
  const { list, remove, clear, max } = useCompare();
  const pathname = usePathname() ?? "/";
  const [index, setIndex] = useState<Map<string, SearchEntry> | null>(null);

  useEffect(() => {
    if (list.length && !index) void loadSearchIndex().then((entries) => setIndex(new Map(entries.map((e) => [e.slug, e]))));
  }, [list.length, index]);

  if (list.length === 0 || /^\/(compare|checkout|cart|admin|account)\//.test(pathname)) return null;
  const items = list.map((slug) => index?.get(slug)).filter((e): e is SearchEntry => Boolean(e));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.3)] backdrop-blur">
      <div className="mx-auto flex max-w-[1304px] items-center gap-3 px-5 py-3 sm:px-8">
        <p className="hidden text-sm font-semibold sm:block">Compare ({list.length}/{max})</p>
        <ul className="flex flex-1 gap-2 overflow-x-auto">
          {items.map((e) => (
            <li key={e.slug} className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-surface py-1 pl-1 pr-2">
              <Thumb src={e.image} className="size-10" />
              <span className="max-w-36 truncate text-xs">{e.title}</span>
              <button type="button" onClick={() => remove(e.slug)} aria-label={`Remove ${e.title} from compare`} className="text-text-muted hover:text-text">
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={clear} className="hidden text-xs text-text-muted hover:text-text sm:block">
          Clear
        </button>
        <Link
          href="/compare/"
          aria-disabled={list.length < 2}
          className={`inline-flex h-10 shrink-0 items-center rounded-full px-5 text-sm font-semibold text-white ${
            list.length < 2 ? "pointer-events-none bg-line-strong" : "bg-accent hover:bg-accent-hover"
          }`}
        >
          {list.length < 2 ? "Pick one more" : "Compare now"}
        </Link>
      </div>
    </div>
  );
}
