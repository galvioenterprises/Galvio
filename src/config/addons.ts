/**
 * Voltas protection plans offered at checkout, at the prices voltas.com
 * sells them for (checked Sep 2026). The plans are issued and serviced
 * by Voltas, not by us: turn this on only once the distributor confirms
 * they can register a plan against each customer's invoice.
 *
 * Shared by the storefront and the Worker, which prices every add-on
 * itself: a plan only applies to the products its rule matches.
 */
export type ProtectionPlan = {
  id: string;
  title: string;
  price: number;
  /** One line shown under the offer. */
  summary: string;
  match: { category: string; subCategory?: string; inverter?: boolean };
};

export const protectionPlansEnabled = false;

export const PROTECTION_PLANS: ProtectionPlan[] = [
  {
    id: "voltas-pp-split-inverter-1y",
    title: "Voltas Protection Plan, 1 year",
    price: 6000,
    summary: "Extends cover after the standard warranty: parts, labour and gas, from Voltas service.",
    match: { category: "Air Conditioner", subCategory: "Split AC", inverter: true },
  },
  {
    id: "voltas-pp-window-1y",
    title: "Voltas Protection Plan, 1 year",
    price: 2600,
    summary: "Extends cover after the standard warranty: parts, labour and gas, from Voltas service.",
    match: { category: "Air Conditioner", subCategory: "Window AC", inverter: false },
  },
  {
    id: "voltas-amc-air-cooler",
    title: "Voltas Comprehensive AMC",
    price: 1700,
    summary: "Annual maintenance with parts and labour, from Voltas service.",
    match: { category: "Air Cooler" },
  },
];

export function planFor(product: { category: string; subCategory?: string | null; inverter?: boolean | null }): ProtectionPlan | undefined {
  if (!protectionPlansEnabled) return undefined;
  return PROTECTION_PLANS.find(
    (plan) =>
      plan.match.category === product.category &&
      (plan.match.subCategory === undefined || plan.match.subCategory === product.subCategory) &&
      (plan.match.inverter === undefined || plan.match.inverter === Boolean(product.inverter)),
  );
}
