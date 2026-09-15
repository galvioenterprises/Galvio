import Link from "next/link";
import type { Product } from "@/lib/product-schema";
import { ProductCard } from "../product-card";
import { ArrowRightIcon } from "../icons";

export function TopDeals({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section id="top-deals" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 pt-14">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          Top Deals of the Season
        </h2>
        <Link
          href="/products/"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          View all offers
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
