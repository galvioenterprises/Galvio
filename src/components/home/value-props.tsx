import { CreditCardIcon, ExchangeIcon, HeadsetIcon, TagIcon } from "../icons";

const PROPS = [
  {
    Icon: TagIcon,
    title: "Best Prices Guaranteed",
    subtitle: "Get the most competitive prices on all products.",
  },
  {
    Icon: ExchangeIcon,
    title: "Easy Exchange Offers",
    subtitle: "Exchange your old appliance for a better one.",
  },
  {
    Icon: CreditCardIcon,
    title: "No Cost EMI Available",
    subtitle: "Flexible EMI options on leading banks and cards.",
  },
  {
    Icon: HeadsetIcon,
    title: "Expert Support",
    subtitle: "We're here to help you choose and to help after you buy.",
  },
];

export function ValueProps() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-14">
      <ul className="grid gap-5 rounded-card border border-line bg-surface p-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {PROPS.map(({ Icon, title, subtitle }) => (
          <li key={title} className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/8 text-accent">
              <Icon className="size-[18px]" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-snug">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-text-muted">
                {subtitle}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
