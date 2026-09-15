import Link from "next/link";
import { site } from "@/config/site";
import { primaryNav } from "@/config/nav";
import { getPopulatedCategories } from "@/lib/catalog";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { ChevronDownIcon, WhatsAppIcon } from "./icons";
import { SiteSearch } from "./site-search";
import { Container } from "./container";
import { Logo } from "./logo";

/**
 * The Figma header carries an account icon and a cart badge. Phase 1 has
 * neither accounts nor a cart — enquiries go to WhatsApp — so those two
 * controls are replaced by the enquiry button rather than rendered as
 * decoration that does nothing when tapped.
 */
export function SiteHeader() {
  // Built from categories that actually have products, never from config
  // alone — a dropdown that links to an empty category is a 404 waiting
  // for a customer to find it.
  const categoryNav = getPopulatedCategories();

  return (
    <header className="bg-ink text-text-invert">
      <Container className="flex h-20 items-center gap-8">
        <Link href="/" className="shrink-0" aria-label={`${site.shortName} home`}>
          <Logo variant="light" className="h-6" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {primaryNav.map((item) =>
            item.ready ? (
              <div key={item.label} className="group relative">
                <Link
                  href={item.href}
                  className="flex items-center gap-1 rounded-md px-3.5 py-2.5 text-[0.9375rem] text-text-invert-muted transition-colors hover:text-white"
                >
                  {item.label}
                  {item.label === "Products" && (
                    <ChevronDownIcon className="size-3.5" />
                  )}
                </Link>

                {item.label === "Products" && (
                  <div className="invisible absolute left-0 top-full z-20 w-60 rounded-xl border border-line bg-surface p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    {categoryNav.map((c) => (
                      <Link
                        key={c.slug}
                        href={`/products/${c.slug}/`}
                        className="block rounded-lg px-3 py-2.5 text-sm text-text hover:bg-canvas"
                      >
                        {c.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span
                key={item.label}
                title="Coming soon"
                className="cursor-default px-3.5 py-2.5 text-[0.9375rem] text-text-invert-muted/40"
              >
                {item.label}
              </span>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <SiteSearch />

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
