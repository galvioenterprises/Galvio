import { site } from "@/config/site";
import { serializeJsonLd } from "@/lib/json-ld";

/**
 * Organization and LocalBusiness markup.
 *
 * This is what ties the website to the Google Business Profile: the name,
 * address and phone here must match the Business Profile character for
 * character, or Google treats them as two different businesses and the
 * local listing loses the website's authority.
 */
export function OrganizationSchema() {
  const { street, locality, region, postalCode, country } = site.address;
  const hasAddress = Boolean(street && locality);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": hasAddress ? "Store" : "Organization",
    name: site.legalName,
    url: site.url,
    description: site.description,
    ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
    ...(site.contact.email ? { email: site.contact.email } : {}),
    ...(hasAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: street,
            addressLocality: locality,
            addressRegion: region,
            postalCode,
            addressCountry: country,
          },
        }
      : {}),
    ...(site.social.googleBusinessProfile
      ? { sameAs: [site.social.googleBusinessProfile] }
      : {}),
  };

  // A separate WebSite node is what Google reads to decide the site name
  // shown above a result. Without it the name is guessed from the title
  // tag, which is usually the page name rather than the business.
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    alternateName: site.shortName,
    url: site.url,
    publisher: { "@type": "Organization", name: site.legalName },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(website) }}
      />
    </>
  );
}
