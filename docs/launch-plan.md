# Launch plan

Written 23 September 2026, after reading the Voltas Beko 2026 catalogue
and the revised Figma landing frame.

## What the catalogue actually contains

`VB Product Catalogue 2026.pdf`, 32 pages, produced in Illustrator.
Findings that decide the plan:

- **There is no text layer.** 32 characters across 32 pages. Every page
  is a flattened image, so the extraction that produced the 27 rows was
  done by reading the pages visually, not by parsing text. That is why it
  was slow and why it must continue in small batches.
- **It contains no prices, no GTINs, no HSN codes, no dimensions, no
  weights and no warranty terms.** Those fields were left blank because
  they are genuinely absent, not because the model gave up. No amount of
  re-reading this PDF will fill them.
- **It does contain**, reliably: model codes with every colour variant,
  capacity, colour names, feature lists, and which star ratings each
  model is available in.
- **Product photography is embedded at 300 DPI**, but as whole-page
  renders rather than isolated shots. A single refrigerator cropped out
  of a page lands at roughly **424 x 791 px**.

That last number decides the image plan. Google's current Merchant Center
minimum is 100 x 100, so a 424 x 791 crop is usable today. The minimum
becomes **500 x 500 on 31 January 2027**, which that crop fails on its
short edge. So: crop now to launch, replace before January.

## Sourcing decision

**We do not scrape Amazon, Flipkart or Croma.** Not out of caution — out
of arithmetic. Their photographs belong to the platform or to the seller
who uploaded them; republishing them commercially is infringement. The
same images also fail Merchant Center's duplicate and ownership checks,
and a suspension during the selling season costs more than every hour
saved. Their specifications are reseller-entered and frequently wrong,
which produces returns we pay for.

What we use instead, in order:

1. **The catalogue PDF we already have** — models, capacities, colours,
   features, and crops for launch imagery.
2. **voltasbeko.com and voltas.com** — the brand's own product pages, as
   an authorised distributor. Both are JavaScript applications, so they
   need a rendering fetch rather than a plain one. Worth confirming what
   they publish before relying on them.
3. **The distributor contact** — see below. This is the only route to
   prices, and prices are the blocker.
4. **Our own photography** for anything left over, shot at 1600px.

## What to ask the distributor contact

There is no Voltas channel manager relationship to lean on, but there is
a friend who is among the largest distributors in India. He has, in his
own systems, everything that is missing. Ask for these five things by
name — vague requests get vague answers:

1. **The current DP list (dealer price list)** for Voltas and Voltas Beko,
   as Excel if possible. This is the single most valuable document: it
   carries model code, MRP and dealer price, and usually the GST rate.
   Prices are what is blocking every draft on the site.
2. **The SKU or article master export from his ERP**, with EAN and HSN
   columns. Goods receipt captures EANs, so his system has them even
   though the catalogue does not. Merchant Center will not match a product
   without a GTIN.
3. **The brand asset pack or DAM access.** Voltas Beko runs an image
   library for channel partners. Ask for the folder, or for the login.
   This replaces the catalogue crops and solves the January 2027 problem
   permanently.
4. **Model-level spec sheets**, which carry dimensions, weight and
   warranty terms. Usually one PDF per model on the partner portal.
5. **An introduction to his Voltas area sales manager.** This is the
   quiet one and the most valuable: it converts a favour from a friend
   into a direct channel relationship of our own.

Also worth asking, since he is the person who would know: which of the
164 lines actually move, and which are dead stock. The site should lead
with the twenty-five that sell.

## The revised landing page

The Figma file has been restructured. The landing frame is now
**`278:7354` on Page 1**, 1920 x 3050 — it was 1920 x 2210. About 840px
of new content, and the existing content has changed:

- The hero is now a **blue gradient carousel** with pagination dots and
  arrows, not a flat dark panel.
- The trust row has moved out of the hero into **its own dark band**
  below it, and the copy has changed to "Genuine Voltas Products",
  "Competitive Prices", "Reliable Delivery".
- Navigation gained **Offers**, styled in orange as a highlighted item.
- Below the category strip there are **large VOLTAS-branded promo cards**
  that did not exist before.

This needs the same measured treatment as the previous version: read the
frame at a 1920 viewport, measure the built page against it, and record
the landmarks. It is a rebuild of the hero rather than an adjustment.

## The next few days

**Day 1**
Send the distributor the five-item request. Nothing else unblocks prices,
and everything downstream waits on it. Then rebuild the landing hero to
frame `278:7354` — carousel, trust band, revised navigation.

**Day 2**
Finish the landing page: promo cards and whatever the remaining 840px
holds. Measure against the frame and record the landmarks in the README,
as with the previous three pages.

**Day 3**
Extract the rest of the catalogue in batches of 20–30 using
`docs/gpt-extraction-prompt.md`. Imports merge now, so batches accumulate
safely. Expect every row to land as a draft — that is correct and the
readiness report will say so.

**Day 4**
Crop product images from the catalogue pages at 300 DPI for the top
twenty-five sellers, run them through `scripts/build-images.mts`, and
attach them to those drafts.

**Day 5, or whenever the DP list arrives**
Fill price, GTIN, HSN, GST and warranty for the top twenty-five. Those
rows flip to `active` on import and their pages appear. Ship.

Everything after that is repetition: more rows, more photographs, same
pipeline.

## Still outstanding, unchanged

The WhatsApp number. Every Buy now, every Add to cart and the cart's send
button go nowhere without it. One line in `src/config/site.ts`.
