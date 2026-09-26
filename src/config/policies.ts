import { site } from "./site";
import { business } from "./business";

const EXCHANGE_DAYS = business.exchangeWindowDays;

/**
 * The customer-facing policies.
 *
 * Google Merchant Center will not approve an account whose site has no
 * reachable returns, delivery and contact information, so these are
 * launch-blocking rather than nice-to-have. They are written to be
 * conservative and accurate for the Phase 1 Cash on Delivery workflow.
 *
 * The business approved these commercial commitments for launch. Any future
 * payment or fulfilment change must update this source before its UI ships.
 */

export type PolicyBlock =
  | { type: "text"; body: string }
  | { type: "list"; items: string[] }
  | { type: "heading"; body: string };

export type Policy = {
  slug: string;
  title: string;
  metaTitle: string;
  summary: string;
  blocks: PolicyBlock[];
};

const contactLine =
  site.contact.email || site.contact.phone
    ? `You can reach us on ${[site.contact.phone, site.contact.email]
        .filter(Boolean)
        .join(" or ")}.`
    : "You can reach us through the contact details on our Contact page.";

export const policies: Policy[] = [
  {
    slug: "delivery",
    title: "Delivery & Installation",
    metaTitle: "Delivery & Installation Policy",
    summary:
      "How we deliver, when we deliver, and what installation includes.",
    blocks: [
      {
        type: "text",
        body: `You can place a Cash on Delivery order online without paying upfront. Its first status is “Order placed — confirmation pending.” The distributor then calls to confirm current stock, the final price, the delivery method and timing before dispatch.`,
      },
      { type: "heading", body: "Delivery timelines" },
      {
        type: "text",
        body: `Orders are delivered in ${business.deliveryDaysMin}–${business.deliveryDaysMax} days after we confirm them on our call. Some remote pincodes can take longer; if yours does, we tell you on that call.`,
      },
      {
        type: "text",
        body: `Delivery is available across India. Delivery is free.`,
      },
      { type: "heading", body: "On the day" },
      {
        type: "text",
        body: `Before dispatch, confirm who will receive the appliance and tell us about stairs, lift limits, doorway widths or restricted access. Inspect the packaging on arrival and record visible damage before installation.`,
      },
      { type: "heading", body: "Installation" },
      {
        type: "text",
        body: `Where a product page says installation is included, the written quote will state the covered work and who will carry it out. Electrical work, civil work, extra piping, stands, stabilisers and other materials are included only when the quote says so.`,
      },
      {
        type: "text",
        body: `Where installation is not listed as included, ask us to confirm the available arrangement and charges before purchase.`,
      },
      { type: "heading", body: "If something goes wrong" },
      { type: "text", body: contactLine },
    ],
  },
  {
    slug: "returns",
    title: "Returns & Exchange",
    metaTitle: "Returns & Exchange Policy",
    summary: `We don't accept returns. A damaged, defective or wrong product can be exchanged within ${EXCHANGE_DAYS} days of delivery.`,
    blocks: [
      { type: "heading", body: "No returns" },
      {
        type: "text",
        body: `We don't accept returns once a product has been delivered, including for a change of mind, and we don't refund delivered orders.`,
      },
      { type: "heading", body: `Exchange within ${EXCHANGE_DAYS} days` },
      {
        type: "text",
        body: `If a product arrives damaged, is defective, or is not the model on your invoice, tell us within ${EXCHANGE_DAYS} days of delivery. Once the claim is approved, we exchange it for the same model, or a comparable model if that one is unavailable.`,
      },
      { type: "heading", body: "Terms and conditions" },
      {
        type: "text",
        body: `An exchange is subject to all of the following:`,
      },
      {
        type: "list",
        items: [
          `The issue is reported within ${EXCHANGE_DAYS} days of the delivery date shown on your invoice.`,
          `You send your order number or invoice, with photos or a video of the issue. For damage in transit, include photos of the outer packaging.`,
          `The product is inspected by us or by Voltas's authorised service engineer, who must confirm the damage, defect or wrong model.`,
          `The product has not been misused, altered, or physically damaged after delivery, and has not been installed or repaired by anyone other than an authorised technician.`,
          `The product comes back with its original box and packaging where possible, accessories, manuals, remote and invoice.`,
          `Faults reported after ${EXCHANGE_DAYS} days are handled as a warranty claim with Voltas service, not as an exchange.`,
          `Installation, protection plans and other services already delivered are not exchangeable.`,
          `The final decision on an exchange rests with Galvio Enterprises and the distributor, after inspection.`,
        ],
      },
      { type: "heading", body: "Damaged on arrival" },
      {
        type: "text",
        body: `If the box looks damaged, note it on the delivery receipt before you sign, and don't install or use the product. Send us photos the same day.`,
      },
      { type: "heading", body: "Old appliances" },
      {
        type: "text",
        body: `We don't take old appliances in exchange or buy them back.`,
      },
      { type: "heading", body: "Cancellations before dispatch" },
      {
        type: "text",
        body: `You may ask to cancel before dispatch. Phase 1 orders are Cash on Delivery, so no payment has been collected online. Once an order has been dispatched, the delivery and exchange terms above apply.`,
      },
      { type: "heading", body: "How to request an exchange" },
      {
        type: "text",
        body: `Message or call us with your order number and photos of the issue. ${contactLine}`,
      },
    ],
  },
  {
    slug: "warranty",
    title: "Warranty",
    metaTitle: "Warranty Policy",
    summary: "What the manufacturer covers, what we do, and how to claim.",
    blocks: [
      {
        type: "text",
        body: `Where a manufacturer warranty applies, its duration and terms are those stated in the manufacturer documentation and the final invoice. No warranty period is inferred from a similar model.`,
      },
      { type: "heading", body: "What is covered" },
      {
        type: "text",
        body: `A warranty period is shown on a product page only when the supplied product data states it. Confirm the applicable coverage on the final invoice and manufacturer documentation before purchase.`,
      },
      { type: "heading", body: "What is not covered" },
      {
        type: "text",
        body: `Exclusions vary by product and manufacturer. Refer to the warranty document for the exact model rather than assuming exclusions from another appliance or listing.`,
      },
      { type: "heading", body: "How to claim" },
      {
        type: "text",
        body: `The manufacturer documentation explains how to open a claim. You may also contact Galvio with your invoice and product details so we can confirm what assistance is available.`,
      },
      { type: "heading", body: "Keep your invoice" },
      {
        type: "text",
        body: `The invoice is evidence of the purchase date. Keep it with the manufacturer documentation and serial-number details required by the applicable claim process.`,
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    metaTitle: "Privacy Policy",
    summary: "What we collect, why, and what we never do with it.",
    blocks: [
      {
        type: "text",
        body: `You can place a Cash on Delivery order as a guest. An account is optional and helps you track orders across devices. Signing in uses a one-time code; we do not store passwords. We do not collect card, UPI or bank details during the Phase 1 Cash on Delivery checkout.`,
      },
      { type: "heading", body: "What we collect" },
      {
        type: "list",
        items: [
          "Your guest or account details: name, mobile number and email address when you choose to provide one.",
          "Delivery addresses you save, and the orders you place with us, including confirmation and payment status.",
          "What you tell us directly when you message, call or visit.",
          "Cart and saved-for-later choices. Guest carts stay in your browser; signed-in carts may also be saved to your account so they can be recovered and, where permitted, used for a cart reminder.",
        ],
      },
      { type: "heading", body: "What we do with it" },
      {
        type: "text",
        body: `We use it to confirm and deliver your orders, send updates using the contact details you provide, answer support messages and meet invoicing and tax obligations. Your delivery address and phone number are shared with the distributor and courier handling your order.`,
      },
      { type: "heading", body: "What we do not do" },
      {
        type: "text",
        body: `We do not sell your personal information or share it for another business's marketing. Any operational sharing needed for an order is explained as part of the confirmed order process.`,
      },
      { type: "heading", body: "Messaging" },
      {
        type: "text",
        body: `When you contact us on WhatsApp, that conversation is carried by WhatsApp and governed by its terms as well as ours. You can use email instead.`,
      },
      { type: "heading", body: "Your choices" },
      {
        type: "text",
        body: `You can ask us what we hold about you, ask us to correct it, or ask us to delete it, and we will — except for records we are legally required to retain, such as tax invoices. ${contactLine}`,
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    metaTitle: "Terms & Conditions",
    summary: "The terms on which we list products and accept orders.",
    blocks: [
      {
        type: "text",
        body: `These terms cover the use of this website and any order placed with ${site.legalName}.`,
      },
      { type: "heading", body: "Ordering and confirmation" },
      {
        type: "text",
        body: `When you place a Cash on Delivery order you receive an order number and see “Order placed — confirmation pending.” If you supplied a valid email address, we also send it there; otherwise updates use your mobile number. The distributor then calls to confirm stock, the final price and delivery date with you before dispatch. If an item cannot be supplied, the order is cancelled and no online payment needs to be refunded.`,
      },
      { type: "heading", body: "Prices and availability" },
      {
        type: "text",
        body: `Prices are shown in Indian Rupees. Manufacturer revisions and distributor stock movements can make a listing out of date between updates. We confirm the final price, tax treatment and availability before accepting an order, and you are free to walk away if they have changed.`,
      },
      {
        type: "text",
        body: `Where an obvious pricing error has occurred, we will not hold you to it and we will not be held to it either — we will contact you and either honour the correct price or cancel the order.`,
      },
      { type: "heading", body: "Product information" },
      {
        type: "text",
        body: `Specifications, images and feature descriptions come from the manufacturer. Colours can differ on screen, and manufacturers revise specifications without notice. If a specific detail matters to your decision, ask us to confirm it in writing before you buy.`,
      },
      { type: "heading", body: "Delivery, returns and warranty" },
      {
        type: "text",
        body: `These are covered by our Delivery & Installation, Returns & Refunds and Warranty policies, which form part of these terms.`,
      },
      { type: "heading", body: "Final order terms" },
      {
        type: "text",
        body: `Any additional commercial or legal terms are provided for review before an order is accepted. The website does not add a term that has not been confirmed by the business.`,
      },
    ],
  },
];

export function getPolicyBySlug(slug: string): Policy | undefined {
  return policies.find((p) => p.slug === slug);
}
