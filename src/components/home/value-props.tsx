import { FigmaIcon, type FigmaIconName } from "../figma-icon";
import { Container } from "../container";

const PROPS: { icon: FigmaIconName; title: string; subtitle: string }[] = [
  {
    icon: "offers-discount",
    title: "Source-backed Listings",
    subtitle: "Only supplied product details are shown.",
  },
  {
    icon: "exchange",
    title: "Clear Catalogue Prices",
    subtitle: "MRP and listed price shown where supplied.",
  },
  {
    icon: "payment-cards",
    title: "Useful Comparisons",
    subtitle: "Compare categories and supplied specifications.",
  },
  {
    icon: "support-headset",
    title: "Showroom Enquiries",
    subtitle: "Confirm current stock and next steps directly.",
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
