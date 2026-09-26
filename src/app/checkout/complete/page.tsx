import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/container";
import { ConfirmationView } from "@/components/checkout/confirmation-view";

export const metadata: Metadata = {
  title: "Order Placed",
  robots: { index: false, follow: false },
};

export default function CompletePage() {
  return (
    <Container size="product" className="pb-24 pt-8">
      {/* The order id is in the query string, which a static page only
          knows in the browser. */}
      <Suspense>
        <ConfirmationView />
      </Suspense>
    </Container>
  );
}
