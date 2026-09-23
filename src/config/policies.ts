import { site } from "./site";

/**
 * The customer-facing policies.
 *
 * Google Merchant Center will not approve an account whose site has no
 * reachable returns, delivery and contact information, so these are
 * launch-blocking rather than nice-to-have. They are written to be
 * conservative and accurate for a distributor selling through enquiry
 * rather than online checkout.
 *
 * THEY ARE DRAFTS. Have someone in the business read every line before
 * launch — these describe commitments the business has to honour.
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
        body: `This website is a catalogue for direct enquiries. Current stock, the delivery method, timing and any charges are confirmed with you in writing before an order is accepted.`,
      },
      { type: "heading", body: "Delivery timelines" },
      {
        type: "text",
        body: `The delivery timeline depends on confirmed showroom stock, the product and the destination. We will give you the expected date before you commit to an order.`,
      },
      {
        type: "text",
        body: `Share the delivery pincode with the showroom. We will confirm whether delivery can be arranged, along with the timeline and any charge, before an order is accepted.`,
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
    title: "Returns & Refunds",
    metaTitle: "Returns & Refunds Policy",
    summary:
      "When a product can be returned or replaced, and how a refund is made.",
    blocks: [
      {
        type: "text",
        body: `Return, replacement and refund terms depend on the product, its condition, the final invoice, manufacturer policy and applicable consumer law. Ask us to confirm the terms that apply before purchase.`,
      },
      { type: "heading", body: "Damaged or wrong on arrival" },
      {
        type: "text",
        body: `If an appliance arrives visibly damaged or is not the model on your invoice, contact us promptly. Do not install or use it, and retain the packaging and delivery evidence while the available remedy is confirmed.`,
      },
      { type: "heading", body: "Faulty on first use" },
      {
        type: "text",
        body: `If an appliance is faulty on first use, contact us promptly. The remedy depends on the manufacturer's inspection, the terms confirmed on your invoice and your rights under applicable consumer law.`,
      },
      { type: "heading", body: "Change of mind" },
      {
        type: "text",
        body: `Change-of-mind returns are not assumed by this catalogue. Ask for the applicable terms before purchase; any accepted return must be unused, uninstalled and complete with its original packaging, accessories and documentation.`,
      },
      { type: "heading", body: "Eligibility" },
      {
        type: "text",
        body: `Eligibility is assessed against the condition of the appliance, the terms stated before purchase, manufacturer policy and applicable consumer law. This catalogue does not add exclusions that are not stated in those sources.`,
      },
      { type: "heading", body: "Refunds" },
      {
        type: "text",
        body: `Where a refund is approved, the method and expected processing time will be confirmed in writing. Bank or payment-provider processing can add time after it is issued.`,
      },
      { type: "heading", body: "How to start a return" },
      {
        type: "text",
        body: `Message or call us with your invoice number and a photograph of the issue. ${contactLine}`,
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
        body: `The manufacturer documentation explains how to open a claim. You may also contact the showroom with your invoice and product details so we can confirm what assistance is available.`,
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
        body: `This website does not ask you to create an account, and it does not take payments. What we collect is limited to what we need in order to answer your enquiry and deliver what you buy.`,
      },
      { type: "heading", body: "What we collect" },
      {
        type: "list",
        items: [
          "What you tell us directly when you message, call or visit — your name, phone number, delivery address and what you are looking for.",
          "Cart choices saved in your browser. They stay on the device until you choose to include them in an enquiry.",
        ],
      },
      { type: "heading", body: "What we do with it" },
      {
        type: "text",
        body: `We use information you send to answer the enquiry and, if you place an order, for the purposes confirmed with you at that time, such as quoting, invoicing or arranging fulfilment.`,
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
      { type: "heading", body: "This website is a catalogue" },
      {
        type: "text",
        body: `Listings on this site are an invitation to enquire, not a binding offer. An order exists once we have confirmed it with you directly and issued an invoice. Nothing on this site completes a sale by itself.`,
      },
      { type: "heading", body: "Prices and availability" },
      {
        type: "text",
        body: `Prices are shown in Indian Rupees. Manufacturer revisions and showroom stock movements can make a listing out of date between updates. We confirm the final price, tax treatment and availability before accepting an order, and you are free to walk away if they have changed.`,
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
        body: `Any additional commercial or legal terms are provided for review before an order is accepted. This catalogue does not invent a term that has not been confirmed by the business.`,
      },
    ],
  },
];

export function getPolicyBySlug(slug: string): Policy | undefined {
  return policies.find((p) => p.slug === slug);
}
