/**
 * Merchandising badges the distributor can put on a product from the
 * inventory console (`pnpm admin`).
 *
 * The set follows what Indian appliance retailers use (Croma, Reliance
 * Digital, Amazon, Flipkart, voltas.com). "Top Rated" is deliberately
 * absent: without real reviews it would mislead buyers and break Google's
 * rules for review markup.
 *
 * A card shows one badge, the first in this order; the product page shows
 * all of them.
 */
export const BADGES = {
  bestseller: { label: "Bestseller", className: "bg-amber-400 text-amber-950" },
  "hot-deal": { label: "Hot Deal", className: "bg-red-600 text-white" },
  "new-launch": { label: "New Launch", className: "bg-accent text-white" },
  trending: { label: "Trending", className: "bg-violet-600 text-white" },
  "our-pick": { label: "Our Pick", className: "bg-ink text-white" },
} as const;

export type BadgeId = keyof typeof BADGES;
export const BADGE_IDS = Object.keys(BADGES) as [BadgeId, ...BadgeId[]];
