"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/nav";
import { ChevronDownIcon } from "./icons";

type CategoryLink = { slug: string; title: string; productCount: number };

function MenuIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="size-5">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden className="size-5">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function MobileNav({
  items,
  categories,
}: {
  items: NavItem[];
  categories: CategoryLink[];
}) {
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="flex size-10 items-center justify-center rounded-lg text-text-invert-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <MenuIcon open={open} />
      </button>

      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 bottom-0 top-16 z-40 cursor-default bg-black/45"
          />
          <nav
            id={panelId}
            aria-label="Mobile main navigation"
            className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-ink-line bg-ink px-5 pb-8 pt-4 shadow-2xl sm:px-8"
          >
            <ul className="divide-y divide-ink-line">
              {items.map((item) => {
                const isProducts = item.label === "Products";
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href) ||
                      (item.href === "/products/" && pathname.startsWith("/product/"));

                if (!item.ready) {
                  return (
                    <li key={item.label} className="flex items-center justify-between py-4 text-sm text-text-invert-muted/45">
                      <span>{item.label}</span>
                      <span className="text-[0.6875rem] uppercase tracking-[0.12em]">Coming soon</span>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex-1 py-4 text-base font-medium ${
                          active
                            ? "text-white"
                            : item.highlight
                              ? "text-offer"
                              : "text-text-invert-muted"
                        }`}
                      >
                        {item.label}
                      </Link>
                      {isProducts && (
                        <button
                          type="button"
                          aria-expanded={productsOpen}
                          aria-label={productsOpen ? "Hide product categories" : "Show product categories"}
                          onClick={() => setProductsOpen((value) => !value)}
                          className="flex size-11 items-center justify-center rounded-lg text-text-invert-muted hover:bg-white/5 hover:text-white"
                        >
                          <ChevronDownIcon className={`size-4 transition-transform ${productsOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>

                    {isProducts && productsOpen && (
                      <ul className="grid gap-1 pb-4 sm:grid-cols-2">
                        {categories.map((category) => (
                          <li key={category.slug}>
                            <Link
                              href={`/products/${category.slug}/`}
                              onClick={() => setOpen(false)}
                              className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5 text-sm text-text-invert-muted hover:bg-white/[0.08] hover:text-white"
                            >
                              {category.title}
                              <span className="text-xs text-text-invert-muted/60">
                                {category.productCount > 0 ? category.productCount : "Soon"}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}
