import Link from "next/link";
import type { Product } from "@/lib/product-schema";
import { ProductCard } from "../product-card";
import { ArrowRightIcon } from "../icons";
import { Container } from "../container";

export function TopDeals({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section id="top-deals" className="scroll-mt-24 pt-20 sm:pt-24">
      <Container size="listing">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-[2rem] font-semibold tracking-[-0.02em]">
          Top Deals of the Season
        </h2>
        <Link
          href="/offers/"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-accent hover:underline"
        >
          View all offers
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 2xl:gap-8">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
      </Container>
    </section>
  );
}
