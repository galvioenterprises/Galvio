"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [productsOpenPath, setProductsOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const productsOpen = productsOpenPath === pathname;
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  function closeMenu() {
    setOpenPath(null);
    setProductsOpenPath(null);
  }

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const dialog = dialogRef.current;
    const inerted: HTMLElement[] = [];

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Make every branch outside this menu unavailable to assistive technology
    // while the modal navigation is open. The trigger stays visible but leaves
    // the tab order until focus is restored on close.
    let branch: HTMLElement | null = rootRef.current;
    while (branch?.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement && !sibling.inert) {
          sibling.inert = true;
          inerted.push(sibling);
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }

    document.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => {
      dialog
        ?.querySelector<HTMLElement>('a[href], button:not([disabled]):not([tabindex="-1"])')
        ?.focus();
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      for (const element of inerted) element.inert = false;
      window.requestAnimationFrame(() => trigger?.focus());
    };
  }, [open]);

  return (
    <div ref={rootRef} className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        tabIndex={open ? -1 : undefined}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => {
          if (open) closeMenu();
          else setOpenPath(pathname);
        }}
        className="flex size-10 items-center justify-center rounded-lg text-text-invert-muted transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <MenuIcon open={open} />
      </button>

      {open && (
        <div
          ref={dialogRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 top-16 z-40"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 cursor-default bg-black/45"
          />
          <nav
            aria-label="Mobile main navigation"
            className="absolute inset-x-0 top-0 z-10 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-ink-line bg-ink px-5 pb-8 pt-4 shadow-2xl sm:px-8"
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
                        onClick={closeMenu}
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
                          onClick={() =>
                            setProductsOpenPath(productsOpen ? null : pathname)
                          }
                          className="flex size-11 items-center justify-center rounded-lg text-text-invert-muted hover:bg-white/5 hover:text-white"
                        >
                          <ChevronDownIcon className={`size-4 transition-transform ${productsOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>

                    {isProducts && productsOpen && (
                      <ul className="grid gap-1 pb-4 sm:grid-cols-2">
                        {categories
                          .filter((category) => category.productCount > 0)
                          .map((category) => (
                          <li key={category.slug}>
                            <Link
                              href={`/products/${category.slug}/`}
                              onClick={closeMenu}
                              className="flex min-h-11 items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5 text-sm text-text-invert-muted hover:bg-white/[0.08] hover:text-white"
                            >
                              {category.title}
                              <span className="text-xs text-text-invert-muted/60">
                                {category.productCount}
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
        </div>
      )}
    </div>
  );
}
