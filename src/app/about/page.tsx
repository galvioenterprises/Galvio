import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { getPopulatedCategories } from "@/lib/catalog";
import { getAllProducts } from "@/lib/products";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { PageHeader, Prose } from "@/components/page-header";
import { ArrowRightIcon, BadgeIcon, ShieldCheckIcon, WrenchIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: `About ${site.name}`,
  description: `${site.name} is an authorised ${business.primaryBrand} distributor serving retail and bulk customers from a physical showroom.`,
  alternates: { canonical: "/about/" },
};

const PILLARS = [
  {
    Icon: BadgeIcon,
    title: "Authorised distributor",
    body: `We list ${business.primaryBrand} products for direct showroom enquiries. Warranty and installation terms are confirmed model by model before purchase.`,
  },
  {
    Icon: ShieldCheckIcon,
    title: "One brand, properly",
    body: `We would rather know one brand's range completely than carry twelve badly. If a model is wrong for your room, we will tell you — including when that means selling you something cheaper.`,
  },
  {
    Icon: WrenchIcon,
    title: "A physical showroom",
    body: "You can compare listed models with a real person and confirm price, availability, delivery and installation terms before placing an order.",
  },
];

export default function AboutPage() {
  const categories = getPopulatedCategories();
  const productCount = getAllProducts().length;

  return (
    <>
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "About Us" }]} />

      <PageHeader
        eyebrow="About us"
        title={`An authorised ${business.primaryBrand} distributor`}
        intro={`${site.name} supplies ${business.primaryBrand} air conditioners, refrigerators and home appliances direct from the distributorship — to households, and in bulk to builders, offices and institutions.`}
      />

      <Container className="pb-24">
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <Prose>
            <p>
              Most appliance buying in India now runs through marketplaces, where
              the listing, the seller, the delivery and the service are four
              different companies and none of them answers for the others. When
              something goes wrong, the customer becomes the project manager.
            </p>
            <p>
              We are built around direct showroom enquiries. We publish the
              product details we can verify, then confirm stock, the final quote,
              delivery and any installation terms before an order is placed.
            </p>

            <h2>Why only {business.primaryBrand}</h2>
            <p>
              Carrying every brand sounds like more choice. In practice it means
              a shop that knows none of them well, cannot hold real stock depth,
              and has no leverage with any service network. We went the other
              way: focus on the Voltas range, keep the catalogue source-backed,
              and give customers a direct showroom contact for the final checks.
            </p>
            <p>
              That also means we can be honest about fit. A 1.5 ton unit in a
              small bedroom is a worse outcome than a 1 ton unit, and we will
              say so even though the smaller one earns us less.
            </p>

            <h2>Retail and bulk</h2>
            <p>
              Alongside retail enquiries, we accept project requirements for
              builder handovers, office fit-outs, hotels and institutional
              orders. Bulk pricing, stock and delivery timing are confirmed per
              project rather than inferred from the online catalogue.
            </p>

            <h2>Where we are</h2>
            <p>
              We operate from our showroom, where you are welcome to see the
              appliances working before you buy. Details and opening hours are on
              the <Link href="/stores/">store page</Link>.
            </p>
          </Prose>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-line bg-surface p-7">
              <p className="text-sm font-semibold">At a glance</p>
              <dl className="mt-4 space-y-3.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">Brand</dt>
                  <dd className="font-medium">{business.primaryBrand}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">Categories</dt>
                  <dd className="font-medium">{categories.length}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">Products listed</dt>
                  <dd className="font-medium">{productCount}</dd>
                </div>
                {business.foundedYear !== null && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-text-muted">Serving since</dt>
                    <dd className="font-medium">{business.foundedYear}</dd>
                  </div>
                )}
              </dl>

              <Link
                href="/products/"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                Browse the catalogue
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>

            <div className="rounded-2xl bg-ink p-7 text-text-invert">
              <p className="text-sm font-semibold text-white">Buying in bulk?</p>
              <p className="mt-2 text-xs leading-relaxed text-text-invert-muted">
                Builder handovers, offices, hotels and institutions. Tell us the
                quantity and the timeline and we will quote the project.
              </p>
              <Link
                href="/contact/"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-white hover:underline"
              >
                Talk to us
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </aside>
        </div>

        <ul className="mt-20 grid gap-5 sm:grid-cols-3">
          {PILLARS.map(({ Icon, title, body }) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-7">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent/8 text-accent">
                <Icon className="size-5" />
              </span>
              <p className="mt-4 text-[0.9375rem] font-semibold">{title}</p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-muted">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
