import { site } from "@/config/site";
import type { Product } from "./product-schema";
import { formatPrice } from "./format";

/**
 * WhatsApp or email is the Phase 1 handoff. Every link carries enough detail
 * that the person answering can identify the item, SKU and displayed price.
 */

function link(message: string): string {
  const number = site.contact.whatsapp;
  // Until the real number is configured, preserve the message in an email
  // rather than looping the Contact page back to itself.
  if (!number) {
    return site.contact.email
      ? `mailto:${site.contact.email}?subject=${encodeURIComponent("Product enquiry")}&body=${encodeURIComponent(message)}`
      : "/contact/";
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function productEnquiryLink(product: Product): string {
  return link(
    `Hi ${site.shortName}, I'm interested in the ${product.title} ` +
      `(${product.sku}) listed at ${formatPrice(product.sellingPrice)}. ` +
      `Is it available?`,
  );
}

export function cartEnquiryLink(
  items: { title: string; qty: number }[],
  total: number,
): string {
  const visible = items
    .slice(0, 8)
    .map((item) => `${item.qty} x ${item.title}`)
    .join("\n");
  const remaining = items.length > 8 ? `\n+ ${items.length - 8} more product${items.length - 8 === 1 ? "" : "s"}` : "";
  return link(
    `Hi ${site.shortName}, I'd like help arranging this ${formatPrice(total)} order because it is above the online Cash on Delivery limit.\n\n` +
      `${visible}${remaining}\n\nPlease confirm stock, delivery and the next step.`,
  );
}

/** Direct COD order for one product. Stock and delivery are confirmed by
 *  the distributor before dispatch. */
export function buyNowLink(product: Product): string {
  return link(
    `Hi ${site.shortName}, I'd like to place a Cash on Delivery order for the ${product.title} ` +
      `(${product.sku}) at ${formatPrice(product.sellingPrice)}. ` +
      `Could you confirm stock and delivery details?`,
  );
}

export function generalEnquiryLink(): string {
  return link(`Hi ${site.shortName}, I'd like some help choosing a product.`);
}
