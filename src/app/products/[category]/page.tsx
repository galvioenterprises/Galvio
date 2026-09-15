import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { categories, getCategoryBySlug } from "@/config/categories";
import { getProductsByCategory } from "@/lib/products";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductBrowser } from "@/components/product-browser";
import { BuyingGuide } from "@/components/category/buying-guide";
import { ArrowRightIcon, WhatsAppIcon } from "@/components/icons";

type Params = { category: string };

/**
 * Every category gets a page, stocked or not. Each one carries its own
 * buying guide, which is unique content people actively search for, and
 * an unstocked page says so plainly rather than showing an empty grid.
 */
export function generateStaticParams(): Params[] {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};

  const stocked = getProductsByCategory(category.name).length > 0;
  const path = `/products/${category.slug}/`;

  // Promising a price list on a page with no prices is a mismatch between
  // the result and the page, and it is the kind of thing that costs a
  // listing its click-through rate long before it costs it a ranking.
  const title = stocked
    ? `${category.title} — Price List & Offers`
    : `${category.title} — Buying Guide & Availability`;

  const description = stocked
    ? category.description
    : `${category.description} Not listed online yet — ask us and we will quote from current distributor stock.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${category.title} | ${site.name}`,
      description,
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

  // ItemList tells Google the page is a listing and which products are on
  // it, which is what makes a category page eligible for rich results.
  // Omitted entirely when there is nothing to list — an ItemList of zero
  // items is a structured-data warning, not a neutral no-op.
  const jsonLd =
    products.length > 0
      ? {
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
        }
      : null;

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
          {products.length > 0 ? (
            <ProductBrowser products={products} />
          ) : (
            <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-12 text-center">
              <h2 className="text-lg font-semibold">
                {category.title} are arriving shortly
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-text-muted">
                This range is not listed online yet, but we can quote from
                current distributor stock today. Tell us the room and the
                budget and we will come back with two or three options.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <a
                  href={generalEnquiryLink()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  <WhatsAppIcon className="size-4" />
                  Ask about {category.title.toLowerCase()}
                </a>
                <Link
                  href="/products/"
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-6 text-sm font-medium transition-colors hover:border-line-strong"
                >
                  See what is in stock
                </Link>
              </div>
            </div>
          )}
        </div>

        <BuyingGuide category={category} />
      </div>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
    </>
  );
}
