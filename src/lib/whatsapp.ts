import { site } from "@/config/site";
import type { Product } from "./product-schema";
import { formatPrice } from "./format";

/**
 * WhatsApp is the checkout for Phase 1. Every enquiry link carries enough
 * detail that the person answering can reply without a second round trip:
 * what the customer is looking at, the SKU to check stock against, and
 * the price they were shown.
 */

function link(message: string): string {
  const number = site.contact.whatsapp;
  // Until the real number is configured, send the customer to the contact
  // page rather than to a broken wa.me URL.
  if (!number) return "/contact";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function productEnquiryLink(product: Product): string {
  return link(
    `Hi ${site.shortName}, I'm interested in the ${product.title} ` +
      `(${product.sku}) listed at ${formatPrice(product.sellingPrice)}. ` +
      `Is it available?`,
  );
}

/** "Buy now" goes here. There is no online checkout, so buying happens
 *  the way it already does at the counter — through a person. The message
 *  says so plainly rather than pretending a payment page is coming. */
export function buyNowLink(product: Product): string {
  return link(
    `Hi ${site.shortName}, I'd like to buy the ${product.title} ` +
      `(${product.sku}) at ${formatPrice(product.sellingPrice)}. ` +
      `Could you confirm availability and the delivery date?`,
  );
}

export function generalEnquiryLink(): string {
  return link(`Hi ${site.shortName}, I'd like some help choosing a product.`);
}
