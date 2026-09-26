"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/nav";
import { ArrowRightIcon, ChevronDownIcon } from "./icons";

type CategoryLink = { slug: string; title: string; productCount: number };

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
  const menuId = useId();
  const [productsMenuPath, setProductsMenuPath] = useState<string | null>(null);
  const productsMenuOpen = productsMenuPath === pathname;

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
          <div
            key={item.label}
            className="relative"
            onMouseEnter={hasMenu ? () => setProductsMenuPath(pathname) : undefined}
            onMouseLeave={hasMenu ? () => setProductsMenuPath(null) : undefined}
            onFocusCapture={hasMenu ? () => setProductsMenuPath(pathname) : undefined}
            onBlurCapture={
              hasMenu
                ? (event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setProductsMenuPath(null);
                    }
                  }
                : undefined
            }
            onKeyDown={
              hasMenu
                ? (event) => {
                    if (event.key === "Escape") {
                      setProductsMenuPath(null);
                      event.currentTarget.querySelector<HTMLAnchorElement>("a")?.focus();
                    }
                  }
                : undefined
            }
          >
            <Link
              href={item.href}
              onClick={hasMenu ? () => setProductsMenuPath(null) : undefined}
              aria-current={active ? "page" : undefined}
              aria-haspopup={hasMenu ? "true" : undefined}
              aria-expanded={hasMenu ? productsMenuOpen : undefined}
              aria-controls={hasMenu ? menuId : undefined}
              className={`flex items-center gap-1 border-b-2 px-3.5 py-[1.15rem] text-[0.9375rem] transition-colors ${
                active
                  ? "border-accent font-medium text-white"
                  : item.highlight
                    ? "border-transparent text-offer hover:brightness-125"
                    : "border-transparent text-text-invert-muted hover:text-white"
              }`}
            >
              {item.label}
              {hasMenu && <ChevronDownIcon className="size-3.5" />}
            </Link>

            {hasMenu && (
              <div
                id={menuId}
                aria-hidden={!productsMenuOpen}
                className={`absolute left-0 top-full z-30 w-72 rounded-xl border border-line bg-surface p-2 shadow-lg transition duration-150 ${
                  productsMenuOpen
                    ? "visible translate-y-0 opacity-100"
                    : "invisible -translate-y-1 opacity-0"
                }`}
              >
                {/* The dropdown is the shortcut to one category; this is
                    the way to the whole catalogue, and it is the same
                    place clicking "Products" goes. */}
                <Link
                  href="/products/"
                  onClick={() => setProductsMenuPath(null)}
                  className="mb-1 flex items-center justify-between gap-3 rounded-lg border-b border-line px-3 py-2.5 text-sm font-medium text-text hover:bg-canvas"
                >
                  All products
                  <ArrowRightIcon className="size-3.5 text-accent" />
                </Link>

                {categories
                  .filter((category) => category.productCount > 0)
                  .map((category) => (
                    <Link
                      key={category.slug}
                      href={`/products/${category.slug}/`}
                      onClick={() => setProductsMenuPath(null)}
                      className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-text hover:bg-canvas"
                    >
                      {category.title}
                      <span className="shrink-0 text-xs text-text-faint">
                        {category.productCount}
                      </span>
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
