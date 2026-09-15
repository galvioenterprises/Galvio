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
  description: `${site.name} is an authorised ${business.primaryBrand} distributor selling direct to customers — no marketplace middleman, full factory warranty, installation by our own team.`,
  alternates: { canonical: "/about/" },
};

const PILLARS = [
  {
    Icon: BadgeIcon,
    title: "Authorised distributor",
    body: `We buy from ${business.primaryBrand} and sell to you. There is no marketplace seller in between, which is why the warranty you get is the full factory warranty registered in your name.`,
  },
  {
    Icon: ShieldCheckIcon,
    title: "One brand, properly",
    body: `We would rather know one brand's range completely than carry twelve badly. If a model is wrong for your room, we will tell you — including when that means selling you something cheaper.`,
  },
  {
    Icon: WrenchIcon,
    title: "We install what we sell",
    body: "Delivery and standard installation are handled by our own team or the brand's authorised engineer, so nobody can blame anybody else when something needs fixing.",
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
              We are built the other way round. We hold the stock, we quote the
              price, we deliver it, we install it, and we raise the warranty
              claim if one is ever needed. One number to call, and it is a number
              that belongs to the people who sold you the appliance.
            </p>

            <h2>Why only {business.primaryBrand}</h2>
            <p>
              Carrying every brand sounds like more choice. In practice it means
              a shop that knows none of them well, cannot hold real stock depth,
              and has no leverage with any service network. We went the other
              way: one brand, the full range, genuine stock depth, and a service
              relationship that actually gets calls answered.
            </p>
            <p>
              That also means we can be honest about fit. A 1.5 ton unit in a
              small bedroom is a worse outcome than a 1 ton unit, and we will
              say so even though the smaller one earns us less.
            </p>

            <h2>Retail and bulk</h2>
            <p>
              Alongside walk-in and home delivery, we supply in volume — builder
              handovers, office fit-outs, hotels and institutional orders. Bulk
              pricing is quoted per project rather than taken off a list, and
              delivery is scheduled around your site rather than ours.
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
                <div className="flex justify-between gap-4">
                  <dt className="text-text-muted">Serving since</dt>
                  <dd className="font-medium">{business.foundedYear}</dd>
                </div>
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
