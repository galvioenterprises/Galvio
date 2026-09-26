"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { trackCommerceEvent } from "@/lib/analytics";
import { useRuntimeProduct } from "./runtime-catalogue";

/**
 * Buy now checks out this product alone, as on Amazon and Flipkart: it is
 * added to the cart and becomes the only selected line, so anything else
 * already in the cart stays there, unticked, for later.
 */
export function BuyNowButton({ slug, price, className }: { slug: string; price: number; className?: string }) {
  const { lines, add, toggleAll } = useCart();
  const router = useRouter();
  const runtime = useRuntimeProduct({ slug, price });
  return (
    <button
      type="button"
      onClick={() => {
        toggleAll(false);
        // Already in the cart: keep its quantity, just select it.
        add(slug, lines.some((l) => l.slug === slug) ? 0 : 1, runtime.price);
        trackCommerceEvent("add_to_cart", { slug, value: runtime.price });
        trackCommerceEvent("begin_checkout", { slug, value: runtime.price });
        router.push("/checkout/");
      }}
      className={className}
    >
      Buy now
    </button>
  );
}
