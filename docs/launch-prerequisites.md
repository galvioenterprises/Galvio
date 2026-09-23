# Launch prerequisites — Galvio Enterprises

Everything in this document has to be done by a human with access to the
business's identity, bank details and physical premises. None of it can be
scripted. Items are ordered by lead time, not importance: the things that
take weeks to be approved by someone else come first.

Domain: `galvioenterprises.com`
Target canonical origin: `https://galvioenterprises.com` (apex, with `www`
redirecting to it).

---

## 0. A correction before anything else

Google AdSense is not part of this. AdSense pays you to display other
companies' ads on your pages — it is a publisher monetisation product and it
is actively counterproductive on a commerce site.

The Google products this project actually needs are:

| Product | What it does for us | Phase |
|---|---|---|
| Search Console | Proves we own the domain, reports indexing and search queries | 1 |
| Analytics 4 (GA4) | Retail and bulk funnel measurement | 1 |
| Business Profile (GBP) | The showroom's map/local listing | 1 |
| Merchant Center | Free **local** product listings tied to the showroom | 1 |
| Merchant Center (online feed) | Free online listings, requires checkout | 2 |
| Google Ads | Paid acquisition, Local Inventory Ads | 2 |

---

## 1. Start immediately — long external lead times

### 1.1 Google Business Profile verification

This is the single longest-lead item and everything in the local commerce
strategy depends on it. Verification is done by Google, by video call or
postcard, and can take anywhere from a few days to three weeks. Start today.

You need:

- The exact legal/trading name, used identically everywhere else.
- The showroom's street address, as it appears on a utility bill or the
  GST registration. This string must match `src/config/site.ts` and the
  Merchant Center account character for character.
- A phone number that is answered at that address.
- Business hours.
- Primary category — pick the most specific one that fits, e.g.
  "Electronics store" or "Appliance store", not "Wholesaler".
- Photos of the storefront, the signage and the interior. Video
  verification will ask you to walk the camera from the street sign to the
  interior to the till, so have the signage physically up before you start.

Do not start verification until the signage and the phone line are live.
A failed verification attempt is slow to appeal.

### 1.2 A business Google Account

Every Google product below should be owned by one account that is not a
personal Gmail — if the person who owns the account leaves, the business
loses its listings.

Two options:

- Google Workspace on the domain (`hello@galvioenterprises.com`), ~₹150–₹250
  per user per month. Recommended: it also gives you branded email, which
  matters for Merchant Center trust checks and for bulk-order replies.
- A dedicated free Gmail used only for the business. Acceptable, weaker.

Once created, add a second account as owner immediately so a lockout is
recoverable.

### 1.3 GST and business documents

Merchant Center, Razorpay (Phase 2) and B2B bulk buyers will all ask for
these, and gathering them takes longer than expected:

- GSTIN
- Business PAN
- Registered business name and address
- Current account details in the business name
- Any distributor authorisation letters from the brands you carry — bulk
  buyers ask for these, and they are good landing-page material

---

## 2. Do this week — under our control

### 2.1 Cloudflare

1. Create a Cloudflare account on the business Google Account.
2. Add `galvioenterprises.com` as a site (Free plan).
3. Review the DNS records Cloudflare imports from the registrar. **Check
   the MX records specifically** — if email for this domain is already
   live anywhere, losing MX records silently breaks it.
4. Only then change the nameservers at the registrar.
5. Wait for Cloudflare to report the zone as active before configuring
   anything else.
6. Set SSL/TLS mode to Full (strict) and enable Always Use HTTPS.
7. Add a redirect rule sending `www.galvioenterprises.com` to the apex.

Do not change the nameservers first and configure afterwards.

### 2.2 Search Console

Add a **Domain property** (not a URL-prefix property) for
`galvioenterprises.com` and verify it with the DNS TXT record, which you can
add in Cloudflare in under a minute. A domain property covers every
subdomain and both protocols, so it never needs redoing.

Submit `https://galvioenterprises.com/sitemap.xml` once the first deploy is
live — the coming-soon page is enough to start.

### 2.3 Analytics 4

Create a GA4 property, currency INR, timezone Asia/Kolkata, and a Web data
stream for the domain. Send me the Measurement ID (`G-XXXXXXXXXX`) — this is
a public identifier, it is safe to paste in chat and it lives in the repo.

### 2.4 Merchant Center

Create the account but expect to finish it only after GBP verification, as
local listings require a verified, linked Business Profile.

Have ready: business name and address, customer service phone and email, and
published return, shipping and privacy policies. Merchant Center rejects
accounts whose site has no reachable contact details and no return policy,
so those pages are launch-blocking, not nice-to-have.

### 2.5 WhatsApp Business

Install the WhatsApp Business app on the number that will handle enquiries,
set the business profile, hours and catalogue-less greeting message. Send me
the number in E.164 form without the `+` (e.g. `919876543210`) — it goes
into every product page's enquiry link.

Decide now whether retail and bulk enquiries go to the **same** number. My
recommendation is separate numbers, because bulk enquiries need a
salesperson and retail needs speed, and mixing them makes both worse.

### 2.6 Cloudflare Turnstile

Create a Turnstile widget when the direct RFQ Worker is built. The current
bulk-order page prepares a message in the visitor's email/WhatsApp client and
has no submission endpoint to protect. The future site key is public; the
Worker secret must never be pasted into chat or committed.

### 2.7 Sentry

Free tier account, a project of type "Next.js". The DSN is public and goes
in the repo.

---

## 3. Content and assets I need from you

### 3.1 Brand

- Logo as SVG (and a square version for the favicon and GBP)
- Brand colour hex values
- One-line and one-paragraph business descriptions
- Founding year and a short "about us" paragraph — this feeds both the
  homepage and the local listing

### 3.2 Figma

The Figma file is accessible through the approved integration. Keep that
connection scoped to view access. Do not share browser cookies, session tokens
or copied authenticated curl commands. PNG exports at 2x remain useful for
visual regression review.

### 3.3 Product data — the packet

For each of the first 20 SKUs. Blank source fields stay blank; the importer
keeps identity-complete but commercially incomplete rows as invisible drafts.

| Field | Required | Notes |
|---|---|---|
| SKU | yes | Your internal code |
| Brand | yes | |
| Model | yes | Exact manufacturer model number |
| GTIN / EAN | no | 8, 12, 13 or 14 digits, only off the barcode on the box |
| HSN | no | Only when supplied by an invoice/product master |
| Title | yes | ≤150 chars, "Brand Model — key spec" |
| Description | yes | 2–4 sentences, no ALL CAPS, no phone numbers |
| Category | yes | e.g. Air Conditioner, Refrigerator |
| MRP | yes | Rupees, GST inclusive |
| Selling price | yes | Rupees, GST inclusive, ≤ MRP |
| GST rate | no | Percent, only from a verified commercial source |
| Availability | yes | unknown / in stock / out of stock / preorder / backorder |
| Condition | yes | new / refurbished / used |
| Installation included | no | true or false, only when stated |
| Warranty | no | Months, only when stated |
| Images | yes | See below |
| Weight | no | kg |
| Dimensions | no | mm, L×W×H |
| Capacity | no | e.g. "1.5 Ton", "265 L" |
| BEE star rating | no | 1–5 |
| Inverter | no | true or false |

GTIN improves Merchant matching when the manufacturer assigned one, but it is
not required to render a truthful product page. Photograph the barcode on each
box; never reconstruct a missing value from a pattern.

### 3.4 Product photography

Merchant Center's rules, which are stricter than what the site needs, so
shoot to these and everything downstream works:

- At least 800×800 px; 1600×1600 is better. JPEG or PNG.
- Plain white or very light background.
- The product fills 75–90% of the frame.
- **No watermarks, no logos, no price badges, no "Best Price!" overlays.**
  This is the most common rejection reason.
- Main image is the product alone. Lifestyle and in-situ shots are fine as
  additional images.

A phone camera on a white sheet with daylight is genuinely adequate. Send
originals, not WhatsApp-compressed copies — the build pipeline generates
the AVIF/WebP variants.

### 3.5 Policy pages

Draft text for: return and refund policy, shipping and delivery policy,
warranty and installation policy, privacy policy, terms of service. These
are Merchant Center prerequisites and B2B buyers read them.

---

## 4. What never gets pasted into chat or committed

Public and safe in the repo: GA4 Measurement ID, Sentry DSN, Turnstile site
key, GBP place ID, the WhatsApp number.

Secret, and only ever entered in the provider's own dashboard or as a
Cloudflare secret: Turnstile secret key, Cloudflare API tokens, Google
service-account JSON, Razorpay keys, Figma personal/session tokens, browser
cookies, and any bank or GST portal credentials.

---

## 5. Critical path

```
GBP verification  ────────────────────────┐  (weeks, external)
Cloudflare + DNS  ──┐                     │
Search Console     ├─ first deploy ──┐    │
Coming-soon page  ──┘                │    │
                                     │    │
Product data packet ─────────────────┼────┤
Photography         ─────────────────┤    │
Figma / brand       ─────────────────┘    │
                                          │
                          Merchant Center local listings
```

The first deploy does not wait for any of the content. Ship the coming-soon
page to the real domain as soon as the nameservers resolve, so Search
Console verification and indexing start running in the background while the
catalogue is still being assembled.
