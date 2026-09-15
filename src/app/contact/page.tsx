import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import {
  ArrowRightIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  WhatsAppIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Talk to ${site.name} about a product, an order, a warranty claim or a bulk enquiry. WhatsApp, phone, email, or visit the showroom.`,
  alternates: { canonical: "/contact/" },
};

const REASONS = [
  {
    title: "Choosing a product",
    body: "Tell us the room size, who uses it and your budget. We will narrow it to two or three and explain the difference.",
  },
  {
    title: "An existing order",
    body: "Have your invoice number ready and we can tell you exactly where the appliance is.",
  },
  {
    title: "Warranty or service",
    body: "Send us the invoice number and a photograph or short video of the fault. We raise the claim and follow it for you.",
  },
  {
    title: "Bulk and projects",
    body: "Builder handovers, offices, hotels and institutions. Tell us the quantity and timeline and we will quote the project.",
  },
];

export default function ContactPage() {
  const { street, locality, region, postalCode } = site.address;
  const address = [street, locality, region, postalCode].filter(Boolean).join(", ");

  return (
    <>
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Contact Us" }]} />

      <PageHeader
        eyebrow="Contact"
        title="Talk to a person"
        intro="No ticket queue and no chatbot. Message us and someone who knows the stock will answer."
      />

      <Container className="pb-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href={generalEnquiryLink()}
            className="group flex flex-col justify-between rounded-2xl bg-ink p-7 text-text-invert transition-colors hover:bg-ink-soft"
          >
            <div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-white">
                <WhatsAppIcon className="size-5" />
              </span>
              <p className="mt-4 text-[0.9375rem] font-semibold text-white">
                WhatsApp
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-text-invert-muted">
                The fastest way to reach us. Send a photo of the model or the
                space and we will come back with options.
              </p>
            </div>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-white">
              Start a chat
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>

          <div className="rounded-2xl border border-line bg-surface p-7">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent/8 text-accent">
              <PhoneIcon className="size-5" />
            </span>
            <p className="mt-4 text-[0.9375rem] font-semibold">Phone</p>
            {site.contact.phone ? (
              <a
                href={`tel:${site.contact.phone}`}
                className="mt-1.5 block text-sm font-medium text-accent"
              >
                {site.contact.phone}
              </a>
            ) : (
              <p className="mt-1.5 text-[0.8125rem] text-text-muted">
                Phone number coming shortly — WhatsApp reaches us in the meantime.
              </p>
            )}
            <ul className="mt-4 space-y-1 text-[0.8125rem] text-text-muted">
              {business.hours.map((slot) => (
                <li key={slot.days} className="flex justify-between gap-3">
                  <span>{slot.days}</span>
                  <span className="text-text">{slot.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-7">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent/8 text-accent">
              <MailIcon className="size-5" />
            </span>
            <p className="mt-4 text-[0.9375rem] font-semibold">Email</p>
            {site.contact.email ? (
              <a
                href={`mailto:${site.contact.email}`}
                className="mt-1.5 block break-all text-sm font-medium text-accent"
              >
                {site.contact.email}
              </a>
            ) : (
              <p className="mt-1.5 text-[0.8125rem] text-text-muted">
                Email address coming shortly.
              </p>
            )}
            <p className="mt-4 text-[0.8125rem] leading-relaxed text-text-muted">
              Best for quotations, purchase orders and anything that needs a
              paper trail.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              What are you contacting us about?
            </h2>
            <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-text-muted">
              Including this in your first message saves a round trip.
            </p>

            <ul className="mt-7 grid gap-4 sm:grid-cols-2">
              {REASONS.map((reason) => (
                <li key={reason.title} className="rounded-2xl border border-line bg-surface p-6">
                  <p className="text-[0.9375rem] font-semibold">{reason.title}</p>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-muted">
                    {reason.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <aside className="rounded-2xl border border-line bg-surface p-7">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent/8 text-accent">
              <PinIcon className="size-5" />
            </span>
            <p className="mt-4 text-[0.9375rem] font-semibold">Visit the showroom</p>
            {address ? (
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-muted">
                {address}
              </p>
            ) : (
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-muted">
                Showroom address coming shortly.
              </p>
            )}
            <p className="mt-4 text-[0.8125rem] leading-relaxed text-text-muted">
              Appliances are set up and running, so you can hear how loud an
              air conditioner actually is before you commit to it.
            </p>
            <Link
              href="/stores/"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              Store details & hours
              <ArrowRightIcon className="size-4" />
            </Link>
          </aside>
        </div>
      </Container>
    </>
  );
}
