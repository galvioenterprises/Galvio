import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import {
  ArrowRightIcon,
  BadgeIcon,
  BoxIcon,
  CheckIcon,
  CreditCardIcon,
  HeadsetIcon,
  TruckIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "About Us",
  description: `${site.name} sells genuine ${business.primaryBrand} and Voltas Beko appliances supplied by an authorised distributor, delivered across India with Cash on Delivery.`,
  alternates: { canonical: "/about/" },
};

/** The order journey is the story: it is the one thing a marketplace
 *  listing cannot say about itself. */
const JOURNEY = [
  { Icon: BoxIcon, title: "You place the order", body: "Pick a product and place a Cash on Delivery order. No online payment is taken." },
  { Icon: HeadsetIcon, title: "We confirm by phone", body: "We call to confirm stock, the final price and delivery date with you." },
  { Icon: TruckIcon, title: "Dispatched direct", body: "Shipped from the authorised distributor's stock, not a reseller's." },
  { Icon: CreditCardIcon, title: "Pay on delivery", body: "It arrives, you check it, you pay. Installation is coordinated." },
];

const DIRECT = [
  "Stock that comes through the authorised distribution channel, not an unknown seller.",
  "The full manufacturer warranty, with an invoice you can claim against.",
  "Someone to call before you buy and after it is installed.",
  "Cash on Delivery, so you pay only once the product is in front of you.",
];

const PRINCIPLES = [
  {
    title: "Clear prices",
    body: "MRP, our price and what you save, shown upfront on every product. No price that only appears at the end.",
  },
  {
    title: "Straight answers",
    body: "If a smaller or cheaper model suits your room better, we will say so — even when it earns us less.",
  },
  {
    title: "One point of contact",
    body: "From choosing to delivery to a warranty question later, you deal with us rather than being passed around.",
  },
];

export default function AboutPage() {
  const { street, locality, region, postalCode } = site.address;
  const address = [street, locality, region, postalCode].filter(Boolean).join(", ");

  // Only facts the business has confirmed. A blank row is left out rather
  // than filled with a placeholder that reads like a fact.
  const facts = [
    ["Business", site.legalName],
    business.foundedYear ? ["Since", String(business.foundedYear)] : null,
    ["Brands", `${business.primaryBrand}, Voltas Beko`],
    business.nationwideDelivery ? ["Delivery", "Across India"] : null,
    business.cashOnDelivery ? ["Payment", "Cash on Delivery"] : null,
    business.gstin ? ["GSTIN", business.gstin] : null,
    address ? ["Address", address] : null,
    ["Email", site.contact.email],
  ].filter(Boolean) as [string, string][];

  return (
    <>
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "About Us" }]} />

      {/* Editorial opening: type does the work, not another dark card. */}
      <section className="py-16 lg:py-24">
        <Container>
          <p className="eyebrow text-accent">About Galvio</p>
          <h1 className="mt-5 max-w-[18ch] text-[2.5rem] font-semibold leading-[1.05] tracking-tight sm:text-[3.25rem] lg:text-[4rem]">
            Genuine appliances, sold straight from the source.
          </h1>
          <div className="mt-10 grid gap-8 border-t border-line pt-10 lg:grid-cols-2">
            <p className="text-lg leading-[1.7] text-text">
              {site.name} sells {business.primaryBrand} and Voltas Beko appliances and delivers them to your
              door anywhere in India.
            </p>
          </div>
        </Container>
      </section>

      {/* How an order moves. */}
      <section className="bg-ink py-20 text-text-invert">
        <Container>
          <p className="eyebrow text-accent">How it works</p>
          <h2 className="mt-3 max-w-xl text-[2rem] font-semibold leading-tight tracking-[-0.02em]">
            From our site to your home, in four steps
          </h2>
          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {JOURNEY.map(({ Icon, title, body }, i) => (
              <li key={title} className="relative">
                {i < JOURNEY.length - 1 && (
                  <span aria-hidden className="absolute left-14 right-0 top-6 hidden h-px bg-linear-to-r from-ink-line to-transparent lg:block" />
                )}
                <span className="relative flex size-12 items-center justify-center rounded-2xl border border-ink-line bg-ink-soft text-accent">
                  <Icon className="size-5" />
                </span>
                <p className="mt-6 text-xs font-medium text-text-invert-muted">Step {i + 1}</p>
                <p className="mt-1 text-lg font-semibold text-white">{title}</p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-invert-muted">{body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Why buying direct matters. */}
      <section className="py-20 lg:py-24">
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <BadgeIcon className="size-8 text-accent" />
            <h2 className="mt-5 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">
              What buying direct means for you
            </h2>
            <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-text-muted">
              An appliance is a ten-year purchase. Where it comes from matters
              as much as the price on the day.
            </p>
          </div>
          <ul className="space-y-5">
            {DIRECT.map((point) => (
              <li key={point} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                  <CheckIcon className="size-3.5" />
                </span>
                <span className="text-[0.9375rem] leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* What we hold ourselves to. */}
      <section className="border-y border-line bg-surface py-20">
        <Container>
          <p className="eyebrow text-accent">What we stand for</p>
          <ul className="mt-10 grid gap-12 lg:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title}>
                <span className="text-[3rem] font-semibold leading-none tracking-tight text-line-strong">
                  0{i + 1}
                </span>
                <p className="mt-5 text-xl font-semibold">{p.title}</p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Facts and a way forward. */}
      <section className="py-20">
        <Container className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="rounded-2xl border border-line bg-surface p-8 lg:p-10">
            <p className="text-xl font-semibold">At a glance</p>
            <dl className="mt-6 divide-y divide-line text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3.5">
                  <dt className="text-text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex flex-col justify-between rounded-2xl bg-ink p-8 text-text-invert lg:p-10">
            <div>
              <p className="text-2xl font-semibold leading-snug text-white">
                Ready to find the right appliance?
              </p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-text-invert-muted">
                Browse the range with clear prices, or tell us what you need and
                we will recommend a model.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products/"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Shop products
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/bulk-orders/"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 px-6 text-sm font-medium text-white transition-colors hover:border-white/30"
              >
                Bulk orders
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
