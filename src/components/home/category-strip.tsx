import Link from "next/link";
import type { Category } from "@/config/categories";
import {
  AirConditionerIcon,
  AirCoolerIcon,
  RefrigeratorIcon,
  TelevisionIcon,
  WashingMachineIcon,
  WaterDispenserIcon,
} from "../icons";

type IconComponent = (props: { className?: string }) => React.ReactElement;

/** Keyed by category slug so a new category picks up its icon by config
 *  alone. Anything unmapped falls back to the box mark. */
const CATEGORY_ICONS: Record<string, IconComponent> = {
  "air-conditioners": AirConditionerIcon,
  refrigerators: RefrigeratorIcon,
  "washing-machines": WashingMachineIcon,
  "air-coolers": AirCoolerIcon,
  "water-dispensers": WaterDispenserIcon,
  televisions: TelevisionIcon,
};

export function CategoryStrip({ categories }: { categories: Category[] }) {
  return (
    <section aria-label="Shop by category" className="relative z-10 -mt-24">
      <div className="mx-auto max-w-[1200px] px-5">
        <ul
          // The desktop column count follows the number of categories so a
          // short list stays centred rather than stretched across six
          // slots. It is applied through a custom property rather than an
          // inline grid-template so it cannot override the mobile columns.
          className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-surface p-4 shadow-[0_8px_40px_rgba(17,19,24,0.10)] sm:grid-cols-3 lg:[grid-template-columns:repeat(var(--category-columns),minmax(0,1fr))]"
          style={
            {
              "--category-columns": Math.min(categories.length, 6),
            } as React.CSSProperties
          }
        >
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? AirConditionerIcon;
            return (
              <li key={category.slug}>
                <Link
                  href={`/products/${category.slug}/`}
                  className="flex flex-col items-center gap-2.5 rounded-xl px-2 py-5 text-center transition-colors hover:bg-canvas"
                >
                  <Icon className="size-7 text-text" />
                  <span className="text-xs font-medium leading-tight">
                    {category.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
