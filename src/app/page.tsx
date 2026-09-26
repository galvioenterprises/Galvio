import type { Metadata } from "next";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { getAllProducts } from "@/lib/products";
import { getAllCategories } from "@/lib/catalog";
import type { Product } from "@/lib/product-schema";
import { discountPercent } from "@/lib/pricing";
import { Hero, type HeroStats } from "@/components/home/hero";
import { canAddToCart } from "@/lib/availability";
import { TrustBand } from "@/components/home/trust-band";
import { CategoryStrip } from "@/components/home/category-strip";
import { CategoryPromos } from "@/components/home/category-promos";
import { TopDeals } from "@/components/home/top-deals";
import { RecentlyViewed } from "@/components/recently-viewed";
import { BuyingAssistant } from "@/components/home/buying-assistant";
import { ValueProps } from "@/components/home/value-props";
import { ExpertCta } from "@/components/home/expert-cta";
import { QuickSearches } from "@/components/home/quick-searches";
import type { HomeCollection } from "@/components/home/types";
import { OrganizationSchema } from "@/components/organization-schema";

export const metadata: Metadata = {
  // Absolute, so the layout's "%s | Galvio Enterprises" template does not
  // append the business name to a title that already carries it.
  title: {
    absolute: `${site.name} — Genuine ${business.primaryBrand} Appliances, Delivered Across India`,
  },
  description: `Shop ${business.primaryBrand} air conditioners, air coolers and appliances supplied through an authorised distributor, with Cash on Delivery and pan-India shipping.`,
  alternates: { canonical: "/" },
  // The layout defines openGraph, so a page that only overrides `title`
  // and `description` keeps the layout's social copy. Set both here or
  // the share card says something different from the search result.
  openGraph: {
    title: `${site.name} — Genuine ${business.primaryBrand} Appliances, Delivered Across India`,
    description: `Shop ${business.primaryBrand} appliances supplied through an authorised distributor, with Cash on Delivery and pan-India shipping.`,
    url: site.url,
  },
  twitter: {
    title: `${site.name} — Genuine ${business.primaryBrand} Appliances, Delivered Across India`,
    description: `Shop ${business.primaryBrand} appliances supplied through an authorised distributor, with Cash on Delivery and pan-India shipping.`,
  },
};

function tagsFor(products: Product[]): string[] {
  const capacities = [
    ...new Set(products.map((product) => product.capacity).filter((value): value is string => Boolean(value))),
  ];
  const stars = [
    ...new Set(
      products
        .map((product) => product.starRating)
        .filter((value): value is number => value !== undefined),
    ),
  ].sort((a, b) => a - b);

  return [
    ...capacities.slice(0, 2),
    ...stars.slice(0, 1).map((rating) => `${rating} Star`),
    ...(products.some((product) => product.inverter) ? ["Inverter"] : []),
  ].slice(0, 3);
}

/** The product photo each category card uses (as before the redesign). */
const PREFERRED_COLLECTION_IMAGE: Record<string, { productImage: string; shot?: number }> = {
  "air-conditioners": { productImage: "voltas-4504051" },
  "air-coolers": { productImage: "voltas-4810348", shot: 1 },
  stabilisers: { productImage: "voltas-9014092" },
  freezers: { productImage: "voltas-5211776" },
  "visi-coolers": { productImage: "voltas-5410921" },
};

/** Transparent cut-outs for the two large banners. */
const PROMO_IMAGE: Record<string, string> = {
  "air-conditioners": "voltas-4504051-cutout",
  "air-coolers": "voltas-4810348-2-cutout",
};

export default function Home() {
  const categories = getAllCategories();
  const products = getAllProducts();

  const collections: HomeCollection[] = categories.flatMap((category) => {
    const listed = products.filter((product) => product.category === category.name);
    const preferred = PREFERRED_COLLECTION_IMAGE[category.slug];
    const preferredProduct = preferred
      ? listed.find((product) => product.images.some((image) => image.src === preferred.productImage))
      : undefined;
    const image = preferredProduct?.images[preferred?.shot ?? 0] ?? listed[0]?.images[0];
    if (!image) return [];

    return [
      {
        slug: category.slug,
        title: category.title,
        productCount: listed.length,
        image: image.src,
        imageAlt: image.alt,
        tags: tagsFor(listed),
      },
    ];
  });

  const promoted = ["air-conditioners", "air-coolers"]
    .map((slug) => {
      const collection = collections.find((c) => c.slug === slug);
      return collection ? { ...collection, image: PROMO_IMAGE[slug] } : undefined;
    })
    .filter((collection): collection is HomeCollection => collection !== undefined);

  // Show a fuller deal set. Dealer stock can remain unconfirmed while the
  // item is still eligible for a COD order; the UI never labels that
  // state as "in stock" until the distributor supplies it.
  const deals = [...products]
    .filter((product) => product.availability !== "out_of_stock" && discountPercent(product) > 0)
    .sort((a, b) => discountPercent(b) - discountPercent(a))
    .slice(0, 8);

  // Model counts for the hero. Prices belong on runtime-aware product cards;
  // a build-time category minimum can become stale after an admin override.
  const heroStats: HeroStats = {};
  for (const product of products) {
    if (!canAddToCart(product.availability)) continue;
    const stat = (heroStats[product.category] ??= { count: 0 });
    stat.count += 1;
  }

  return (
    <>
      <Hero stats={heroStats} />
      <TrustBand />
      <CategoryStrip categories={categories} />
      <CategoryPromos collections={promoted} />
      <TopDeals products={deals} />
      <RecentlyViewed title="Pick up where you left off" />
      <BuyingAssistant collections={collections} />
      <ExpertCta />
      <ValueProps />
      <QuickSearches collections={collections} />
      <OrganizationSchema />
    </>
  );
}
