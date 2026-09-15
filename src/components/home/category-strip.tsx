import Link from "next/link";
import type { Category } from "@/config/categories";
import { Container } from "../container";
import { FigmaIcon, type FigmaIconName } from "../figma-icon";
import { AirConditionerIcon } from "../icons";

/** Keyed by category slug so a new category picks up its icon by config
 *  alone. A category with no artwork yet falls back to the inline mark. */
const CATEGORY_ICONS: Record<string, FigmaIconName> = {
  "air-conditioners": "category-air-conditioners",
  refrigerators: "category-refrigerators",
  "washing-machines": "category-washing-machines",
  "air-coolers": "category-air-coolers",
  "water-dispensers": "category-water-dispensers",
  televisions: "category-televisions",
};

export function CategoryStrip({ categories }: { categories: Category[] }) {
  return (
    <section aria-label="Shop by category" className="relative z-10 -mt-32">
      <Container wide>
        <ul
          // The desktop column count follows the number of categories so a
          // short list stays centred rather than stretched across six
          // slots. It is applied through a custom property rather than an
          // inline grid-template so it cannot override the mobile columns.
          className="grid grid-cols-2 gap-1 rounded-[1.75rem] border border-line bg-surface px-4 py-3 shadow-[0_12px_50px_rgba(17,19,24,0.10)] sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--category-columns),minmax(0,1fr))]"
          style={
            {
              "--category-columns": Math.min(categories.length, 6),
            } as React.CSSProperties
          }
        >
          {categories.map((category) => {
            const icon = CATEGORY_ICONS[category.slug];
            return (
              <li key={category.slug}>
                <Link
                  href={`/products/${category.slug}/`}
                  className="group flex flex-col items-center gap-3.5 rounded-2xl px-3 py-8 text-center transition-colors hover:bg-canvas"
                >
                  <span className="flex size-14 items-center justify-center rounded-full bg-canvas transition-colors group-hover:bg-white">
                    {icon ? (
                      <FigmaIcon name={icon} size={28} />
                    ) : (
                      <AirConditionerIcon className="size-7 text-text" />
                    )}
                  </span>
                  <span className="text-[0.9375rem] font-medium leading-tight">
                    {category.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
