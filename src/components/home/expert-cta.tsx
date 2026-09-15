import { site } from "@/config/site";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { ArrowRightIcon, PhoneIcon, WhatsAppIcon } from "../icons";

export function ExpertCta() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-16">
      <div className="flex flex-col gap-6 rounded-card bg-ink px-7 py-7 text-text-invert sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <PhoneIcon className="size-5" />
        </span>

        <div className="flex-1">
          <p className="text-xs text-text-invert-muted">
            Need help choosing the right product?
          </p>
          <p className="mt-0.5 text-xl font-semibold text-white">Talk to Our Expert</p>
          <p className="mt-1 text-sm text-text-invert-muted">
            Get personalised recommendations and the best deals.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={generalEnquiryLink()}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-line bg-ink-soft px-5 text-sm font-medium text-white transition-colors hover:border-white/25"
          >
            <WhatsAppIcon className="size-4" />
            Chat on WhatsApp
            <ArrowRightIcon className="size-4" />
          </a>
          {site.contact.phone && (
            <a
              href={`tel:${site.contact.phone}`}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-medium text-ink"
            >
              <PhoneIcon className="size-4" />
              Call us
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
