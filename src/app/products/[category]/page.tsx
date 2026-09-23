import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { categories, getCategoryBySlug } from "@/config/categories";
import { getProductsByCategory } from "@/lib/products";
import { serializeJsonLd } from "@/lib/json-ld";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductBrowser } from "@/components/product-browser";
import { ProductImage } from "@/components/product-image";
import { Container } from "@/components/container";
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
    : `${category.description} Not listed online yet — ask the showroom to check current models, pricing and availability.`;

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

/**
 * The dark promo card beside the heading. 196px tall in the frame, with
 * the category photograph bleeding off its right edge behind a soft
 * highlight.
 */
function PromoBanner({
  eyebrow,
  title,
  subtitle,
  image,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  image?: string;
}) {
  return (
    <div className="relative flex h-[196px] flex-col justify-center overflow-hidden rounded-2xl bg-ink px-8 py-5 text-text-invert">
      {image && (
        <div
          aria-hidden
          className="absolute inset-y-0 right-8 flex w-[40%] items-center justify-center"
        >
          <ProductImage
            src={`${image}-cutout`}
            alt=""
            sizes="320px"
            className="h-[116%] w-auto max-w-none object-contain"
          />
        </div>
      )}
      {/* Light spill behind the product, and a left-to-right wash so the
          copy stays legible over whatever the photograph is doing. */}
      <div
        aria-hidden
        className="absolute right-8 top-1/2 size-64 -translate-y-1/2 rounded-full bg-white/[0.10] blur-3xl"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-transparent"
      />

      <p className="eyebrow relative text-text-invert-muted">{eyebrow}</p>
      <p className="relative mt-2 max-w-[14ch] text-[1.625rem] font-semibold leading-[1.12] text-white">
        {title}
      </p>
      <p className="relative mt-1.5 text-[0.8125rem] text-text-invert-muted">{subtitle}</p>

      <a
        href="#products"
        className="relative mt-4 inline-flex h-9 w-fit items-center gap-2 rounded-full border border-white/25 px-4 text-xs font-medium text-white transition-colors hover:border-white/50"
      >
        Explore products
        <ArrowRightIcon className="size-3.5" />
      </a>
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
      {/* Two levels, as the frame has it. */}
      <Breadcrumbs
        size="listing"
        trail={[{ label: "Home", href: "/" }, { label: category.title }]}
      />

      <Container size="listing" className="pb-20 pt-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_832px] lg:items-start">
          <div className="lg:pt-1">
            <p className="eyebrow text-text-muted">{category.eyebrow}</p>
            <h1 className="mt-1.5 text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]">
              {category.title}
            </h1>
            <p className="mt-5 max-w-[46ch] text-[0.9375rem] leading-[1.65] text-text-muted">
              {category.description}
            </p>
          </div>

          <PromoBanner {...category.banner} image={category.bannerImage} />
        </div>

        <div id="products" className="mt-[52px] scroll-mt-8">
          {products.length > 0 ? (
            <ProductBrowser products={products} />
          ) : (
            <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-12 text-center">
              <h2 className="text-lg font-semibold">
                {category.title} are arriving shortly
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-text-muted">
                This range does not have a verified online listing yet. Tell us
                what you need and the showroom can check current models,
                pricing and availability.
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
                  See listed products
                </Link>
              </div>
            </div>
          )}
        </div>

        <BuyingGuide category={category} />
      </Container>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
    </>
  );
}
