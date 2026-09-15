import type { Category } from "@/config/categories";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "../icons";

/**
 * The sizing advice a good salesperson gives across the counter.
 *
 * It sits below the grid rather than above it: someone who already knows
 * what they want should not have to scroll past a lesson to reach the
 * products, and someone who does not will get here by scrolling.
 */
export function BuyingGuide({ category }: { category: Category }) {
  const guide = category.buyingGuide;
  if (!guide) return null;

  return (
    <section
      aria-labelledby="buying-guide"
      className="mt-20 rounded-2xl border border-line bg-surface p-8 lg:p-12"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="eyebrow text-text-muted">Before you buy</p>
          <h2
            id="buying-guide"
            className="mt-3 text-2xl font-semibold tracking-[-0.02em]"
          >
            {guide.title}
          </h2>
          <p className="mt-4 max-w-[52ch] text-[0.9375rem] leading-[1.85] text-text-muted">
            {guide.intro}
          </p>

          <ul className="mt-7 space-y-4">
            {guide.notes.map((note) => (
              <li key={note} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                />
                <span className="text-[0.875rem] leading-[1.75] text-text-muted">
                  {note}
                </span>
              </li>
            ))}
          </ul>

          <a
            href={generalEnquiryLink()}
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl border border-line px-5 text-sm font-medium transition-colors hover:border-line-strong"
          >
            <WhatsAppIcon className="size-4" />
            Still unsure? Ask us
          </a>
        </div>

        <div>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{guide.title}</caption>
            <thead>
              <tr className="border-b border-line">
                {guide.columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="eyebrow pb-3 text-left text-text-muted"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map(([left, right]) => (
                <tr key={left} className="border-b border-line last:border-0">
                  <th scope="row" className="py-4 text-left font-normal text-text-muted">
                    {left}
                  </th>
                  <td className="py-4 font-medium">{right}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-5 text-xs leading-relaxed text-text-faint">
            A guide, not a rule. Tell us the room and how you use it and we
            will give you a straight answer — including when the cheaper model
            is the right one.
          </p>
        </div>
      </div>
    </section>
  );
}
