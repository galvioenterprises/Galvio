import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/container";
import { OrderDetail } from "@/components/account/order-detail";

export const metadata: Metadata = {
  title: "Track Order",
  robots: { index: false, follow: false },
};

export default function OrderPage() {
  return (
    <Container size="product" className="pb-24 pt-6">
      {/* The order id is in the query string, which a static page only
          knows in the browser. */}
      <Suspense>
        <OrderDetail />
      </Suspense>
    </Container>
  );
}
