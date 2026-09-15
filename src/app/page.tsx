import type { Metadata } from "next";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { getAllProducts } from "@/lib/products";
import { getAllCategories } from "@/lib/catalog";
import { discountPercent } from "@/lib/pricing";
import { Hero } from "@/components/home/hero";
import { CategoryStrip } from "@/components/home/category-strip";
import { TopDeals } from "@/components/home/top-deals";
import { ValueProps } from "@/components/home/value-props";
import { ExpertCta } from "@/components/home/expert-cta";
import { OrganizationSchema } from "@/components/organization-schema";

export const metadata: Metadata = {
  // Absolute, so the layout's "%s | Galvio Enterprises" template does not
  // append the business name to a title that already carries it.
  title: {
    absolute: `${site.name} — Authorised ${business.primaryBrand} Distributor`,
  },
  description: `Buy ${business.primaryBrand} air conditioners, refrigerators and home appliances direct from the distributor. Genuine stock, full warranty, installed by our own team.`,
  alternates: { canonical: "/" },
  // The layout defines openGraph, so a page that only overrides `title`
  // and `description` keeps the layout's social copy. Set both here or
  // the share card says something different from the search result.
  openGraph: {
    title: `${site.name} — Authorised ${business.primaryBrand} Distributor`,
    description: `Genuine ${business.primaryBrand} stock, full factory warranty, and delivery and installation by our own team.`,
    url: site.url,
  },
  twitter: {
    title: `${site.name} — Authorised ${business.primaryBrand} Distributor`,
    description: `Genuine ${business.primaryBrand} stock, full factory warranty, and delivery and installation by our own team.`,
  },
};

export default function Home() {
  const categories = getAllCategories();

  // The season's deals are simply the deepest discounts we actually have.
  // Curating them by hand is a page nobody remembers to update.
  const deals = [...getAllProducts()]
    .filter((p) => p.availability === "in_stock" && discountPercent(p) > 0)
    .sort((a, b) => discountPercent(b) - discountPercent(a))
    .slice(0, 4);

  return (
    <>
      <Hero />
      <CategoryStrip categories={categories} />
      <TopDeals products={deals} />
      <ValueProps />
      <ExpertCta />
      <OrganizationSchema />
    </>
  );
}
