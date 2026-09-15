import { site } from "@/config/site";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { ArrowRightIcon, PhoneIcon, WhatsAppIcon } from "../icons";
import { Container } from "../container";

export function ExpertCta() {
  return (
    <section className="pb-24">
      <Container>
      <div className="flex flex-col gap-7 rounded-2xl bg-ink px-10 py-9 text-text-invert sm:flex-row sm:items-center">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <PhoneIcon className="size-6" />
        </span>

        <div className="flex-1">
          <p className="text-[0.8125rem] text-text-invert-muted">
            Need help choosing the right product?
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">Talk to Our Expert</p>
          <p className="mt-1.5 text-sm text-text-invert-muted">
            Get personalised recommendations and the best deals.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={generalEnquiryLink()}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-ink-line bg-ink-soft px-6 text-sm font-medium text-white transition-colors hover:border-white/25"
          >
            <WhatsAppIcon className="size-4" />
            Chat on WhatsApp
            <ArrowRightIcon className="size-4" />
          </a>
          {site.contact.phone && (
            <a
              href={`tel:${site.contact.phone}`}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-medium text-ink"
            >
              <PhoneIcon className="size-4" />
              Call us
            </a>
          )}
        </div>
      </div>
      </Container>
    </section>
  );
}
