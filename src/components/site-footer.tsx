import Link from "next/link";
import { site } from "@/config/site";
import { categoryNav, footerNav } from "@/config/nav";
import { MailIcon, PhoneIcon, PinIcon } from "./icons";

function formatAddress() {
  const { street, locality, region, postalCode } = site.address;
  return [street, locality, region, postalCode].filter(Boolean).join(", ");
}

export function SiteFooter() {
  const address = formatAddress();
  // The contact column is omitted until the business details are filled in
  // — an empty heading reads as a broken page, not as pending content.
  const hasContact = Boolean(site.contact.phone || site.contact.email || address);

  return (
    <footer className="bg-ink text-text-invert-muted">
      <div className="mx-auto max-w-[1200px] px-5 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:pr-8">
            <p className="eyebrow text-[0.8rem] tracking-[0.2em] text-white">
              {site.name.toUpperCase()}
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
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
                    <a href={`tel:${site.contact.phone}`} className="hover:text-white">
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

        <nav aria-label="Categories" className="mt-10 border-t border-ink-line pt-6">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {categoryNav.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="transition-colors hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-ink-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p className="text-text-invert-muted/60">
            Privacy Policy · Terms &amp; Conditions
          </p>
        </div>
      </div>
    </footer>
  );
}
