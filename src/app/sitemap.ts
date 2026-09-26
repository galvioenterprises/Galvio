import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { getAllProducts } from "@/lib/products";
import { getAllCategories } from "@/lib/catalog";
import { policies } from "@/config/policies";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const hasPublicStoreAddress = Boolean(
    site.address.street && site.address.locality,
  );
  const supportingPages = [
    "about",
    "contact",
    "offers",
    "bulk-orders",
    ...(hasPublicStoreAddress ? ["stores"] : []),
  ];

  return [
    { url: `${site.url}/`, changeFrequency: "weekly", priority: 1 },
    {
      url: `${site.url}/products/`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...getAllCategories().map((category) => ({
      url: `${site.url}/products/${category.slug}/`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...supportingPages.map((path) => ({
      url: `${site.url}/${path}/`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...policies.map((policy) => ({
      url: `${site.url}/policies/${policy.slug}/`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...getAllProducts().map((product) => ({
      url: `${site.url}/product/${product.slug}/`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
