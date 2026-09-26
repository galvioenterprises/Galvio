import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { AcSizeCalculator } from "@/components/ac-size-calculator";
import { getAllProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "AC Size Calculator: Which Tonnage Do I Need?",
  description:
    "Find the right AC tonnage for your room in India. Enter the room size, floor and sunlight, and see matching Voltas split and window ACs.",
  alternates: { canonical: "/ac-size-calculator/" },
};

export default function AcSizePage() {
  const acs = getAllProducts().filter((p) => p.category === "Air Conditioner");
  return (
    <>
      <Breadcrumbs size="product" trail={[{ label: "Home", href: "/" }, { label: "AC size calculator" }]} />
      <Container size="product" className="pb-24 pt-6">
        <AcSizeCalculator products={acs} />
      </Container>
    </>
  );
}
