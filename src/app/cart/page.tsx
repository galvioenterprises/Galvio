import type { Metadata } from "next";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { CartLines } from "@/components/cart-lines";
import { CartHeading } from "@/components/checkout/cart-heading";
import { getCartProducts } from "@/lib/cart-products";
import { RecentlyViewed } from "@/components/recently-viewed";

export const metadata: Metadata = {
  title: "Your Cart",
  description: `Review your cart and check out with ${site.name}.`,
  // A per-visitor page with nothing unique to index.
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart/" },
};

export default function CartPage() {
  return (
    <>
      <Breadcrumbs size="product" trail={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <Container size="product" className="pb-24 pt-6">
        <CartHeading />
        <div className="mt-8">
          <CartLines products={getCartProducts()} deliveryFee={business.deliveryFee} />
        </div>
      </Container>
      <div className="pb-20">
        <RecentlyViewed />
      </div>
    </>
  );
}
