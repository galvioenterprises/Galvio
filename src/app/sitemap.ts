import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getAllProducts } from "@/lib/products";
import { getAllCategories } from "@/lib/catalog";
import { policies } from "@/config/policies";

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
    ...getAllCategories().map((category) => ({
      url: `${site.url}/products/${category.slug}/`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...["about", "contact", "stores"].map((path) => ({
      url: `${site.url}/${path}/`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...policies.map((policy) => ({
      url: `${site.url}/policies/${policy.slug}/`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...getAllProducts().map((product) => ({
      url: `${site.url}/product/${product.slug}/`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
