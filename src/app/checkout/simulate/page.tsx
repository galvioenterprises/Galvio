import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { SimulatedPayment } from "@/components/checkout/simulated-payment";
import { business } from "@/config/business";

export const metadata: Metadata = {
  title: "Test payment",
  robots: { index: false, follow: false },
};

/** Development only: stands in for Cashfree when no keys are configured.
 *  In production the API refuses the simulated result. */
export default function SimulatePage() {
  // Keep the gateway test harness in the repository for the later payment
  // phase, but do not expose it during the COD-only launch.
  if (!business.onlinePayments) notFound();

  return (
    <Container size="product" className="pb-24 pt-16">
      <Suspense>
        <SimulatedPayment />
      </Suspense>
    </Container>
  );
}
