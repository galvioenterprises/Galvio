import { categories, type Category } from "@/config/categories";
import { getAllProducts } from "./products";

/**
 * Categories that actually have stock behind them.
 *
 * Navigation, the category index and `generateStaticParams` all read from
 * here so an empty category never gets a page. A listing page with nothing
 * on it is thin content: it wastes crawl budget and gives a visitor a dead
 * end. The category is defined in config the moment it is planned, and
 * appears on the site the moment a product is imported into it.
 */
export function getPopulatedCategories(): (Category & { productCount: number })[] {
  const products = getAllProducts();

  return categories
    .map((category) => ({
      ...category,
      productCount: products.filter((p) => p.category === category.name).length,
    }))
    .filter((category) => category.productCount > 0);
}
