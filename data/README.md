# Product data

## The workflow

```
PDF / supplier batches ──► data/sources/*.csv ──┐
                                                ├─ pnpm compose:products ─► data/products.csv
Dealer price/stock edits ─► inventory-overrides.json ─┘                           │
                                                                 pnpm import:products
                                                                                 │
                                                                 data/products/*.json
                                                                      (generated)
```

Keep each reviewed supplier batch under `data/sources/`. Compose the complete
catalogue, validate it without writes, and only then replace generated JSON:

```bash
pnpm compose:products
pnpm import:products --check data/products.csv
pnpm import:products --replace data/products.csv
```

Direct imports still merge by SKU by default and remain useful for checking an
isolated batch. `--replace` is reserved for the composed complete catalogue.

`pnpm sync:voltas -- --images-only` refreshes only the official image arrays in
the cached manufacturer snapshot. Use it when gallery ordering or hero photos
changed but prices and copy are not part of the review; the normal
`pnpm sync:voltas` command refreshes the complete staged snapshot.

The importer keeps identity-complete rows as invisible drafts when commercial
fields are still missing. Complete rows must satisfy the strict schema in
`src/lib/product-schema.ts`; malformed supplied values, unknown categories and
missing variant parents fail with the spreadsheet row number. Nothing is
written unless the whole batch validates, and the finished catalogue is
staged before it replaces the previous directory.

Rows carrying `variant_of` are stored inside that canonical SKU's `variants`
array rather than becoming duplicate product pages.

`data/products.template.csv` is the blank header row plus one filled
example. Copy it into a Google Sheet and share the sheet with whoever is
collecting the data; a spreadsheet is the right tool for a person entering
20 products, and JSON is the right tool for a build. The importer is the only
bridge to generated JSON, which is why `data/products/*.json` must never be
hand-edited. The local inventory console writes dealer-owned fields to
`data/sources/inventory-overrides.json`; composition applies them after
supplier facts, so a Voltas refresh cannot overwrite local stock, price,
availability or publication decisions.

## Column notes

- **gtin** — the barcode number on the box. 8, 12, 13 or 14 digits, no
  spaces or hyphens. Photographing each box is usually faster than typing.
  Without it the product is not eligible for free Google listings.
- **availability** — one of `unknown`, `in_stock`, `out_of_stock`,
  `preorder`, `backorder`. Manufacturer catalogue availability is not Galvio
  showroom stock; use `unknown` until a person confirms inventory.
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
- **rating_value / rating_count** — always leave both blank. The importer
  rejects either field when supplied, so supplier data cannot create review
  markup. Real customer reviews need a separate verified system later.
- **image_files** — processed asset keys, separated by `|`, in display order.
  The first one is the main image. Source photographs live under
  `assets/products/<asset-key>/`; `pnpm build:images` generates the public
  AVIF/WebP files and manifest. The Voltas bridge keeps every unique official
  image in the manufacturer's order, naming later shots `<asset-key>-2`,
  `<asset-key>-3`, and so on.
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
pnpm import:products --replace data/products.sample.csv   # load only placeholders
pnpm dev                                        # or pnpm build:preview
```

Every sample SKU starts with `SAMPLE-`, and `pnpm build` refuses to run
while any of them are still in `data/products/`. That guard is deliberate:
a warning in a build log is a warning nobody reads until a customer asks
why the fridge has no photograph. Use `pnpm build:preview` when you mean
to build with placeholders. Once the real CSV is a complete catalogue,
replace the samples with `pnpm import:products --replace data/products.csv`;
while extraction is still arriving in batches, keep using the default merge.

## Why files and not a database

Twenty products that change a few times a month do not need a database.
Keeping the catalogue in Git means every price change is a reviewable diff
with an author and a date, the site has no runtime data dependency that can
fail during the Diwali season, and rolling back a bad price is `git revert`.

The schema is shaped after the Google Merchant Center feed, so when Phase 2
adds checkout and a real inventory system, the same records move into it
without remodelling.
