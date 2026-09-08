import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getAllProducts } from "@/lib/products";
import { getPopulatedCategories } from "@/lib/catalog";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${site.url}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    {
      url: `${site.url}/products/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...getPopulatedCategories().map((category) => ({
      url: `${site.url}/products/${category.slug}/`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...getAllProducts().map((product) => ({
      url: `${site.url}/product/${product.slug}/`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
