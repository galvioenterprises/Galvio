import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { getAllProducts } from "@/lib/products";
import { discountPercent } from "@/lib/pricing";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Offers",
  description: `Everything currently discounted at ${site.name} — deepest reductions first, prices inclusive of GST.`,
  alternates: { canonical: "/offers/" },
};

/**
 * Everything currently discounted, deepest first.
 *
 * Derived rather than curated. An offers page maintained by hand is one
 * that is wrong within a fortnight, and a wrong price is worse than no
 * offers page at all.
 */
export default function OffersPage() {
  const deals = getAllProducts()
    .filter((p) => discountPercent(p) > 0)
    .sort((a, b) => discountPercent(b) - discountPercent(a));

  const best = deals[0] ? discountPercent(deals[0]) : 0;

  return (
    <>
      <Breadcrumbs
        size="listing"
        trail={[{ label: "Home", href: "/" }, { label: "Offers" }]}
      />

      <Container size="listing" className="pb-20 pt-8">
        <p className="eyebrow text-offer">Offers</p>
        <h1 className="mt-1.5 text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]">
          {best > 0 ? `Up to ${best}% off` : "Current offers"}
        </h1>
        <p className="mt-5 max-w-[60ch] text-[0.9375rem] leading-[1.65] text-text-muted">
          Everything currently reduced, deepest discount first. Prices include
          GST. On a larger order we can usually do better than the listed
          figure — ask us.
        </p>

        {deals.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-line-strong bg-surface p-12 text-center">
            <p className="text-sm font-medium">No offers running right now</p>
            <Link
              href="/products/"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Browse the catalogue
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-10 text-sm font-medium">
              {deals.length} {deals.length === 1 ? "product" : "products"} on offer
            </p>
            <div className="mt-6 grid gap-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {deals.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </>
        )}
      </Container>
    </>
  );
}
