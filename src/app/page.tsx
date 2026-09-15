import type { Metadata } from "next";
import { site } from "@/config/site";
import { getAllProducts } from "@/lib/products";
import { getPopulatedCategories } from "@/lib/catalog";
import { discountPercent } from "@/lib/pricing";
import { Hero } from "@/components/home/hero";
import { CategoryStrip } from "@/components/home/category-strip";
import { TopDeals } from "@/components/home/top-deals";
import { ValueProps } from "@/components/home/value-props";
import { ExpertCta } from "@/components/home/expert-cta";
import { OrganizationSchema } from "@/components/organization-schema";

export const metadata: Metadata = {
  title: `${site.name} — Electronics & Home Appliances`,
  description: site.description,
  alternates: { canonical: "/" },
};

export default function Home() {
  const categories = getPopulatedCategories();

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
