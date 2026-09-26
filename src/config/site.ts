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
    "Genuine Voltas and Voltas Beko appliances, supplied through an authorised distributor, with retail and bulk supply, Cash on Delivery, and pan-India shipping.",

  locale: "en_IN",
  currency: "INR",
  country: "IN",

  /** TODO: replace with the live business numbers before launch. */
  contact: {
    /** Calls for queries, complaints, enquiries and sales. */
    phone: "+91 94129 60885",
    /** E.164 without the leading "+", e.g. 919876543210. */
    whatsapp: "919412960885",
    email: "galvioenterprises@gmail.com",
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

  /**
   * Explicitly verified delivery pincodes, if a destination-level list is
   * supplied. Nationwide operation is configured separately in business.ts;
   * Phase 1 still asks the distributor to confirm each destination.
   */
  serviceablePincodes: [] as string[],
} as const;

export type Site = typeof site;
