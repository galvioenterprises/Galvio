import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { getPopulatedCategories } from "@/lib/catalog";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { BulkEnquiryForm } from "@/components/bulk-enquiry-form";
import { FaqSection } from "@/components/faq-section";
import {
  ArrowRightIcon,
  BedIcon,
  BriefcaseIcon,
  BuildingIcon,
  CheckIcon,
  HospitalIcon,
  ReceiptIcon,
  SchoolIcon,
  StoreIcon,
  TagIcon,
  TruckIcon,
  WrenchIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: `Bulk & Corporate Orders — ${business.primaryBrand} Appliances`,
  description: `Bulk ${business.primaryBrand} air conditioners, refrigerators and appliances for builders, offices, hotels and institutions. Model-wise quotes, delivery across India.`,
  alternates: { canonical: "/bulk-orders/" },
};

/** Who buys in volume, and what they typically need. Specific enough that
 *  a facilities manager recognises their own situation in one line. */
const BUYERS = [
  { Icon: BuildingIcon, title: "Builders & developers", body: "Air conditioners and appliances for handovers, fitted before possession." },
  { Icon: BriefcaseIcon, title: "Offices & corporates", body: "Cooling, water dispensers and pantry appliances for new or expanding floors." },
  { Icon: BedIcon, title: "Hotels & hospitality", body: "Room ACs and refrigeration specified room by room, replaced in phases." },
  { Icon: HospitalIcon, title: "Hospitals & clinics", body: "Reliable cooling and water dispensers for wards, OPDs and staff areas." },
  { Icon: SchoolIcon, title: "Schools & institutions", body: "Classroom and hostel cooling, water coolers and common-area appliances." },
  { Icon: StoreIcon, title: "Dealers & resellers", body: "Stock for your own counter, sourced through the distribution channel." },
];

const BENEFITS = [
  { Icon: TagIcon, title: "Distributor pricing", body: "Quoted model by model on the whole order — not a retail price with a coupon on top." },
  { Icon: ReceiptIcon, title: "Proper invoicing", body: "Share your GSTIN and the quote confirms the invoicing your accounts team needs." },
  { Icon: TruckIcon, title: "Delivered across India", body: "Dispatched through the distributor network to your site, with dates agreed up front." },
  { Icon: WrenchIcon, title: "Installation coordinated", body: "Installation for ACs and similar appliances arranged through the authorised network." },
];

const STEPS = [
  { title: "Tell us what you need", body: "Models or just the requirement — room sizes, quantity, location. Rough is fine." },
  { title: "Get a model-wise quote", body: "Pricing, availability and delivery dates for your location, in writing." },
  { title: "Confirm and schedule", body: "Agree terms, lock the dispatch date, and we coordinate delivery and installation." },
];

const FAQS = [
  {
    question: "Is there a minimum order quantity?",
    answer:
      "There is no fixed minimum to enquire. Tell us the quantity and the models, and the quote will show the pricing that applies at that volume.",
  },
  {
    question: "Can one order cover different products?",
    answer:
      "Yes. A single enquiry can mix categories — air conditioners for the rooms, a water dispenser for the pantry, refrigerators for the staff area. We quote it as one order.",
  },
  {
    question: "Do you deliver outside my city?",
    answer:
      "Yes. Orders are dispatched across India through the distributor network. Your quote confirms the delivery date for your specific location before you commit.",
  },
  {
    question: "Is installation included?",
    answer:
      "Installation for air conditioners and similar appliances is coordinated through the manufacturer's authorised network. The quote states exactly what is included for each model.",
  },
  {
    question: "Will I get an invoice my business can use?",
    answer:
      "Include your GSTIN in the enquiry. The quote confirms the invoicing for your order so your accounts team knows what to expect.",
  },
  {
    question: "How is a bulk order paid for?",
    answer:
      "Payment terms for bulk orders are agreed in the quote and depend on the order size. Nothing is payable until you have confirmed the quote.",
  },
];

export default function BulkOrdersPage() {
  const categories = getPopulatedCategories();

  return (
    <>
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Bulk Orders" }]} />

      {/* Hero: the form is above the fold. Anyone who has reached this page
          already knows why they are here — the job is to take the enquiry,
          not to persuade them to make one. */}
      <section className="relative overflow-hidden bg-canvas">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 size-[36rem] rounded-full bg-accent/[0.06] blur-3xl"
        />
        <Container className="relative grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:py-20">
          <div>
            <p className="eyebrow text-accent">Bulk & corporate orders</p>
            <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[2.75rem] lg:text-[3.25rem]">
              Buying ten or more?
              <br />
              <span className="text-text-muted">Buy it direct.</span>
            </h1>
            <p className="mt-6 max-w-[46ch] text-base leading-[1.7] text-text-muted">
              {business.primaryBrand} air conditioners, refrigerators and appliances in
              volume — for sites, offices, hotels and institutions. One
              model-wise quote, delivery across India, installation coordinated.
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Quote on the whole order",
                "Mixed models in one order",
                "Delivered to your site",
                "Genuine, manufacturer-warranted stock",
              ].map((point) => (
                <li key={point} className="flex items-center gap-2.5 text-[0.9375rem]">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                    <CheckIcon className="size-3" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div id="quote" className="scroll-mt-24">
            <BulkEnquiryForm categories={categories.map((c) => c.title)} />
          </div>
        </Container>
      </section>

      {/* Who we supply — lets a buyer self-identify in a glance. */}
      <section className="bg-ink py-20 text-text-invert">
        <Container>
          <div className="max-w-2xl">
            <p className="eyebrow text-accent">Who we supply</p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">
              Built for projects, not single purchases
            </h2>
          </div>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-ink-line bg-ink-line sm:grid-cols-2 lg:grid-cols-3">
            {BUYERS.map(({ Icon, title, body }) => (
              <li key={title} className="bg-ink p-7 transition-colors hover:bg-ink-soft">
                <Icon className="size-6 text-accent" />
                <p className="mt-5 text-[0.9375rem] font-semibold text-white">{title}</p>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-invert-muted">{body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Why here, and how it runs. */}
      <section className="py-20">
        <Container>
          <div className="grid gap-16 lg:grid-cols-2">
            <div>
              <p className="eyebrow text-accent">Why order through us</p>
              <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">
                What you get on a bulk order
              </h2>
              <ul className="mt-10 grid gap-8 sm:grid-cols-2">
                {BENEFITS.map(({ Icon, title, body }) => (
                  <li key={title}>
                    <span className="flex size-11 items-center justify-center rounded-xl bg-accent/[0.08] text-accent">
                      <Icon className="size-5" />
                    </span>
                    <p className="mt-4 text-[0.9375rem] font-semibold">{title}</p>
                    <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-text-muted">{body}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-8 lg:p-10">
              <p className="eyebrow text-text-muted">How it works</p>
              <ol className="mt-8 space-y-0">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="relative flex gap-5 pb-9 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span aria-hidden className="absolute left-[1.1rem] top-10 h-[calc(100%-2.5rem)] w-px bg-line" />
                    )}
                    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                      {i + 1}
                    </span>
                    <div className="pt-1.5">
                      <p className="text-[0.9375rem] font-semibold">{step.title}</p>
                      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-text-muted">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Container>
      </section>

      {/* What can be ordered in bulk — real categories with real counts. */}
      <section className="border-y border-line bg-surface py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-accent">Available in volume</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em]">Browse before you enquire</h2>
            </div>
            <Link href="/products/" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              Full range
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-3">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/products/${c.slug}/`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-5 py-2.5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
                >
                  {c.title}
                  <span className="text-xs font-normal text-text-faint">{c.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-20">
        <Container className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div>
            <p className="eyebrow text-accent">Questions</p>
            <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">Before you enquire</h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-text-muted">
              Anything else, write to{" "}
              <a href={`mailto:${site.contact.email}`} className="text-accent hover:underline">
                {site.contact.email}
              </a>
              .
            </p>
          </div>
          <FaqSection faqs={FAQS} />
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-ink px-8 py-10 text-text-invert sm:flex-row sm:items-center lg:px-12">
            <div>
              <p className="text-2xl font-semibold text-white">Have a list ready?</p>
              <p className="mt-1.5 text-sm text-text-invert-muted">
                Send it as it is. We&rsquo;ll turn it into a model-wise quote.
              </p>
            </div>
            <a
              href="#quote"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Request a quote
              <ArrowRightIcon className="size-4" />
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
