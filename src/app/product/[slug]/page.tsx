import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { categories } from "@/config/categories";
import {
  getAllProducts,
  getProductBySlug,
  getProductsByCategory,
} from "@/lib/products";
import { discountPercent } from "@/lib/pricing";
import { formatPrice } from "@/lib/format";
import { productEnquiryLink } from "@/lib/whatsapp";
import type { Product } from "@/lib/product-schema";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { PhoneIcon, StarIcon, WhatsAppIcon } from "@/components/icons";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};

  const path = `/product/${product.slug}/`;
  return {
    title: `${product.title} — ${formatPrice(product.sellingPrice)}`,
    description: product.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: product.title,
      description: product.description,
      url: `${site.url}${path}`,
      images: [{ url: product.images[0].src }],
    },
  };
}

const AVAILABILITY_LABEL: Record<Product["availability"], string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  preorder: "Available to pre-order",
  backorder: "On backorder",
};

/** schema.org availability URLs, which is what Google reads — not our
 *  internal snake_case values. */
const AVAILABILITY_SCHEMA: Record<Product["availability"], string> = {
  in_stock: "https://schema.org/InStock",
  out_of_stock: "https://schema.org/OutOfStock",
  preorder: "https://schema.org/PreOrder",
  backorder: "https://schema.org/BackOrder",
};

const CONDITION_SCHEMA: Record<Product["condition"], string> = {
  new: "https://schema.org/NewCondition",
  refurbished: "https://schema.org/RefurbishedCondition",
  used: "https://schema.org/UsedCondition",
};

function specRows(product: Product): [string, string][] {
  const rows: [string, string][] = [
    ["Brand", product.brand],
    ["Model", product.model],
  ];
  if (product.subCategory) rows.push(["Type", product.subCategory]);
  if (product.capacity) rows.push(["Capacity", product.capacity]);
  if (product.starRating) rows.push(["Energy rating", `${product.starRating} Star (BEE)`]);
  if (product.inverter !== undefined) {
    rows.push(["Compressor", product.inverter ? "Inverter" : "Fixed speed"]);
  }
  if (product.color) rows.push(["Colour", product.color]);
  if (product.weightKg) rows.push(["Weight", `${product.weightKg} kg`]);
  if (product.dimensions) {
    const { lengthMm, widthMm, heightMm } = product.dimensions;
    rows.push(["Dimensions (W×D×H)", `${lengthMm} × ${widthMm} × ${heightMm} mm`]);
  }
  rows.push([
    "Warranty",
    product.warrantyMonths > 0
      ? `${product.warrantyMonths} months manufacturer warranty`
      : "No warranty",
  ]);
  rows.push([
    "Installation",
    product.installationIncluded ? "Included" : "Not included",
  ]);
  for (const [key, value] of Object.entries(product.specs)) rows.push([key, value]);
  return rows;
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const category = categories.find((c) => c.name === product.category);
  const off = discountPercent(product);
  const related = getProductsByCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    sku: product.sku,
    gtin: product.gtin,
    mpn: product.model,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    image: product.images.map((i) => `${site.url}${i.src}`),
    offers: {
      "@type": "Offer",
      url: `${site.url}/product/${product.slug}/`,
      priceCurrency: site.currency,
      price: product.sellingPrice,
      availability: AVAILABILITY_SCHEMA[product.availability],
      itemCondition: CONDITION_SCHEMA[product.condition],
      seller: { "@type": "Organization", name: site.legalName },
    },
    ...(product.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.value,
            reviewCount: product.rating.count,
          },
        }
      : {}),
  };

  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products/" },
          ...(category
            ? [{ label: category.title, href: `/products/${category.slug}/` }]
            : []),
          { label: product.title },
        ]}
      />

      <div className="mx-auto max-w-[1200px] px-5 py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <ProductGallery images={product.images} />

          <div>
            <div className="flex items-center gap-3">
              <p className="eyebrow text-text-muted">{product.brand}</p>
              {product.rating && (
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <StarIcon className="size-3.5 text-star" />
                  <span className="font-medium text-text">{product.rating.value}</span>
                  ({product.rating.count})
                </span>
              )}
            </div>

            <h1 className="mt-2 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
              {product.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <p className="text-3xl font-semibold tracking-tight">
                {formatPrice(product.sellingPrice)}
              </p>
              {off > 0 && (
                <>
                  <s className="text-base text-text-muted">{formatPrice(product.mrp)}</s>
                  <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {off}% off
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Inclusive of {product.gstRate}% GST. {AVAILABILITY_LABEL[product.availability]}.
            </p>

            <p className="mt-6 text-sm leading-relaxed text-text-muted">
              {product.description}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={productEnquiryLink(product)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                <WhatsAppIcon className="size-4" />
                Enquire on WhatsApp
              </a>
              {site.contact.phone && (
                <a
                  href={`tel:${site.contact.phone}`}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-surface px-6 text-sm font-medium transition-colors hover:border-line-strong"
                >
                  <PhoneIcon className="size-4" />
                  Call the store
                </a>
              )}
            </div>

            <dl className="mt-8 divide-y divide-line overflow-hidden rounded-card border border-line bg-surface text-sm">
              {specRows(product).map(([label, value]) => (
                <div key={label} className="flex gap-4 px-4 py-2.5">
                  <dt className="w-44 shrink-0 text-text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">
                More {category?.title ?? product.category}
              </h2>
              {category && (
                <Link
                  href={`/products/${category.slug}/`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  View all
                </Link>
              )}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.slug} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
