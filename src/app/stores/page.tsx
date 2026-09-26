import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { serializeJsonLd } from "@/lib/json-ld";
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
  WrenchIcon,
} from "@/components/icons";

const hasPublicStoreAddress = Boolean(
  site.address.street && site.address.locality,
);

export const metadata: Metadata = {
  title: "Our Store",
  description: `Find the ${site.name} showroom contact details and confirm a visit to discuss listed ${business.primaryBrand} appliances.`,
  alternates: { canonical: "/stores/" },
  robots: { index: hasPublicStoreAddress, follow: true },
};

/**
 * The store page is the strongest local-SEO page on the site: it is what
 * Google cross-checks against the Business Profile. The name, address and
 * phone here come from site config precisely so they cannot drift from
 * the markup on the home page.
 */
export default function StoresPage() {
  const { street, locality, region, postalCode, country } = site.address;
  const address = [street, locality, region, postalCode].filter(Boolean).join(", ");
  const hasAddress = Boolean(street && locality);

  const directionsUrl = hasAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${site.legalName}, ${address}`,
      )}`
    : null;

  const jsonLd = hasAddress
    ? {
        "@context": "https://schema.org",
        "@type": "Store",
        name: site.legalName,
        url: `${site.url}/stores/`,
        ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
        ...(site.contact.email ? { email: site.contact.email } : {}),
        address: {
          "@type": "PostalAddress",
          streetAddress: street,
          addressLocality: locality,
          addressRegion: region,
          postalCode,
          addressCountry: country,
        },
        ...(business.hours.length > 0
          ? { openingHours: business.hours.map((slot) => `${slot.days} ${slot.time}`) }
          : {}),
        ...(site.social.googleBusinessProfile
          ? { sameAs: [site.social.googleBusinessProfile] }
          : {}),
      }
    : null;

  return (
    <>
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Our Store" }]} />

      <PageHeader
        eyebrow="Visit us"
        title={hasAddress ? "Visit the Galvio showroom" : "Showroom details"}
        intro={
          hasAddress
            ? "Plan a visit to discuss product choices, delivery and the next steps with the Galvio team."
            : "Galvio operates from a physical showroom. Its verified public address and opening hours have not been supplied for this site yet."
        }
      />

      <Container className="pb-24">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-line bg-surface p-8">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/8 text-accent">
                <PinIcon className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">{site.name}</h2>
                {hasAddress ? (
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-text-muted">
                    {address}
                  </p>
                ) : (
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-text-muted">
                    Contact Galvio directly if you need to arrange a visit.
                  </p>
                )}
              </div>
            </div>

            {business.hours.length > 0 && (
              <dl className="mt-8 border-t border-line pt-6">
                <dt className="text-sm font-semibold">Opening hours</dt>
                <dd className="mt-3 space-y-2 text-sm">
                  {business.hours.map((slot) => (
                    <div key={slot.days} className="flex justify-between gap-4">
                      <span className="text-text-muted">{slot.days}</span>
                      <span className="font-medium">{slot.time}</span>
                    </div>
                  ))}
                </dd>
              </dl>
            )}

            <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  <PinIcon className="size-4" />
                  Get directions
                </a>
              )}
              <a
                href={generalEnquiryLink()}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-5 text-sm font-medium transition-colors hover:border-line-strong"
              >
                {site.contact.whatsapp ? (
                  <WhatsAppIcon className="size-4" />
                ) : (
                  <MailIcon className="size-4" />
                )}
                {site.contact.whatsapp ? "Message us" : "Email us"}
              </a>
              {site.contact.phone && (
                <a
                  href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-5 text-sm font-medium transition-colors hover:border-line-strong"
                >
                  <PhoneIcon className="size-4" />
                  {site.contact.phone}
                </a>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl bg-ink p-8 text-text-invert">
              <p className="text-[0.9375rem] font-semibold text-white">
                Prepare for a useful visit
              </p>
              <ul className="mt-4 space-y-3.5 text-[0.8125rem] leading-relaxed text-text-invert-muted">
                <li>Bring the model names or shortlist you want to discuss.</li>
                <li>Note the room, doorway or installation-space measurements.</li>
                <li>Bring the delivery pincode and any access constraints.</li>
                <li>Confirm stock, delivery and installation terms before ordering.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-surface p-8">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent/8 text-accent">
                <WrenchIcon className="size-5" />
              </span>
              <p className="mt-4 text-[0.9375rem] font-semibold">
                Service and warranty
              </p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-muted">
                Bought from us and something is not right? Keep the invoice and
                manufacturer documents, then contact Galvio support so we can
                confirm the support route available for that model.
              </p>
              <Link
                href="/policies/warranty/"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
              >
                Warranty policy
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>

            {site.contact.email && (
              <div className="rounded-2xl border border-line bg-surface p-8">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent/8 text-accent">
                  <MailIcon className="size-5" />
                </span>
                <p className="mt-4 text-[0.9375rem] font-semibold">
                  Bulk and project enquiries
                </p>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="mt-2 block break-all text-sm font-medium text-accent"
                >
                  {site.contact.email}
                </a>
              </div>
            )}
          </div>
        </div>
      </Container>

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
    </>
  );
}
