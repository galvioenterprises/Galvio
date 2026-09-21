# Sourcing and storing the catalogue

Written against the 164-line stock list supplied in September 2026.

## 1. What that list actually is

It is an ERP stock export, not a catalogue. Classified automatically:

| Count | Category |
|---|---|
| 36 | Air Conditioners (split and window) |
| 32 | Air Coolers |
| 23 | Refrigerators |
| 22 | Water Heaters |
| 11 | Washing Machines |
| 11 | Freezers (chest and deep) |
| 6 | Stabilisers |
| 3 | Water Dispensers |
| 2 | Visi Coolers |
| 1 | Television |
| 1 | Air Purifier |
| 13 | Not sellable listings |
| 3 | Needs a human to classify |

Things the list tells us that matter more than the count:

- **The site needs five more categories** than the design has: Water
  Heaters, Stabilisers, Freezers, Visi Coolers and Air Purifiers. Eleven
  in total, not six.
- **Refrigerators and washing machines are Voltas Beko**, not Voltas. The
  `RDC` / `RFF` / `WTT` codes belong to the Voltas-Arçelik joint venture,
  which is a separate brand entity with its own asset library. Two asset
  requests, not one.
- **Thirteen rows are not products a customer buys online**: `SPARE
  PARTS`, `EPIC MOTOR`, `Syncronous Motor (AUTOSWING)`, `MIST Electric
  Motor`, `PLASTIC SUMBERSIBLE PUMP (C) 18%`, `INSTALLATION KIT(CU)`,
  `Luggage Bag`, `SS HAFRB TAB A7 LITE` and similar. They belong in the
  stock system, not the storefront.
- **One row has a GST rate leaking into the name** (`… PUMP (C) 18%`),
  which is a reliable sign the export was never meant to be read by a
  customer.
- **There are duplicates and variants**: `VICTOR 55` and `Voltas Air
  Cooler Victor 55` are the same cooler; the `-1` suffixes and the codes
  after the `/` are colour and batch variants of one product.

None of that is a technical problem. It is an editorial one, and it is
the real bottleneck — see §6.

## 2. Where the product details come from

**Do not scrape Amazon, Flipkart or Croma.** Three separate reasons, any
one of which is sufficient:

1. **Copyright.** Those photographs belong to the platform or to the
   seller who uploaded them. Republishing them commercially is
   infringement, and the fact that the product is the same does not make
   the photograph yours.
2. **Terms of service.** All three prohibit scraping. In practice it also
   ends with the IP blocked, usually mid-import.
3. **Accuracy.** Marketplace specifications are reseller-entered and
   frequently wrong. Wrong specifications on our site mean returns we pay
   for, and they are a common cause of Merchant Center suspension.

The correct sources, in the order to pursue them:

1. **The Voltas and Voltas Beko channel managers.** An authorised
   distributor is entitled to the brand asset kit and the product master.
   There is no public self-serve dealer portal — it comes through the
   area or channel manager. Ask specifically for: the product master
   (model, MRP, specifications, EAN/GTIN, HSN), the image pack,
   spec-sheet PDFs, and the brand guidelines covering our use of them.
   **This has the longest lead time of anything in this document; send
   the email before doing anything else.**
2. **voltas.com product pages**, as an authoritative cross-check on
   specifications. Using the imagery is fine *under* the distributor
   agreement's brand-asset clause — get that permission in writing rather
   than assuming it.
3. **The carton.** GTIN/EAN, HSN and the exact model string. This is the
   only reliable source for GTIN, and Merchant Center will not match a
   product without one.
4. **Our own photography**, for anything the brand does not cover — and
   it is worth doing even where the brand does. Every dealer in the
   country uses the same brand asset; a unique photograph is a ranking
   advantage, not just a fallback.

## 3. Images, specifically

Google's requirements are tightening on a known date, so shoot to the
2027 rule now rather than redoing it:

- **500 × 500 becomes the hard minimum on 31 January 2027.** Today 100 ×
  100 still passes with a warning. **1500 × 1500 or larger is what to
  collect**, and 1600px is what our pipeline expects as a source.
- **No watermarks, promotional text, borders or retailer marks.** Google
  treats them as obstructing the product, and it is the most common
  rejection reason.
- **Do not generate product shots with AI.** From 2026 an AI-generated
  main image must carry a visible AI watermark, which collides directly
  with the no-watermark rule above.
- Main image: the product alone on white. Additional images earn their
  place by adding an angle, a detail, a sense of scale, or context.

Volume: 164 SKUs at three images each is roughly 500 source files. The
pipeline handles that fine on size — the whole current set is 72KB — but
it re-encodes every source on every build. At 500 files that is 3000
encodes per build and will need a content-hash cache before the catalogue
is fully loaded.

## 4. How to store it

Keep the model that is already here: source files in Git, compiled at
build time. It scales comfortably to a few thousand products, every price
change is a reviewable diff with an author and a date, and there is no
runtime data dependency to fail during the season.

Three changes it needs:

**Split the spreadsheet per category.** One 164-row by 31-column sheet is
unusable. `data/sheets/air-conditioners.csv`,
`data/sheets/water-heaters.csv` and so on, merged by the importer. The
columns that matter differ per category anyway, and separate sheets let
several people fill them in at once.

**One folder of images per SKU**, `assets/products/<sku>/1.jpg`. The
pipeline walks the folder and matches by SKU, so nobody maintains
filenames in a spreadsheet — which is the part that always drifts.

**Four new fields:**

| Field | Why |
|---|---|
| `internalCode` | The ERP string (`RDC 220B / 3S0BTE0M0000GD`), kept for matching against stock, never displayed |
| `series` | Vertis, Vectra, Magna, Aqua, Crysta. Voltas organises by series and customers search by it |
| `variantOf` | Groups the colour and batch variants so one product page offers finishes instead of six near-identical pages competing with each other |
| `status` | `active` / `discontinued` / `spare` / `not-listed` |

`status` is the important one. It means the whole ERP dump can be
imported as-is, the 13 non-listings marked once, and the site builds only
what is `active`. Without it somebody maintains two lists by hand, and
the second one goes stale within a month.

## 5. Where this stops working

Move to a database when stock and price need to change more than once a
day, or when someone non-technical needs to edit prices without a deploy.
Neither is true before Diwali, and neither is worth solving now.

## 6. Extracting from a supplier PDF

`docs/gpt-extraction-prompt.md` is a prompt to paste into ChatGPT with
the PDF attached. It produces CSV rows in exactly the shape the importer
expects.

Two things in it are load-bearing. It instructs the model never to invent
a value, because an empty cell costs nothing and a confidently wrong
specification costs a return. And it forbids filling in `rating_value`
and `rating_count`, which a language model will otherwise cheerfully
fabricate. Work in batches of 20–30; a long PDF in one pass is where
invention creeps in.

Whatever comes back still needs a human read before import. The importer
will catch structural errors — a bad GTIN, a selling price above MRP, a
missing category — but it cannot tell you the capacity is wrong.

## 7. What to do, in order

1. **Email both channel managers today** — Voltas and Voltas Beko — for
   the asset kit and product master. Everything else is faster than this.
2. **Editorial pass on the 164 lines.** Mark the 13 non-listings, merge
   the duplicates, group the variants, and write a customer-facing name
   for each survivor. This is human work and it is the bottleneck.
3. **Start with the top 25 sellers, not all 164.** Those pages earn while
   the rest are prepared, and they prove the shape before it is repeated
   140 times.
4. **Photograph in-store** whatever the brand kit does not cover, at
   1600px on white.
