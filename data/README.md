# Product data

## The workflow

```
Google Sheet  ──export CSV──►  data/products.csv  ──pnpm import:products──►  data/products/*.json  ──►  site build
   (you)                          (source of truth,          (generated,               (static pages)
                                   committed)                 committed, never
                                                              hand-edited)
```

Fill the spreadsheet. Export it as CSV over `data/products.csv`. Run:

```bash
pnpm import:products
```

The importer validates every row against `src/lib/product-schema.ts` and
writes one JSON file per product. If anything is wrong it prints the
spreadsheet row number and the specific field, and writes nothing at all —
a half-imported catalogue is worse than none.

`data/products.template.csv` is the blank header row plus one filled
example. Copy it into a Google Sheet and share the sheet with whoever is
collecting the data; a spreadsheet is the right tool for a person entering
20 products, and JSON is the right tool for a build. The importer is the
only bridge, which is why the generated JSON must never be hand-edited —
the next import overwrites it.

## Column notes

- **gtin** — the barcode number on the box. 8, 12, 13 or 14 digits, no
  spaces or hyphens. Photographing each box is usually faster than typing.
  Without it the product is not eligible for free Google listings.
- **availability** — one of `in_stock`, `out_of_stock`, `preorder`,
  `backorder`.
- **condition** — one of `new`, `refurbished`, `used`.
- **mrp / selling_price** — rupees, GST inclusive. `₹` and thousands commas
  are tolerated. Selling price may not exceed MRP.
- **installation_included / inverter** — `true` or `false` (`yes`/`no` also
  accepted).
- **sub_category** — the narrower type within the category, e.g. "Double
  Door" or "Split AC". This becomes the first filter group on the listing
  page, so keep the wording identical across rows.
- **capacity** — include the unit: "260L", "1.5 Ton". Litre capacities are
  grouped into 100L bands on the listing page automatically, so you do not
  need to round them yourself.
- **stock_count** — units on hand. Leave blank unless the number is real.
  When it is 5 or fewer the card shows an "Only N left" badge.
- **rating_value / rating_count** — leave both blank until you have real
  reviews. A rating shown from invented numbers is a lie to the customer
  and, once it reaches the structured data Google reads, a manual-action
  risk. Both columns must be filled or neither is used.
- **image_files** — filenames only, separated by `|`, in display order.
  The first one is the main image. The files themselves go in
  `public/images/products/`.
- **description** — must be quoted in the CSV if it contains a comma. A
  spreadsheet export handles this automatically.

- **compressor_warranty_months** — separate from the appliance warranty
  because it is usually far longer and is a real purchase driver. It gets
  its own card on the product page.
- **highlights** — the feature tiles under "Product Overview". Records are
  separated by `|` and fields within a record by `::`, as
  `Title :: Subtitle :: icon`. The icon is optional and must be one of
  `snowflake`, `box`, `bolt`, `gauge`, `volume`, `leaf`, `shield`,
  `wrench`. Leave the column blank and the page derives tiles from
  capacity, star rating and compressor type instead.
- **faqs** — same shape: `Question :: Answer`, records separated by `|`.
  These render as an accordion and as FAQPage structured data, which is
  its own search-result surface. Worth filling in for the top sellers.

Leave optional columns blank rather than writing "N/A" or "-".

## Sample data

`data/products.sample.csv` is a placeholder catalogue that exists so the
pages can be built and reviewed before the real product data is collected.

```bash
pnpm import:products data/products.sample.csv   # load the placeholders
pnpm dev                                        # or pnpm build:preview
```

Every sample SKU starts with `SAMPLE-`, and `pnpm build` refuses to run
while any of them are still in `data/products/`. That guard is deliberate:
a warning in a build log is a warning nobody reads until a customer asks
why the fridge has no photograph. Use `pnpm build:preview` when you mean
to build with placeholders, and delete the sample import by running
`pnpm import:products` against the real spreadsheet.

## Why files and not a database

Twenty products that change a few times a month do not need a database.
Keeping the catalogue in Git means every price change is a reviewable diff
with an author and a date, the site has no runtime data dependency that can
fail during the Diwali season, and rolling back a bad price is `git revert`.

The schema is shaped after the Google Merchant Center feed, so when Phase 2
adds checkout and a real inventory system, the same records move into it
without remodelling.
