import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { AccountView } from "@/components/account/account-view";
import { getCartProducts } from "@/lib/cart-products";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
  alternates: { canonical: "/account/" },
};

export default function AccountPage() {
  return (
    <>
      <Breadcrumbs size="product" trail={[{ label: "Home", href: "/" }, { label: "My Account" }]} />
      <Container size="product" className="pb-24 pt-6">
        <AccountView products={getCartProducts()} />
      </Container>
    </>
  );
}
