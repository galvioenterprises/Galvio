import type { Metadata } from "next";
import { BADGE_IDS } from "@/config/badges";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { categories } from "@/config/categories";
import {
  getAllProducts,
  getProductBySlug,
  getProductsByCategory,
} from "@/lib/products";
import { formatMonths } from "@/lib/highlights";
import { formatPrice } from "@/lib/format";
import { serializeJsonLd } from "@/lib/json-ld";
import { resolveProductImageUrl } from "@/lib/product-images";
import type { Product } from "@/lib/product-schema";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { MerchBadge, ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductTabs, type TabSection } from "@/components/product/product-tabs";
import { FaqAccordion } from "@/components/product/faq-accordion";
import { PincodeCheck } from "@/components/product/pincode-check";
import { ProductPurchasePanel } from "@/components/product/purchase-panel";
import { ProductReviews, ReviewBadge } from "@/components/product/product-reviews";
import { SaveToggle } from "@/components/card-toggles";
import { RecentlyViewed, RecordView } from "@/components/recently-viewed";
import {
  DeliveryAndInstallation,
  Overview,
  SectionHeading,
  Specifications,
  WarrantyAndSupport,
} from "@/components/product/product-sections";
import {
  BadgeIcon,
  CreditCardIcon,
  PhoneIcon,
  PinIcon,
  StarIcon,
  TruckIcon,
} from "@/components/icons";

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

/** schema.org availability URLs, which is what Google reads — not our
 *  internal snake_case values. */
const AVAILABILITY_SCHEMA: Partial<Record<Product["availability"], string>> = {
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
  if (product.warrantyMonths) {
    rows.push(["Warranty", formatMonths(product.warrantyMonths)]);
  }
  if (product.installationIncluded !== undefined) {
    rows.push([
      "Installation",
      product.installationIncluded ? "Included" : "Not included",
    ]);
  }
  for (const [key, value] of Object.entries(product.specs)) rows.push([key, value]);
  return rows;
}

/**
 * Trust signals sit between the price and the button rather than below
 * them. That gap is where the hesitation actually happens — a customer
 * who has just read the number is deciding whether to trust it, and
 * answering that question after the button has scrolled past is too late.
 */
export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const category = categories.find((c) => c.name === product.category);
  const rows = specRows(product);
  const related = getProductsByCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  const sections: TabSection[] = [
    { id: "overview", label: "Overview" },
    { id: "specifications", label: "Specifications" },
    ...(product.warrantyMonths || product.compressorWarrantyMonths
      ? [{ id: "warranty", label: "Warranty" }]
      : []),
    {
      id: "delivery",
      label: product.installationIncluded !== undefined || product.category === "Air Conditioner"
        ? "Delivery & Installation"
        : "Delivery",
    },
    { id: "reviews", label: "Reviews" },
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
      ...(AVAILABILITY_SCHEMA[product.availability]
        ? { availability: AVAILABILITY_SCHEMA[product.availability] }
        : {}),
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
        size="listing"
        trail={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products/" },
          ...(category
            ? [{ label: category.title, href: `/products/${category.slug}/` }]
            : []),
          { label: product.title },
        ]}
      />

      <Container size="listing" className="pb-24 pt-2">
        {/* The product needs enough width for a true-to-scale appliance image.
            Keep the delivery panel beside it only on wide desktops; forcing all
            three columns onto a laptop made the gallery collapse around the
            fixed-width details and thumbnail rail. */}
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_319px] 2xl:items-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
              {/* The add-to-cart animation flies the photo from here. */}
              <div data-cart-source className="min-w-0">
                <ProductGallery
                  images={product.images}
                  primaryScale={product.category === "Air Conditioner" ? 1.18 : 1.08}
                />
              </div>

              <div className="relative lg:pt-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="eyebrow text-text-muted">{product.brand}</p>
                  {BADGE_IDS.filter((id) => product.badges?.includes(id)).map((id) => (
                    <MerchBadge key={id} id={id} />
                  ))}
                </div>

                <div className="mt-4 flex items-start justify-between gap-3">
                  <h1 className="text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.01em]">
                    {product.title}
                  </h1>
                  <SaveToggle slug={product.slug} title={product.title} />
                </div>
                <ReviewBadge slug={product.slug} />
                <RecordView slug={product.slug} />

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

                <ProductPurchasePanel
                  product={product}
                  phone={site.contact.phone || undefined}
                />

                {/* Trust follows the primary decision instead of pushing it
                    below the fold. The three points remain immediately visible
                    to anyone who wants reassurance before continuing. */}
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  {[
                    {
                      Icon: BadgeIcon,
                      title: "Genuine Product",
                      subtitle: "Supplied through an authorised Voltas distributor",
                    },
                    {
                      Icon: TruckIcon,
                      title: "Pan-India Delivery",
                      subtitle: "Managed by the distributor",
                    },
                    {
                      Icon: CreditCardIcon,
                      title: "Cash on Delivery",
                      subtitle: business.onlinePayments
                        ? "Or pay online by UPI & cards"
                        : "Pay when your order arrives",
                    },
                  ].map(({ Icon, title, subtitle }) => (
                    <li key={title} className="rounded-lg bg-canvas p-3.5">
                      <Icon className="size-4 text-text-muted" />
                      <p className="mt-2 text-xs font-medium leading-snug">{title}</p>
                      <p className="mt-1 text-[0.6875rem] leading-snug text-text-muted">
                        {subtitle}
                      </p>
                    </li>
                  ))}
                </ul>

              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-line bg-surface p-5 2xl:sticky 2xl:top-[5.5rem]">
            <p className="flex items-center gap-2 text-[0.9375rem] font-semibold">
              <PinIcon className="size-4 text-text-muted" />
              Delivery{product.installationIncluded !== undefined ? " & Installation" : ""}
            </p>
            <p className="mb-4 mt-1.5 text-[0.8125rem] text-text-muted">
              Distributor-managed delivery across India
            </p>

            <PincodeCheck />

            <ul className="mt-5 space-y-4 border-t border-line pt-5 text-[0.8125rem]">
              <li className="flex gap-3">
                <BadgeIcon className="mt-0.5 size-4 shrink-0 text-text-muted" />
                <span>
                  <span className="block font-medium">Fulfilled by the distributor</span>
                  <span className="text-text-muted">
                    Delivered in {business.deliveryDaysMin}–{business.deliveryDaysMax} days after we confirm your order
                  </span>
                </span>
              </li>
              {site.contact.phone && (
                <li className="flex gap-3">
                  <PhoneIcon className="mt-0.5 size-4 shrink-0 text-text-muted" />
                  <span>
                    <span className="block font-medium">Questions, orders or complaints?</span>
                    <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="text-accent">
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
          {(product.warrantyMonths || product.compressorWarrantyMonths) && (
            <WarrantyAndSupport product={product} />
          )}
          <DeliveryAndInstallation product={product} />
          <ProductReviews slug={product.slug} />

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
            <div className="mt-5 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((item) => (
                <ProductCard key={item.slug} product={item} />
              ))}
            </div>
          </section>
        )}
      </Container>

      <RecentlyViewed exclude={product.slug} />

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
