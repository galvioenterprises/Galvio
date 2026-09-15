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
      className="sticky top-0 z-20 border-y border-line bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-[1304px] gap-1 px-5 sm:px-8 overflow-x-auto">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "true" : undefined}
              className={`inline-block whitespace-nowrap border-b-2 px-3 py-3.5 text-sm transition-colors ${
                active === section.id
                  ? "border-accent font-medium text-text"
                  : "border-transparent text-text-muted hover:text-text"
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
