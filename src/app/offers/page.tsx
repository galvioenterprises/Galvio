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
  description: `Shop ${site.name} catalogue offers with savings against MRP, Cash on Delivery and distributor-managed shipping across India.`,
  alternates: { canonical: "/offers/" },
};

/**
 * Products whose current website price is below MRP, largest difference first.
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
          {best > 0 ? `Save up to ${best}% off MRP` : "Current prices"}
        </h1>
        <p className="mt-5 max-w-[60ch] text-[0.9375rem] leading-[1.65] text-text-muted">
          Savings are calculated from the current website price and supplied
          MRP for each model. Add a product to your COD cart; the distributor
          confirms stock and delivery details before dispatch.
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
              {deals.length} {deals.length === 1 ? "product" : "products"} currently below MRP
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 2xl:gap-8">
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
