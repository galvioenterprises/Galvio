import { business } from "./business";
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
        body: `We sell as a distributor, not a marketplace. Stock is held by us and delivered by our own team or by a carrier we appoint, which is why we can give you a date rather than a tracking number and a hope.`,
      },
      { type: "heading", body: "Delivery timelines" },
      {
        type: "text",
        body: `For addresses within our regular service area, delivery is normally ${business.deliveryDaysMin}–${business.deliveryDaysMax} business days from the day the order is confirmed. Large appliances and made-to-order variants can take longer; we will tell you the expected date before you commit, not after.`,
      },
      {
        type: "text",
        body: `Delivery outside the regular service area can usually be arranged and may carry a charge. Ask us with your pincode and we will confirm both the timeline and the cost in writing before anything is dispatched.`,
      },
      { type: "heading", body: "On the day" },
      {
        type: "list",
        items: [
          "Someone aged 18 or over must be present to receive and sign for the appliance.",
          "Please check the packaging for visible damage before signing. Note any damage on the delivery sheet — this is what lets us claim against the carrier on your behalf.",
          "Access is your responsibility: stairs, lifts, doorway widths and parking. Tell us in advance if any of these are difficult so we can send the right number of people.",
        ],
      },
      { type: "heading", body: "Installation" },
      {
        type: "text",
        body: `Where a product page says installation is included, standard installation within our service area is covered in the price and carried out by our own team or the brand's authorised engineer. Standard installation does not include electrical work, civil work, core drilling beyond the standard allowance, copper piping beyond the standard length, stands, stabilisers or any material not supplied with the appliance. Anything extra is quoted to you before work starts.`,
      },
      {
        type: "text",
        body: `Where installation is not included, we will still coordinate it through the brand's authorised network so your warranty is not affected.`,
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
        body: `Large appliances are not returned in the way small goods are. In almost every case a fault is resolved by the manufacturer's warranty service, which repairs or replaces the unit at no cost to you. This policy explains the cases where we step in instead.`,
      },
      { type: "heading", body: "Damaged or wrong on arrival" },
      {
        type: "text",
        body: `If an appliance arrives visibly damaged, or is not the model you ordered, tell us within 48 hours of delivery and we will replace it or refund it in full. Please do not install or use the appliance in this situation, and keep the original packaging — both make the claim straightforward.`,
      },
      { type: "heading", body: "Faulty on first use" },
      {
        type: "text",
        body: `If the appliance is faulty within ${business.returnWindowDays} days of delivery and the fault is confirmed by the brand's authorised engineer, you may choose a replacement of the same model or a full refund.`,
      },
      { type: "heading", body: "Change of mind" },
      {
        type: "text",
        body: `We can accept a change-of-mind return within ${business.returnWindowDays} days provided the appliance is unused, uninstalled, and in its original packaging with all accessories and documentation. A collection charge may apply, and we will tell you what it is before collecting.`,
      },
      { type: "heading", body: "What cannot be returned" },
      {
        type: "list",
        items: [
          "Appliances that have been installed, used, or modified, except where the fault is confirmed by the brand's engineer.",
          "Damage caused after delivery, including damage from incorrect voltage, water ingress, or installation by someone other than an authorised engineer.",
          "Products purchased as clearance, display or as-is stock, where that was stated at the time of sale.",
        ],
      },
      { type: "heading", body: "Refunds" },
      {
        type: "text",
        body: `Approved refunds are made to the original payment method. Bank transfers usually settle within 5–7 business days once we have confirmed the return; card and UPI refunds depend on your bank's own timelines.`,
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
        body: `Every appliance we sell carries the manufacturer's own warranty, registered in your name. We are an authorised distributor, which means the warranty you get is the full factory warranty — not a shop guarantee, and not a third-party plan.`,
      },
      { type: "heading", body: "What is covered" },
      {
        type: "text",
        body: `The warranty period is printed on each product page and on your invoice. It covers manufacturing defects. Sealed components such as compressors usually carry a much longer separate period; where that applies, the product page states it.`,
      },
      { type: "heading", body: "What is not covered" },
      {
        type: "list",
        items: [
          "Damage from misuse, accident, voltage fluctuation, or water and pest ingress.",
          "Installation or repair carried out by anyone other than an authorised engineer.",
          "Consumables and cosmetic parts subject to normal wear.",
          "Appliances whose serial number has been removed or altered.",
        ],
      },
      { type: "heading", body: "How to claim" },
      {
        type: "text",
        body: `You can go directly to the brand's service line, or contact us and we will raise and follow the claim for you. We generally recommend the second: we deal with the service network regularly, and a distributor chasing a claim tends to move faster than an individual customer does.`,
      },
      { type: "heading", body: "Keep your invoice" },
      {
        type: "text",
        body: `The invoice is the proof of purchase date. Keep the digital copy we send you — it is all the service network needs.`,
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
          "Anonymous usage statistics, so we can see which products people look at and which pages are not working. This is aggregate traffic data, not a profile of you.",
        ],
      },
      { type: "heading", body: "What we do with it" },
      {
        type: "text",
        body: `We use it to answer your enquiry, to deliver and install what you order, to raise warranty claims on your behalf, and to keep the tax records the law requires us to keep. That is the whole list.`,
      },
      { type: "heading", body: "What we do not do" },
      {
        type: "text",
        body: `We do not sell your personal information, and we do not share it for anyone else's marketing. We share it only where it is necessary to complete your order — with the brand for warranty registration and service, and with the delivery team bringing your appliance.`,
      },
      { type: "heading", body: "Messaging" },
      {
        type: "text",
        body: `When you contact us on WhatsApp, that conversation is carried by WhatsApp and governed by their privacy terms as well as ours. If you would rather not use it, call or email us instead.`,
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
        body: `Prices are in Indian Rupees and include GST at the rate shown on the product page. We keep prices and stock current, but manufacturer price revisions and stock movements happen, and a listing can be out of date between updates. Where a price or availability has changed, we will tell you before confirming the order and you are free to walk away.`,
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
      { type: "heading", body: "Liability" },
      {
        type: "text",
        body: `Our responsibility is limited to the value of the goods supplied. We are not liable for indirect losses, and nothing in these terms limits any right you have under Indian consumer law.`,
      },
      { type: "heading", body: "Governing law" },
      {
        type: "text",
        body: `These terms are governed by the laws of India, and the courts at our registered place of business have jurisdiction.`,
      },
    ],
  },
];

export function getPolicyBySlug(slug: string): Policy | undefined {
  return policies.find((p) => p.slug === slug);
}
