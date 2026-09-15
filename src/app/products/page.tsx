import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { getAllCategories } from "@/lib/catalog";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "All Products",
  description: `Browse every category ${site.name} stocks, from air conditioners and refrigerators to televisions and water dispensers.`,
  alternates: { canonical: "/products/" },
};

export default function ProductsPage() {
  const categories = getAllCategories();

  return (
    <>
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Products" }]} />

      <div className="mx-auto max-w-[1304px] px-5 py-14 sm:px-8">
        <p className="eyebrow text-text-muted">Catalogue</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          All Products
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
          Everything we stock, sold direct from the distributor. Prices include
          GST, and installation is handled by our own team.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/products/${category.slug}/`}
              className="group flex flex-col justify-between rounded-card border border-line bg-surface p-6 transition-shadow hover:shadow-[0_2px_16px_rgba(17,19,24,0.08)]"
            >
              <div>
                <p className="eyebrow text-text-muted">{category.eyebrow}</p>
                <h2 className="mt-2 text-lg font-semibold">{category.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-text-muted">
                  {category.description}
                </p>
              </div>
              <p className="mt-5 flex items-center gap-1.5 text-sm font-medium text-accent">
                {category.productCount > 0
                  ? `${category.productCount} ${category.productCount === 1 ? "product" : "products"}`
                  : "Stock arriving"}
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
