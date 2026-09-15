import { categories, type Category } from "@/config/categories";
import { getAllProducts } from "./products";

export type CategoryWithCount = Category & { productCount: number };

/**
 * Every category, with how many products it currently holds.
 *
 * Categories are listed whether or not stock has been imported yet. An
 * empty one is not thin content here: each carries its own buying guide,
 * which is unique, useful, and the thing people actually search — "which
 * ton AC for 150 sq ft" gets typed far more often than a model number.
 * The page says plainly that stock is arriving and routes the visitor to
 * WhatsApp rather than showing an empty grid.
 */
export function getAllCategories(): CategoryWithCount[] {
  const products = getAllProducts();

  return categories.map((category) => ({
    ...category,
    productCount: products.filter((p) => p.category === category.name).length,
  }));
}

/** Only the categories that currently have stock. Used where an empty
 *  category would be actively misleading, such as "browse by category"
 *  counts on the products index. */
export function getPopulatedCategories(): CategoryWithCount[] {
  return getAllCategories().filter((category) => category.productCount > 0);
}
