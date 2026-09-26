import Link from "next/link";
import { site } from "@/config/site";
import { primaryNav } from "@/config/nav";
import { getAllCategories } from "@/lib/catalog";
import { Container } from "./container";
import { Logo } from "./logo";
import { PrimaryNav } from "./primary-nav";
import { SiteSearch } from "./site-search";
import { CartButton } from "./cart-button";
import { AccountButton } from "./account-button";
import { CartFeedback } from "./cart-feedback";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  const categories = getAllCategories().map(({ slug, title, productCount }) => ({
    slug,
    title,
    productCount,
  }));

  return (
    <header className="sticky top-0 z-40 bg-ink text-text-invert shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <Container className="flex h-16 items-center gap-3 lg:gap-8">
        <Link href="/" className="shrink-0" aria-label={`${site.shortName} home`}>
          <Logo variant="light" className="h-6" />
        </Link>

        <PrimaryNav items={primaryNav} categories={categories} />

        <div className="ml-auto flex items-center gap-1 sm:gap-2 lg:gap-3">
          <SiteSearch />
          <AccountButton />
          <CartButton />
          <CartFeedback />

          <MobileNav items={primaryNav} categories={categories} />
        </div>
      </Container>
    </header>
  );
}
