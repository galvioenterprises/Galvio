import Link from "next/link";
import { ArrowRightIcon } from "../icons";
import { Container } from "../container";
import type { HomeCollection } from "./types";

export function QuickSearches({ collections }: { collections: HomeCollection[] }) {
  if (collections.length === 0) return null;

  return (
    <section aria-labelledby="quick-searches-title" className="pb-20 sm:pb-24">
      <Container>
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-[#eef2f8] px-6 py-5 sm:flex-row sm:items-center">
          <h2 id="quick-searches-title" className="shrink-0 text-sm font-semibold">
            Quick searches
          </h2>
          <ul className="flex flex-1 flex-wrap gap-2">
            {collections.slice(0, 6).map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/products/${collection.slug}/`}
                  className="inline-flex rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {collection.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/products/"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            View all
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
