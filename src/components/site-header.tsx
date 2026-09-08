import Link from "next/link";
import { site } from "@/config/site";
import { categoryNav, primaryNav } from "@/config/nav";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { ChevronDownIcon, SearchIcon, WhatsAppIcon } from "./icons";

/**
 * The Figma header carries an account icon and a cart badge. Phase 1 has
 * neither accounts nor a cart — enquiries go to WhatsApp — so those two
 * controls are replaced by the enquiry button rather than rendered as
 * decoration that does nothing when tapped.
 */
export function SiteHeader() {
  return (
    <header className="bg-ink text-text-invert">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5">
        <Link
          href="/"
          className="eyebrow shrink-0 text-[0.95rem] tracking-[0.22em] text-white"
        >
          {site.shortName.toUpperCase()}
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {primaryNav.map((item) =>
            item.ready ? (
              <div key={item.label} className="group relative">
                <Link
                  href={item.href}
                  className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-text-invert-muted transition-colors hover:text-white"
                >
                  {item.label}
                  {item.label === "Products" && (
                    <ChevronDownIcon className="size-3.5" />
                  )}
                </Link>

                {item.label === "Products" && (
                  <div className="invisible absolute left-0 top-full z-20 w-56 rounded-xl border border-line bg-surface p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    {categoryNav.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className="block rounded-lg px-3 py-2 text-sm text-text hover:bg-canvas"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span
                key={item.label}
                title="Coming soon"
                className="cursor-default px-3 py-2 text-sm text-text-invert-muted/45"
              >
                {item.label}
              </span>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden md:block">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-invert-muted" />
            <input
              type="search"
              placeholder="Search products…"
              aria-label="Search products"
              className="h-9 w-56 rounded-lg border border-ink-line bg-ink-soft pl-9 pr-3 text-sm text-white placeholder:text-text-invert-muted focus:border-accent focus:outline-none"
            />
          </div>

          <a
            href={generalEnquiryLink()}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <WhatsAppIcon className="size-4" />
            <span className="hidden sm:inline">Talk to us</span>
          </a>
        </div>
      </div>
    </header>
  );
}
