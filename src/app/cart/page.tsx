import type { Metadata } from "next";
import { site } from "@/config/site";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { CartLines } from "@/components/cart-lines";
import { getAllProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Your Cart",
  description: `Review what you have picked and send it to ${site.name} as one enquiry.`,
  // A per-visitor page with nothing unique to index.
  robots: { index: false, follow: true },
  alternates: { canonical: "/cart/" },
};

export default function CartPage() {
  // Availability travels with this static page instead of being copied
  // into localStorage, so a stock change takes effect on the next deploy.
  const availabilityBySlug = Object.fromEntries(
    getAllProducts().map((product) => [product.slug, product.availability]),
  );

  return (
    <>
      <Breadcrumbs
        size="product"
        trail={[{ label: "Home", href: "/" }, { label: "Cart" }]}
      />

      <Container size="product" className="pb-24 pt-8">
        <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em]">
          Your Cart
        </h1>
        <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-text-muted">
          We do not take payment online. Send this list over and we will come
          back with availability, the best price we can do on the whole order,
          and a delivery date.
        </p>

        <div className="mt-10">
          <CartLines availabilityBySlug={availabilityBySlug} />
        </div>
      </Container>
    </>
  );
}
