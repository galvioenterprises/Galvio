import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { SearchResults } from "@/components/search-results";
import { getAllProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Search",
  // Result pages for arbitrary queries are thin duplicates of listings.
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <>
      <Breadcrumbs size="listing" trail={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <Container size="listing" className="pb-24 pt-6">
        {/* The query is in the URL, which a static page only knows in the browser. */}
        <Suspense>
          <SearchResults products={getAllProducts()} />
        </Suspense>
      </Container>
    </>
  );
}
