import type { Metadata } from "next";
import { Container } from "@/components/container";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { getCartProducts } from "@/lib/cart-products";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
  alternates: { canonical: "/checkout/" },
};

export default function CheckoutPage() {
  return (
    <Container size="product" className="pb-24 pt-8">
      <CheckoutView products={getCartProducts()} />
    </Container>
  );
}
