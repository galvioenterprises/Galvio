import { business } from "@/config/business";
import { emiFrom, emiPlans } from "@/lib/emi";
import { formatPrice } from "@/lib/format";

/**
 * "EMI from ₹…/month" with the plans behind a disclosure, as on Amazon and
 * Croma. Figures are indicative; the bank sets the final terms at payment.
 */
export function EmiPlans({ price }: { price: number }) {
  const from = emiFrom(price);
  if (from === null) return null;
  return (
    <details className="group mt-2 text-[0.8125rem]">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-text [&::-webkit-details-marker]:hidden">
        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-accent">EMI</span>
        from <strong>{formatPrice(from)}/month</strong>
        <span className="text-accent underline-offset-2 group-open:hidden hover:underline">View plans</span>
      </summary>
      <div className="mt-3 overflow-hidden rounded-xl border border-line">
        <table className="w-full text-left text-[0.8125rem]">
          <thead className="bg-canvas text-xs text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Tenure</th>
              <th className="px-3 py-2 font-medium">Monthly</th>
              <th className="px-3 py-2 font-medium">Interest</th>
              <th className="px-3 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {emiPlans(price).map((p) => (
              <tr key={p.months}>
                <td className="px-3 py-2">{p.months} months</td>
                <td className="px-3 py-2 font-semibold">{formatPrice(p.monthly)}</td>
                <td className="px-3 py-2 text-text-muted">{formatPrice(p.interest)}</td>
                <td className="px-3 py-2 text-text-muted">{formatPrice(price + p.interest)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-line bg-canvas px-3 py-2 text-xs text-text-muted">
          Indicative at {business.emi.indicativeAnnualRate}% a year on credit cards, debit cards and cardless EMI. You choose the
          bank and tenure when you pay; no-cost EMI shows there if your bank offers it.
        </p>
      </div>
    </details>
  );
}
