import type { Metadata } from "next";
import { Container } from "@/components/container";
import { PaymentView } from "@/components/checkout/payment-view";
import { getCartProducts } from "@/lib/cart-products";
import { business } from "@/config/business";

export const metadata: Metadata = {
  title: business.onlinePayments ? "Payment" : "Review COD Order",
  robots: { index: false, follow: false },
};

export default function PaymentPage() {
  return (
    <Container size="product" className="pb-24 pt-8">
      <PaymentView products={getCartProducts()} />
    </Container>
  );
}
