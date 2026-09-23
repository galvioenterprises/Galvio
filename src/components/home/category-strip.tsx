import Link from "next/link";
import type { Category } from "@/config/categories";
import { Container } from "../container";
import { FigmaIcon, type FigmaIconName } from "../figma-icon";
import {
  AirConditionerIcon,
  AirPurifierIcon,
  FreezerIcon,
  MicrowaveIcon,
  StabiliserIcon,
  VisiCoolerIcon,
  WaterHeaterIcon,
} from "../icons";

type IconComponent = (props: { className?: string }) => React.ReactElement;

/** Categories the Figma icon set does not cover, drawn inline. */
const FALLBACK_ICONS: Record<string, IconComponent> = {
  "water-heaters": WaterHeaterIcon,
  stabilisers: StabiliserIcon,
  freezers: FreezerIcon,
  "visi-coolers": VisiCoolerIcon,
  "air-purifiers": AirPurifierIcon,
  microwaves: MicrowaveIcon,
};

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
    <section aria-labelledby="shop-by-category" className="relative z-10">
      <Container size="wide" className="!px-0">
        <h2 id="shop-by-category" className="sr-only">
          Shop by category
        </h2>
        {/*
          One row that scrolls, as the frame has it — six visible at 1920
          and the rest a swipe away. A second row would be taller than the
          frame's 156px band and would push the hero up the page, which is
          the thing the band is meant to sit under.
        */}
        <ul className="flex gap-1 overflow-x-auto rounded-t-[2rem] bg-surface px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => {
            const icon = CATEGORY_ICONS[category.slug];
            const Fallback = FALLBACK_ICONS[category.slug] ?? AirConditionerIcon;
            return (
              <li key={category.slug} className="w-[168px] shrink-0 lg:w-[320px]">
                <Link
                  href={`/products/${category.slug}/`}
                  className="group flex flex-col items-center gap-3.5 rounded-2xl px-3 py-6 text-center transition-colors hover:bg-canvas"
                >
                  <span className="flex size-14 items-center justify-center rounded-full bg-canvas transition-colors group-hover:bg-white">
                    {icon ? (
                      <FigmaIcon name={icon} size={32} />
                    ) : (
                      <Fallback className="size-8 text-text" />
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
