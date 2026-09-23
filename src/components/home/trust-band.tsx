import { heroTrust } from "@/config/hero";
import { Container } from "../container";
import { FigmaIcon } from "../figma-icon";

/**
 * The band between the hero and the category strip.
 *
 * In the previous frame these three claims sat inside the hero. The
 * revised frame gives them their own 86px band and a fourth item, which
 * reads better — they are about the business rather than about whichever
 * slide happens to be showing.
 */
export function TrustBand() {
  return (
    <section aria-label="Why buy from us" className="bg-hero-band text-text-invert">
      <Container className="py-[1.375rem]">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {heroTrust.map(({ icon, title, subtitle }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                <FigmaIcon name={icon} size={18} />
              </span>
              <span>
                <span className="block text-[0.8125rem] font-medium leading-tight text-white">
                  {title}
                </span>
                <span className="mt-0.5 block text-[0.75rem] text-text-invert-muted">
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
