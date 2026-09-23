import type { Metadata } from "next";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { getAllProducts } from "@/lib/products";
import { getAllCategories } from "@/lib/catalog";
import type { Product } from "@/lib/product-schema";
import { discountPercent } from "@/lib/pricing";
import { Hero } from "@/components/home/hero";
import { TrustBand } from "@/components/home/trust-band";
import { CategoryStrip } from "@/components/home/category-strip";
import { CategoryPromos } from "@/components/home/category-promos";
import { TopDeals } from "@/components/home/top-deals";
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
    absolute: `${site.name} — Authorised ${business.primaryBrand} Distributor`,
  },
  description: `Browse listed ${business.primaryBrand} air conditioners, air coolers and home appliances from an authorised distributor, with published prices and supplied product details.`,
  alternates: { canonical: "/" },
  // The layout defines openGraph, so a page that only overrides `title`
  // and `description` keeps the layout's social copy. Set both here or
  // the share card says something different from the search result.
  openGraph: {
    title: `${site.name} — Authorised ${business.primaryBrand} Distributor`,
    description: `Browse listed ${business.primaryBrand} appliances with published prices and supplied product details from an authorised distributor.`,
    url: site.url,
  },
  twitter: {
    title: `${site.name} — Authorised ${business.primaryBrand} Distributor`,
    description: `Browse listed ${business.primaryBrand} appliances with published prices and supplied product details from an authorised distributor.`,
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

const PREFERRED_COLLECTION_IMAGE: Record<
  string,
  { productImage: string; shot?: number }
> = {
  "air-conditioners": { productImage: "voltas-4504051" },
  "air-coolers": { productImage: "voltas-4810348", shot: 1 },
  stabilisers: { productImage: "voltas-9014092" },
  freezers: { productImage: "voltas-5211776" },
  "visi-coolers": { productImage: "voltas-5410921" },
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

  // These two sourced product shots have transparent variants generated
  // specifically for the large promotional surfaces below.
  const promoted = [
    collections.find((collection) => collection.slug === "air-conditioners")
      ? {
          ...collections.find((collection) => collection.slug === "air-conditioners")!,
          image: "voltas-4504051-cutout",
        }
      : undefined,
    collections.find((collection) => collection.slug === "air-coolers")
      ? {
          ...collections.find((collection) => collection.slug === "air-coolers")!,
          image: "voltas-4810348-2-cutout",
        }
      : undefined,
  ].filter((collection): collection is HomeCollection => collection !== undefined);

  // Manufacturer-sourced availability may be unknown. A real published
  // discount can still be shown, but the product remains an enquiry until
  // showroom stock has been confirmed.
  const deals = [...products]
    .filter((product) => product.availability !== "out_of_stock" && discountPercent(product) > 0)
    .sort((a, b) => discountPercent(b) - discountPercent(a))
    .slice(0, 5);

  return (
    <>
      <Hero />
      <TrustBand />
      <CategoryStrip categories={categories} />
      <CategoryPromos collections={promoted} />
      <TopDeals products={deals} />
      <BuyingAssistant collections={collections} />
      <ExpertCta />
      <ValueProps />
      <QuickSearches collections={collections} />
      <OrganizationSchema />
    </>
  );
}
