import Link from "next/link";
import { site } from "@/config/site";
import { getPopulatedCategories } from "@/lib/catalog";
import { ArrowRightIcon } from "@/components/icons";

/**
 * Placeholder home page. The Figma landing frame is built separately —
 * this exists so the domain has something real to serve, and so Search
 * Console verification and indexing can start before the catalogue is
 * finished.
 */
export default function Home() {
  const categories = getPopulatedCategories();

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-20">
      <p className="eyebrow text-text-muted">Premium electronics, trusted brands</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        Upgrade to Better Living
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-text-muted">
        {site.description}
      </p>

      <Link
        href="/products/"
        className="mt-7 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Explore Products
        <ArrowRightIcon className="size-4" />
      </Link>

      <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/products/${category.slug}/`}
            className="rounded-card border border-line bg-surface px-5 py-4 text-sm font-medium transition-shadow hover:shadow-[0_2px_16px_rgba(17,19,24,0.08)]"
          >
            {category.title}
            <span className="ml-2 text-xs font-normal text-text-muted">
              {category.productCount}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
