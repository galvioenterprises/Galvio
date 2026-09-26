import { categories } from "@/config/categories";
import { planFor } from "@/config/addons";
import { canAddToCart } from "./availability";
import { getAllProducts } from "./products";
import type { Product } from "./product-schema";

/**
 * What the cart and checkout pages need to show each product, baked into
 * those static pages at build time. The runtime catalogue feed overlays live
 * price and stock in the browser, and the Worker independently re-prices and
 * re-checks every request before accepting it.
 */
export type CartProduct = {
  slug: string;
  title: string;
  brand: string;
  price: number;
  mrp: number;
  image: string;
  chips: string[];
  variant: string;
  availability: Product["availability"];
  orderable: boolean;
  stockCount: number | null;
  categorySlug: string;
  /** The Voltas protection plan offered with this product, if any. */
  plan: { title: string; price: number; summary: string } | null;
};

export function getCartProducts(): Record<string, CartProduct> {
  return Object.fromEntries(
    getAllProducts().map((p) => {
      const chips = [
        p.capacity,
        p.inverter ? "Inverter" : undefined,
        p.starRating ? `${p.starRating} Star` : undefined,
      ].filter((c): c is string => Boolean(c));
      return [
        p.slug,
        {
          slug: p.slug,
          title: p.title,
          brand: p.brand,
          price: p.sellingPrice,
          mrp: p.mrp,
          image: p.images[0].src,
          chips,
          variant: [p.color, p.subCategory].filter(Boolean).join(" · "),
          availability: p.availability,
          orderable: canAddToCart(p.availability),
          stockCount: p.stockCount ?? null,
          categorySlug: categories.find((c) => c.name === p.category)?.slug ?? "",
          plan: (() => {
            const plan = planFor(p);
            return plan ? { title: plan.title, price: plan.price, summary: plan.summary } : null;
          })(),
        },
      ];
    }),
  );
}
