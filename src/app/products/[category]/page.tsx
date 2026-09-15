import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { categories, getCategoryBySlug } from "@/config/categories";
import { getAllProducts, getProductsByCategory } from "@/lib/products";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductBrowser } from "@/components/product-browser";
import { BuyingGuide } from "@/components/category/buying-guide";
import { ArrowRightIcon } from "@/components/icons";

type Params = { category: string };

/** Only categories with stock get a page. See lib/catalog.ts. */
export function generateStaticParams(): Params[] {
  const products = getAllProducts();
  return categories
    .filter((c) => products.some((p) => p.category === c.name))
    .map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};

  const path = `/products/${category.slug}/`;
  return {
    title: `${category.title} — Price List & Offers`,
    description: category.description,
    alternates: { canonical: path },
    openGraph: {
      title: `${category.title} | ${site.name}`,
      description: category.description,
      url: `${site.url}${path}`,
    },
  };
}

function PromoBanner({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative flex min-h-[168px] flex-col justify-center overflow-hidden rounded-card bg-ink p-7 text-text-invert">
      {/* Soft highlight standing in for the product photograph in the design. */}
      <div
        aria-hidden
        className="absolute -right-16 top-1/2 size-64 -translate-y-1/2 rounded-full bg-white/[0.06] blur-2xl"
      />
      <p className="eyebrow relative text-text-invert-muted">{eyebrow}</p>
      <p className="relative mt-2 max-w-[15ch] text-2xl font-semibold leading-tight text-white">
        {title}
      </p>
      <p className="relative mt-1.5 text-sm text-text-invert-muted">{subtitle}</p>
    </div>
  );
}

export default async function CategoryPage({ params }: { params: Promise<Params> }) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const products = getProductsByCategory(category.name);
  if (products.length === 0) notFound();

  // ItemList tells Google the page is a listing and which products are on
  // it, which is what makes a category page eligible for rich results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category.title,
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${site.url}/product/${product.slug}/`,
      name: product.title,
    })),
  };

  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products/" },
          { label: category.title },
        ]}
      />

      <div className="mx-auto max-w-[1304px] px-5 py-14 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
          <div>
            <p className="eyebrow text-text-muted">{category.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {category.title}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-text-muted">
              {category.description}
            </p>
            <Link
              href="/products/"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Browse all categories
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <PromoBanner {...category.banner} />
        </div>

        <div className="mt-10">
          <ProductBrowser products={products} />
        </div>

        <BuyingGuide category={category} />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
