import { business } from "@/config/business";

/** Standard reducing-balance instalment, rounded up to the rupee. */
export function monthlyInstalment(principal: number, months: number, annualRate = business.emi.indicativeAnnualRate): number {
  const r = annualRate / 12 / 100;
  if (r === 0) return Math.ceil(principal / months);
  const factor = (1 + r) ** months;
  return Math.ceil((principal * r * factor) / (factor - 1));
}

/** The smallest instalment we show ("EMI from ₹…/month"), or null below the EMI minimum. */
export function emiFrom(price: number): number | null {
  if (price < business.emi.minOrder) return null;
  const longest = Math.max(...business.emi.tenures);
  return monthlyInstalment(price, longest);
}

export function emiPlans(price: number) {
  return business.emi.tenures.map((months) => {
    const monthly = monthlyInstalment(price, months);
    return { months, monthly, interest: monthly * months - price };
  });
}
