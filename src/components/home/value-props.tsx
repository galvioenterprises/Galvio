import { FigmaIcon, type FigmaIconName } from "../figma-icon";
import { Container } from "../container";

const PROPS: { icon: FigmaIconName; title: string; subtitle: string }[] = [
  {
    icon: "trust-genuine-light",
    title: "Genuine Products",
    subtitle: "Supplied through an authorised Voltas distributor.",
  },
  {
    icon: "trust-delivery-light",
    title: "Pan-India Delivery",
    subtitle: "Fulfilment is managed by our distributor.",
  },
  {
    icon: "payment-cards",
    title: "Cash on Delivery",
    subtitle: "Pay when your confirmed order reaches you.",
  },
  {
    icon: "support-headset",
    title: "Order Assistance",
    subtitle: "Help choosing a model and completing your order.",
  },
];

export function ValueProps() {
  return (
    <section className="pb-14 sm:pb-16">
      <Container>
      <ul className="grid gap-8 rounded-2xl border border-line bg-surface p-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
        {PROPS.map(({ icon, title, subtitle }) => (
          <li key={title} className="flex gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/8">
              <FigmaIcon name={icon} size={20} />
            </span>
            <span>
              <span className="block text-[0.9375rem] font-semibold leading-snug">
                {title}
              </span>
              <span className="mt-1.5 block text-[0.8125rem] leading-relaxed text-text-muted">
                {subtitle}
              </span>
            </span>
          </li>
        ))}
      </ul>
      </Container>
    </section>
  );
}
