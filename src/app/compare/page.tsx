import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { CompareView } from "@/components/compare-view";
import { getAllProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Compare products",
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return (
    <>
      <Breadcrumbs size="listing" trail={[{ label: "Home", href: "/" }, { label: "Compare" }]} />
      <Container size="listing" className="pb-24 pt-6">
        <CompareView products={getAllProducts()} />
      </Container>
    </>
  );
}
