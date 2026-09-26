"use client";

import { useCart } from "@/lib/cart";
import { useCompare } from "@/lib/local-list";
import { trackCommerceEvent } from "@/lib/analytics";
import { HeartIcon } from "./icons";

/** The heart on a product card: saves it to "Saved items" in this browser. */
export function SaveToggle({ slug, title }: { slug: string; title: string }) {
  const { saved, toggleSaved } = useCart();
  const on = saved.includes(slug);
  return (
    <button
      type="button"
      onClick={() => toggleSaved(slug)}
      aria-pressed={on}
      aria-label={on ? `Remove ${title} from saved items` : `Save ${title}`}
      className={`flex size-11 items-center justify-center rounded-full border bg-white/90 shadow-sm backdrop-blur transition-colors ${
        on ? "border-red-200 text-red-500" : "border-line text-text-muted hover:text-red-500"
      }`}
    >
      <HeartIcon className={`size-[18px] ${on ? "fill-current" : ""}`} />
    </button>
  );
}

/** "Compare" tick on a product card; up to three products. */
export function CompareToggle({ slug }: { slug: string }) {
  const { list, toggle, max } = useCompare();
  const on = list.includes(slug);
  const full = !on && list.length >= max;
  return (
    <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs ${full ? "cursor-not-allowed opacity-50" : "text-text-muted hover:text-text"}`}>
      <input
        type="checkbox"
        checked={on}
        disabled={full}
        onChange={() => {
          if (!on) trackCommerceEvent("select_item", { slug });
          toggle(slug);
        }}
        className="size-4 accent-accent"
      />
      {full ? `Compare (max ${max})` : "Compare"}
    </label>
  );
}
