import Link from "next/link";
import { site } from "@/config/site";
import { footerNav } from "@/config/nav";
import { getAllCategories } from "@/lib/catalog";
import { MailIcon, PhoneIcon, PinIcon } from "./icons";
import { Container } from "./container";
import { Logo } from "./logo";

function formatAddress() {
  const { street, locality, region, postalCode } = site.address;
  return [street, locality, region, postalCode].filter(Boolean).join(", ");
}

export function SiteFooter() {
  const address = formatAddress();
  // The contact column is omitted until the business details are filled in
  // — an empty heading reads as a broken page, not as pending content.
  const hasContact = Boolean(site.contact.phone || site.contact.email || address);
  const categoryNav = getAllCategories();

  return (
    <footer className="bg-ink text-text-invert-muted">
      <Container className="py-20">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-8">
            <Logo variant="light" className="h-6" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed">
              Your trusted destination for premium electronics and home
              appliances.
            </p>
          </div>

          {Object.entries(footerNav).map(([heading, items]) => (
            <div key={heading}>
              <h2 className="text-sm font-semibold text-white">{heading}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {items.map((item) => (
                  <li key={item.label}>
                    {item.ready ? (
                      <Link href={item.href} className="transition-colors hover:text-white">
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-text-invert-muted/45">{item.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {hasContact && (
            <div>
              <h2 className="text-sm font-semibold text-white">Contact Us</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {site.contact.phone && (
                  <li className="flex gap-2.5">
                    <PhoneIcon className="mt-0.5 size-4 shrink-0" />
                    <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="hover:text-white">
                      {site.contact.phone}
                    </a>
                  </li>
              )}
              {site.contact.email && (
                <li className="flex gap-2.5">
                  <MailIcon className="mt-0.5 size-4 shrink-0" />
                  <a href={`mailto:${site.contact.email}`} className="hover:text-white">
                    {site.contact.email}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex gap-2.5">
                  <PinIcon className="mt-0.5 size-4 shrink-0" />
                  <span>{address}</span>
                </li>
              )}
              </ul>
            </div>
          )}
        </div>

        <nav aria-label="Categories" className="mt-14 border-t border-ink-line pt-7">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {categoryNav.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/products/${c.slug}/`}
                  className="transition-colors hover:text-white"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <div className="border-t border-ink-line">
        <Container className="flex flex-col gap-3 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p className="flex gap-4">
            <Link href="/policies/privacy/" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/policies/terms/" className="transition-colors hover:text-white">
              Terms &amp; Conditions
            </Link>
          </p>
        </Container>
      </div>
    </footer>
  );
}
