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
import { formatMonths } from "@/lib/highlights";
import { formatPrice } from "@/lib/format";
import { serializeJsonLd } from "@/lib/json-ld";
import { resolveProductImageUrl } from "@/lib/product-images";
import { buyNowLink, productEnquiryLink } from "@/lib/whatsapp";
import { AddToCartButton } from "@/components/add-to-cart-button";
import type { Product } from "@/lib/product-schema";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductTabs, type TabSection } from "@/components/product/product-tabs";
import { FaqAccordion } from "@/components/product/faq-accordion";
import { PincodeCheck } from "@/components/product/pincode-check";
import { StickyBuyBar } from "@/components/product/sticky-buy-bar";
import {
  DeliveryAndInstallation,
  Overview,
  SectionHeading,
  Specifications,
  WarrantyAndSupport,
} from "@/components/product/product-sections";
import {
  BadgeIcon,
  PhoneIcon,
  PinIcon,
  ShieldCheckIcon,
  StarIcon,
  TruckIcon,
} from "@/components/icons";
import { business } from "@/config/business";

/** Five stars with the rating filled in, as the frame draws it. */
function Stars({ value }: { value: number }) {
  return (
    <span aria-hidden className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          className={`size-3.5 ${i <= Math.round(value) ? "text-star" : "text-line-strong"}`}
        />
      ))}
    </span>
  );
}

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
      images: [{ url: resolveProductImageUrl(product.images[0].src, site.url) }],
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
    product.warrantyMonths > 0 ? formatMonths(product.warrantyMonths) : "Not covered",
  ]);
  rows.push(["Installation", product.installationIncluded ? "Included" : "Not included"]);
  for (const [key, value] of Object.entries(product.specs)) rows.push([key, value]);
  return rows;
}

/**
 * Trust signals sit between the price and the button rather than below
 * them. That gap is where the hesitation actually happens — a customer
 * who has just read the number is deciding whether to trust it, and
 * answering that question after the button has scrolled past is too late.
 */
const BUY_ASSURANCES = [
  { Icon: BadgeIcon, title: "Genuine Product", subtitle: "Manufacturer warranty" },
  { Icon: TruckIcon, title: "Delivery", subtitle: "From our own stock" },
  { Icon: ShieldCheckIcon, title: "Installation", subtitle: "Service coordination" },
];

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const category = categories.find((c) => c.name === product.category);
  const off = discountPercent(product);
  const savings = product.mrp - product.sellingPrice;
  const rows = specRows(product);
  const inStock = product.availability === "in_stock";
  const primaryActionHref = inStock
    ? buyNowLink(product)
    : productEnquiryLink(product);
  const related = getProductsByCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  const sections: TabSection[] = [
    { id: "overview", label: "Overview" },
    { id: "specifications", label: "Specifications" },
    { id: "warranty", label: "Warranty" },
    { id: "delivery", label: "Delivery & Installation" },
    ...(product.faqs.length > 0 ? [{ id: "faqs", label: "FAQs" }] : []),
  ];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description,
    sku: product.sku,
    gtin: product.gtin,
    mpn: product.model,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    image: product.images.map((image) =>
      resolveProductImageUrl(image.src, site.url),
    ),
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

  // FAQPage is its own search result surface, so it is worth emitting
  // separately rather than folding the questions into the product node.
  const faqJsonLd =
    product.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: product.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  return (
    <>
      <Breadcrumbs
        size="product"
        trail={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products/" },
          ...(category
            ? [{ label: category.title, href: `/products/${category.slug}/` }]
            : []),
          { label: product.title },
        ]}
      />

      <Container size="product" className="pb-24 pt-2">
        {/* Frame 174:3056: the gallery and the details share one card,
            852 wide; the delivery panel is a separate 319 card beside it. */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_319px] lg:items-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
              <ProductGallery images={product.images} />

              <div className="relative lg:pt-2.5">
                <p className="eyebrow text-text-muted">{product.brand}</p>

                <h1 className="mt-4 text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em]">
                  {product.title}
                </h1>

                {product.rating && (
                  <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-text-muted">
                    <Stars value={product.rating.value} />
                    <span className="font-medium text-text">{product.rating.value}</span>
                    <span>({product.rating.count} reviews)</span>
                  </p>
                )}

                <ul className="mt-3 flex flex-wrap gap-2">
                  {[
                    product.capacity,
                    product.starRating ? `${product.starRating} Star` : undefined,
                    product.inverter ? "Inverter" : undefined,
                  ]
                    .filter(Boolean)
                    .map((chip) => (
                      <li
                        key={chip}
                        className="eyebrow rounded bg-canvas px-2.5 py-1.5 text-[0.625rem] text-text-muted"
                      >
                        {chip}
                      </li>
                    ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-baseline gap-2.5">
                  <p className="text-[1.875rem] font-semibold tracking-tight">
                    {formatPrice(product.sellingPrice)}
                  </p>
                  {off > 0 && (
                    <s className="text-[0.9375rem] text-text-muted">
                      {formatPrice(product.mrp)}
                    </s>
                  )}
                </div>

                {off > 0 && (
                  <p className="mt-1.5 text-[0.8125rem] font-medium text-scarcity-text">
                    Save {formatPrice(savings)} ({off}% off)
                  </p>
                )}
                <p className="mt-1 text-[0.8125rem] text-text-muted">
                  Inclusive of {product.gstRate}% GST.{" "}
                  {AVAILABILITY_LABEL[product.availability]}.
                </p>

                {/* Trust sits between the price and the button: that gap
                    is where the hesitation is, and answering it after the
                    button has scrolled past is too late to matter. */}
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  {BUY_ASSURANCES.map(({ Icon, title, subtitle }) => (
                    <li key={title} className="rounded-lg bg-canvas p-3.5">
                      <Icon className="size-4 text-text-muted" />
                      <p className="mt-2 text-xs font-medium leading-snug">{title}</p>
                      <p className="mt-1 text-[0.6875rem] leading-snug text-text-muted">
                        {subtitle}
                      </p>
                    </li>
                  ))}
                </ul>

                <div id="product-cta" className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={primaryActionHref}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                  >
                    {inStock ? "Buy now" : "Enquire"}
                  </a>
                  <AddToCartButton
                    slug={product.slug}
                    title={product.title}
                    availability={product.availability}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-ink-soft"
                  />
                </div>

                <StickyBuyBar
                  anchorId="product-cta"
                  title={product.title}
                  price={formatPrice(product.sellingPrice)}
                  enquiryHref={primaryActionHref}
                  phone={site.contact.phone || undefined}
                />
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-6">
            <p className="flex items-center gap-2 text-[0.9375rem] font-semibold">
              <PinIcon className="size-4 text-text-muted" />
              Delivery &amp; Installation
            </p>
            <p className="mb-4 mt-1.5 text-[0.8125rem] text-text-muted">
              Check availability in your area
            </p>

            <PincodeCheck />

            <ul className="mt-5 space-y-4 border-t border-line pt-5 text-[0.8125rem]">
              <li className="flex gap-3">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-text-muted" />
                <span>
                  <span className="block font-medium">Easy returns</span>
                  <span className="text-text-muted">
                    {business.returnWindowDays} days replacement
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <BadgeIcon className="mt-0.5 size-4 shrink-0 text-text-muted" />
                <span>
                  <span className="block font-medium">Bought direct</span>
                  <span className="text-text-muted">
                    Distributor stock, not a marketplace reseller
                  </span>
                </span>
              </li>
              {site.contact.phone && (
                <li className="flex gap-3">
                  <PhoneIcon className="mt-0.5 size-4 shrink-0 text-text-muted" />
                  <span>
                    <span className="block font-medium">Need help?</span>
                    <a href={`tel:${site.contact.phone}`} className="text-accent">
                      Call {site.contact.phone}
                    </a>
                  </span>
                </li>
              )}
            </ul>
          </aside>
        </div>

        {/* The tab bar and the sections it points at share one wrapper.
            A sticky element only sticks while its parent is in view, so
            wrapping the bar on its own would scroll it away immediately. */}
        <div className="mt-6">
          <ProductTabs sections={sections} />

          <Overview product={product} />
          <Specifications rows={rows} />
          <WarrantyAndSupport product={product} />
          <DeliveryAndInstallation product={product} />

          {product.faqs.length > 0 && (
            <section id="faqs" className="scroll-mt-20 pt-12">
              <SectionHeading>Frequently Asked Questions</SectionHeading>
              <div className="mt-5">
                <FaqAccordion faqs={product.faqs} />
              </div>
            </section>
          )}
        </div>

        {related.length > 0 && (
          <section className="pt-16">
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
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      )}
    </>
  );
}
