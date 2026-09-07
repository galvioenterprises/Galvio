/**
 * Single source of truth for brand, canonical URL and contact channels.
 * Anything that appears in metadata, structured data or the WhatsApp
 * deep links should be read from here, never hard-coded in a component.
 */

export const site = {
  /** Tenant this build belongs to. Kept in the data model so a second
   *  distributor can be onboarded later without a schema migration. */
  tenantId: "galvio-001",

  name: "Galvio Enterprises",
  legalName: "Galvio Enterprises",
  shortName: "Galvio",

  /** Canonical origin. Every other hostname redirects here. */
  url: "https://galvioenterprises.com",

  description:
    "Authorised distributor of home and commercial electronics. Retail and bulk supply.",

  locale: "en_IN",
  currency: "INR",
  country: "IN",

  /** TODO: replace with the live business numbers before launch. */
  contact: {
    phone: "",
    /** E.164 without the leading "+", e.g. 919876543210. */
    whatsapp: "",
    email: "",
  },

  /** TODO: replace with the showroom address used on Google Business Profile.
   *  The two must match exactly or local listings get rejected. */
  address: {
    street: "",
    locality: "",
    region: "",
    postalCode: "",
    country: "IN",
  },

  social: {
    googleBusinessProfile: "",
  },
} as const;

export type Site = typeof site;
