"use client";

import { useEffect, useState } from "react";

export type TabSection = { id: string; label: string };

/**
 * Sticky section navigation for the product page.
 *
 * The design draws these as tabs, but tabs hide content behind a click,
 * and content behind a click is content Google reads with less weight and
 * a customer never scrolls past. So every section is rendered on the page
 * and these navigate to it — the design's clarity, without paying for it
 * in indexability. Anchors work with JavaScript disabled; the highlight
 * is the only part that needs it.
 */
export function ProductTabs({ sections }: { sections: TabSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // The topmost section currently crossing the band under the sticky
        // bar wins, so the highlight tracks reading position rather than
        // whichever section happened to fire last.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: 0 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav
      aria-label="Product sections"
      className="relative sticky top-[4.75rem] z-20 overflow-hidden rounded-2xl border border-line bg-surface/95 p-1.5 shadow-[0_8px_30px_rgba(17,19,24,0.06)] backdrop-blur after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-surface after:to-transparent sm:after:hidden"
    >
      <ul className="flex snap-x gap-1 overflow-x-auto pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:pr-0">
        {sections.map((section) => (
          <li key={section.id} className="shrink-0 snap-start">
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "true" : undefined}
              className={`inline-flex h-11 items-center whitespace-nowrap rounded-xl px-4 text-sm transition-colors ${
                active === section.id
                  ? "bg-ink font-semibold text-white shadow-sm"
                  : "text-text-muted hover:bg-canvas hover:text-text"
              }`}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
