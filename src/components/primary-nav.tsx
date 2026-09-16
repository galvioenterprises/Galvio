"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/nav";
import { ChevronDownIcon } from "./icons";

type CategoryLink = { slug: string; title: string };

/**
 * Main navigation.
 *
 * A client component only so the current section can be underlined the
 * way the design shows it — knowing which link is active needs the
 * pathname, and a static export has no server request to read it from.
 */
export function PrimaryNav({
  items,
  categories,
}: {
  items: NavItem[];
  categories: CategoryLink[];
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    // "/products/" should stay lit on a product page too, otherwise the
    // trail goes dark the moment someone opens something.
    if (href === "/products/") return pathname.startsWith("/product");
    return pathname.startsWith(href);
  }

  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
      {items.map((item) => {
        if (!item.ready) {
          return (
            <span
              key={item.label}
              title="Coming soon"
              className="cursor-default px-3.5 py-2.5 text-[0.9375rem] text-text-invert-muted/40"
            >
              {item.label}
            </span>
          );
        }

        const active = isActive(item.href);
        const hasMenu = item.label === "Products";

        return (
          <div key={item.label} className="group relative">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1 border-b-2 px-3.5 py-[1.15rem] text-[0.9375rem] transition-colors ${
                active
                  ? "border-accent font-medium text-white"
                  : "border-transparent text-text-invert-muted hover:text-white"
              }`}
            >
              {item.label}
              {hasMenu && <ChevronDownIcon className="size-3.5" />}
            </Link>

            {hasMenu && (
              <div className="invisible absolute left-0 top-full z-30 w-60 rounded-xl border border-line bg-surface p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/products/${category.slug}/`}
                    className="block rounded-lg px-3 py-2.5 text-sm text-text hover:bg-canvas"
                  >
                    {category.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
