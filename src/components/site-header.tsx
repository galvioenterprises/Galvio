import Link from "next/link";
import { site } from "@/config/site";
import { primaryNav } from "@/config/nav";
import { getAllCategories } from "@/lib/catalog";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./icons";
import { Container } from "./container";
import { Logo } from "./logo";
import { PrimaryNav } from "./primary-nav";
import { SiteSearch } from "./site-search";
import { CartButton } from "./cart-button";

/**
 * The Figma header carries an account icon and a cart badge. Phase 1 has
 * neither accounts nor a cart — enquiries go to WhatsApp — so those two
 * controls are replaced by the enquiry button rather than rendered as
 * decoration that does nothing when tapped.
 */
export function SiteHeader() {
  const categories = getAllCategories().map(({ slug, title, productCount }) => ({
    slug,
    title,
    productCount,
  }));

  return (
    <header className="bg-ink text-text-invert">
      <Container className="flex h-16 items-center gap-8">
        <Link href="/" className="shrink-0" aria-label={`${site.shortName} home`}>
          <Logo variant="light" className="h-6" />
        </Link>

        <PrimaryNav items={primaryNav} categories={categories} />

        <div className="ml-auto flex items-center gap-3">
          <SiteSearch />
          <CartButton />

          <a
            href={generalEnquiryLink()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <WhatsAppIcon className="size-4" />
            <span className="hidden sm:inline">Talk to us</span>
          </a>
        </div>
      </Container>
    </header>
  );
}
