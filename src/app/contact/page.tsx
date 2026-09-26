import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { serializeJsonLd } from "@/lib/json-ld";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { FaqSection } from "@/components/faq-section";
import {
  ArrowRightIcon,
  BoxIcon,
  ClockIcon,
  CreditCardIcon,
  HeadsetIcon,
  MailIcon,
  PhoneIcon,
  ReturnIcon,
  ShieldCheckIcon,
  TruckIcon,
  WhatsAppIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Help & Support",
  description: `Order help, delivery, Cash on Delivery, exchange and warranty support for ${site.name}. Contact us or find an answer.`,
  alternates: { canonical: "/contact/" },
};

const delivery =
  business.deliveryDaysMin && business.deliveryDaysMax
    ? `Most orders arrive in ${business.deliveryDaysMin}–${business.deliveryDaysMax} days after we confirm your order.`
    : "We confirm a delivery date for your pincode when we confirm the order, before anything is dispatched.";

const returns = `We don't accept returns. If the product arrives damaged, defective or is not what you ordered, tell us within ${business.exchangeWindowDays} days of delivery and we will exchange it, subject to our Returns & Exchange policy.`;

/**
 * Support content, grouped by the job the visitor came to do.
 *
 * Answers are built from business config, so an unconfirmed commitment —
 * a delivery window, a return period — is stated only once it has been
 * confirmed, and the policy page is referenced until then.
 */
const TOPICS = [
  {
    id: "ordering",
    Icon: BoxIcon,
    title: "Placing an order",
    blurb: "How ordering works, and confirming it",
    faqs: [
      {
        question: "How do I place an order?",
        answer: business.onlinePayments
          ? "Add products to your cart and check out, or use Buy now on a product. Continue as a guest or sign in, choose a delivery address, and select your payment method. We then call you to confirm stock and the delivery date before anything is dispatched."
          : "Add products to your cart and check out, or use Buy now on a product. Continue as a guest, enter your delivery address and place a Cash on Delivery order. We then call you to confirm stock and the delivery date before anything is dispatched.",
      },
      {
        question: "Is my order confirmed as soon as I place it?",
        answer:
          "Your order is placed straight away with confirmation pending. We then call to confirm stock, the final price and the delivery date. If an item is unavailable, the order is cancelled without charge.",
      },
      {
        question: "Can I change or cancel an order?",
        answer:
          "You can cancel from My Orders until the order is packed. After that, or to change an order, contact us with your order number.",
      },
    ],
  },
  {
    id: "payment",
    Icon: CreditCardIcon,
    title: business.onlinePayments ? "Payment" : "Cash on Delivery",
    blurb: business.onlinePayments ? "Paying online or on delivery" : "Pay when your order arrives",
    faqs: [
      {
        question: "How do I pay?",
        answer: business.onlinePayments
          ? "Pay online by UPI, credit or debit card, net banking or wallet through Cashfree's secure payment page, or choose Cash on Delivery on eligible orders and pay when the product arrives."
          : "The current launch is Cash on Delivery. Pay the confirmed order amount when the product arrives; no online payment is requested on this website.",
      },
      {
        question: "Is Cash on Delivery available at my address?",
        answer:
          `Cash on Delivery is offered on orders up to ₹${business.codLimit.toLocaleString("en-IN")}. For larger orders, contact us before placing the order so we can confirm the available arrangement. If COD is not possible for your pincode, we tell you when we call to confirm the order.`,
      },
    ],
  },
  {
    id: "delivery",
    Icon: TruckIcon,
    title: "Delivery & installation",
    blurb: "When it arrives, and getting it fitted",
    faqs: [
      {
        question: "When will my order arrive?",
        answer: delivery,
      },
      {
        question: "Do you deliver across India?",
        answer:
          "Yes. Orders are dispatched nationwide through our distribution partner's network.",
      },
      {
        question: "Who installs air conditioners and other appliances?",
        answer:
          "Installation is coordinated through the manufacturer's authorised service network, so your warranty is not affected. We confirm what is included when we confirm the order.",
      },
    ],
  },
  {
    id: "returns",
    Icon: ReturnIcon,
    title: "Damage & exchange",
    blurb: "If something arrives wrong",
    faqs: [
      {
        question: "My product arrived damaged. What should I do?",
        answer:
          "If you can, note the damage on the delivery receipt before signing. Then send us photos of the product and the packaging as soon as possible, with your name and the product — we will take it from there.",
      },
      {
        question: "Can I return or exchange a product?",
        answer: returns,
      },
    ],
  },
  {
    id: "warranty",
    Icon: ShieldCheckIcon,
    title: "Warranty & service",
    blurb: "Repairs and manufacturer warranty",
    faqs: [
      {
        question: "Is the warranty the manufacturer's?",
        answer:
          "Yes. Every product carries the full manufacturer warranty. Keep your invoice — it is your proof of purchase for any claim.",
      },
      {
        question: "How do I get a product repaired under warranty?",
        answer:
          "Voltas runs its own service network. Book a service request on voltasservice.com, or contact us and we will help you raise it.",
      },
    ],
  },
  {
    id: "advice",
    Icon: HeadsetIcon,
    title: "Choosing a product",
    blurb: "Help picking the right model",
    faqs: [
      {
        question: "Which size or capacity should I buy?",
        answer:
          "Every category page has a sizing guide — tonnage by room size, litres by household, and so on. If you are still unsure, tell us the room and how you use it and we will recommend a model.",
      },
      {
        question: "Can you compare two models for me?",
        answer:
          "Yes. Send us the two product names and what matters most to you — running cost, noise, price — and we will explain the difference plainly.",
      },
    ],
  },
];

export default function SupportPage() {
  const channels = [
    site.contact.whatsapp && {
      Icon: WhatsAppIcon,
      title: "WhatsApp",
      value: `+${site.contact.whatsapp}`,
      href: generalEnquiryLink(),
      note: "Fastest for order questions",
    },
    site.contact.phone && {
      Icon: PhoneIcon,
      title: "Call us",
      value: site.contact.phone,
      href: `tel:${site.contact.phone.replace(/\s/g, "")}`,
      note: "During business hours",
    },
    {
      Icon: MailIcon,
      title: "Email",
      value: site.contact.email,
      href: `mailto:${site.contact.email}`,
      note: "Best for orders, invoices and photos",
    },
  ].filter(Boolean) as {
    Icon: (p: { className?: string }) => React.ReactElement;
    title: string;
    value: string;
    href: string;
    note: string;
  }[];

  const allFaqs = TOPICS.flatMap((t) => t.faqs);

  return (
    <>
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Support" }]} />

      {/* Task-first, the way Apple and Samsung support open: the visitor
          names their problem in one click instead of reading a page to
          find where their answer lives. */}
      <section className="bg-ink pb-24 pt-16 text-text-invert lg:pt-20">
        <Container className="text-center">
          <p className="eyebrow text-accent">Help & support</p>
          <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.75rem] lg:text-[3.25rem]">
            How can we help?
          </h1>
          <p className="mx-auto mt-5 max-w-[48ch] text-base leading-[1.7] text-text-invert-muted">
            Pick a topic for a quick answer, or talk to a person below.
          </p>
        </Container>
      </section>

      <Container className="-mt-14">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map(({ id, Icon, title, blurb }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="group flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgba(17,19,24,0.06)] transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_36px_rgba(17,19,24,0.10)]"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/[0.08] text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-semibold">{title}</span>
                  <span className="mt-0.5 block text-[0.8125rem] text-text-muted">{blurb}</span>
                </span>
                <ArrowRightIcon className="size-4 shrink-0 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </a>
            </li>
          ))}
        </ul>
      </Container>

      {/* Talk to a person — every channel says what it is best for, so the
          visitor picks the right one first time. */}
      <section className="py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="eyebrow text-accent">Talk to us</p>
              <h2 className="mt-3 text-[2rem] font-semibold leading-tight tracking-[-0.02em]">
                A real person, not a ticket
              </h2>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-text-muted">
                Include your name, the product and your pincode — it saves a
                round trip.
              </p>
              {business.hours.length > 0 && (
                <div className="mt-6 flex gap-3 text-sm">
                  <ClockIcon className="mt-0.5 size-4 shrink-0 text-text-muted" />
                  <ul className="space-y-1">
                    {business.hours.map((h) => (
                      <li key={h.days}>
                        <span className="text-text-muted">{h.days}</span> · {h.time}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* One channel sits at card width rather than stretching across
                the row; the grid fills out as WhatsApp and phone are added. */}
            <ul
              className={`grid gap-4 ${
                channels.length === 1
                  ? "max-w-md"
                  : channels.length === 2
                    ? "sm:grid-cols-2"
                    : "sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {channels.map(({ Icon, title, value, href, note }, i) => (
                <li key={title}>
                  <a
                    href={href}
                    className={`group flex h-full flex-col rounded-2xl p-7 transition ${
                      i === 0
                        ? "bg-ink text-text-invert hover:bg-ink-soft"
                        : "border border-line bg-surface hover:border-line-strong"
                    }`}
                  >
                    <span
                      className={`flex size-11 items-center justify-center rounded-xl ${
                        i === 0 ? "bg-accent text-white" : "bg-accent/[0.08] text-accent"
                      }`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className={`mt-5 text-[0.8125rem] ${i === 0 ? "text-text-invert-muted" : "text-text-muted"}`}>
                      {title}
                    </span>
                    <span className={`mt-1 break-all text-[0.9375rem] font-semibold ${i === 0 ? "text-white" : ""}`}>
                      {value}
                    </span>
                    <span className={`mt-auto pt-5 text-xs ${i === 0 ? "text-text-invert-muted" : "text-text-faint"}`}>
                      {note}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Answers, grouped to match the tiles above. */}
      <section className="border-t border-line bg-surface py-20">
        <Container className="grid gap-12 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
          <nav aria-label="Support topics" className="lg:sticky lg:top-[5.5rem] lg:self-start">
            <p className="eyebrow text-text-muted">Answers</p>
            <ul className="mt-4 space-y-1">
              {TOPICS.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="block rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-canvas hover:text-text">
                    {t.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {TOPICS.map((t) => (
              <FaqSection key={t.id} id={t.id} title={t.title} faqs={t.faqs} schema={false} />
            ))}
          </div>
        </Container>
      </section>

      {/* Manufacturer service and the policies, for the questions a page of
          answers cannot settle. */}
      <section className="py-20">
        <Container className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl bg-ink p-8 text-text-invert lg:p-10">
            <ShieldCheckIcon className="size-7 text-accent" />
            <p className="mt-5 text-xl font-semibold text-white">Manufacturer service</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-text-invert-muted">
              Warranty repairs for {business.primaryBrand} products are handled by the
              brand&rsquo;s own service network. Register your product or book a
              visit directly.
            </p>
            <div className="mt-auto flex flex-wrap gap-3 pt-7">
              <a
                href="https://www.voltasservice.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Book a service
                <ArrowRightIcon className="size-4" />
              </a>
              <a
                href="https://www.voltasservice.com/register-your-product"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-medium text-white transition-colors hover:border-white/30"
              >
                Register a product
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-8 lg:p-10">
            <p className="text-xl font-semibold">Our policies</p>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              The full terms behind every answer on this page.
            </p>
            <ul className="mt-6 divide-y divide-line">
              {[
                ["Delivery & Installation", "/policies/delivery/"],
                ["Returns & Exchange", "/policies/returns/"],
                ["Warranty", "/policies/warranty/"],
                ["Terms & Conditions", "/policies/terms/"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="group flex items-center justify-between py-3.5 text-sm font-medium transition-colors hover:text-accent">
                    {label}
                    <ArrowRightIcon className="size-4 text-text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: allFaqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }),
        }}
      />
    </>
  );
}
