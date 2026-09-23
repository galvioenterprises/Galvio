# Prompt for extracting product data from a PDF

Paste everything between the rules into ChatGPT, attach the PDF, and
send. The output drops straight into `data/products.csv`.

Work in batches of 20–30 products. A long PDF in one pass produces
confident-looking invented values, which is the one failure mode that
costs real money here.

---

You are helping build the product catalogue for **Galvio Enterprises**, an
authorised **Voltas** and **Voltas Beko** distributor in India selling
direct to customers from a physical showroom.

## What already exists

A static website is live in development. It has a landing page, a
catalogue page, per-category listing pages with filters, and a product
page per SKU. Product data is not in a database — it is a CSV in the
repository that gets compiled into the site at build time. Your job is to
produce rows for that CSV.

The site currently has 20 placeholder products. We are replacing them
with the real range, roughly 150 sellable SKUs across 11 categories.

## Your job

Read the attached PDF and output **CSV rows only** — no prose before or
after, no markdown code fence, no commentary. One row per product.

Use exactly this header, in this order:

```
sku,internal_code,status,brand,series,model,variant_of,gtin,hsn,title,description,category,sub_category,mrp,selling_price,gst_rate,availability,stock_count,condition,installation_included,warranty_months,compressor_warranty_months,weight_kg,length_mm,width_mm,height_mm,capacity,color,star_rating,inverter,rating_value,rating_count,highlights,faqs,image_files
```

## The rule that matters most

**Never invent a value. An empty cell is always better than a guess.**

If the PDF does not state something, leave the cell blank. Do not infer a
price from a similar model, do not reconstruct a GTIN from a pattern, do
not estimate dimensions. Wrong specifications cause returns we pay for
and get merchant accounts suspended — a blank cell costs nothing.

At the very end, after the CSV, add one line starting `NOTES:` listing
anything you were unsure about or had to leave blank in bulk.

## Column rules

**sku** — our internal code. If the PDF has no code of ours, generate
`GAL-<CAT>-<NNN>` where `<CAT>` is AC, RF, WM, CO, WD, WH, ST, FZ, VC,
AP or TV, numbered from 001 within each category.

**internal_code** — the manufacturer or ERP string exactly as printed,
e.g. `RDC 220B / 3S0BTE0M0000GD (3STAR)`. Never shown to customers; used
to match against stock. Copy it verbatim, including the punctuation.

**status** — one of `active`, `discontinued`, `spare`, `not-listed`.
Use `active` for an appliance a customer would buy. Use `not-listed` for
anything that is not a retail appliance: motors, spare parts,
installation kits, pumps, accessories, tablets, bags. Do not delete those
rows — mark them and keep them.

**brand** — `Voltas`, or `Voltas Beko` for refrigerators and washing
machines (model codes starting RDC, RFF or WTT).

**series** — Vertis, Vectra, Venus, Magna, Aqua, Crysta, Minimagic and so
on, where the name contains one.

**model** — the manufacturer model number, without the brand.

**variant_of** — leave blank unless this row is plainly a colour or batch
variant of another row in the same batch (a trailing `-1`, or an
identical name with a different finish code). Then put the *other* row's
`sku` here.

**gtin** — 8, 12, 13 or 14 digits, no spaces or hyphens. **Only from a
printed barcode number.** Leave blank otherwise; it will be collected
from the cartons.

**hsn** — 4 to 8 digits, only if printed.

**title** — the customer-facing name, 150 characters maximum, in the
shape `Brand Capacity Rating Type`, e.g.
`Voltas 1.5 Ton 5 Star Inverter Split Air Conditioner`. Expand
abbreviations: `SAC` is Split Air Conditioner, `WAC` is Window Air
Conditioner, `INV` is Inverter, `T` after a number is Ton, `FS` is Fixed
Speed. Title case. No ALL CAPS, no model codes, no phone numbers.

**description** — two to four plain sentences about what it is and who it
suits, drawn from the PDF. No marketing superlatives, no "best in class".
If the PDF gives you nothing to write from, leave it blank rather than
inventing features.

**category** — exactly one of: `Air Conditioner`, `Refrigerator`,
`Washing Machine`, `Air Cooler`, `Water Dispenser`, `Water Heater`,
`Stabiliser`, `Freezer`, `Visi Cooler`, `Air Purifier`, `Television`.
Spelling and case must match exactly.

**sub_category** — the narrower type, worded identically across rows:
`Split AC`, `Window AC`, `Double Door`, `Single Door`, `Side by Side`,
`Bottom Freezer`, `French Door`, `Front Load`, `Top Load`,
`Semi Automatic`, `Desert`, `Tower`, `Personal`, `Storage`, `Instant`,
`Chest`, `Deep`.

**mrp / selling_price** — rupees, GST inclusive, digits only. Selling
price may not exceed MRP. If only one price is printed, put it in `mrp`
and leave `selling_price` blank.

**gst_rate** — the percentage number only. 28 for air conditioners, 18
for most other appliances. Leave blank if unsure.

**availability** — one of `in_stock`, `out_of_stock`, `preorder`,
`backorder`, or `unknown`, but only when the source explicitly establishes
that state for Galvio's own inventory. A manufacturer catalogue is not a stock
record. Leave this blank when the PDF does not state it; never default to
`in_stock`.

**stock_count** — blank unless the PDF gives a real quantity.

**condition** — `new`.

**installation_included** — `true` or `false`. Leave blank if unstated.

**warranty_months / compressor_warranty_months** — whole months. "1 year
product, 10 years compressor" is `12` and `120`.

**weight_kg / length_mm / width_mm / height_mm** — numbers only, no
units. Convert cm to mm.

**capacity** — with the unit, as the customer would say it: `1.5 Ton`,
`260L`, `7 kg`, `15 L`.

**color** — the finish name as printed.

**star_rating** — 1 to 5, BEE rating only.

**inverter** — `true` or `false`.

**rating_value / rating_count** — **always leave both blank.** These are
customer review scores. We do not have any, and inventing them is both
dishonest and a search-penalty risk.

**highlights** — up to three feature tiles. Records separated by `|`,
fields within a record by `::`, as `Title :: Subtitle :: icon`. The icon
is optional and must be one of `snowflake`, `box`, `bolt`, `gauge`,
`volume`, `leaf`, `shield`, `wrench`. Only from real features in the PDF.
Example:
`Frost Free :: No manual defrosting :: snowflake|260L Capacity :: Ample storage space :: box`

**faqs** — leave blank. These are written by hand.

**image_files** — leave blank. Photographs are matched separately by SKU.

## Formatting

- Quote any field containing a comma. Standard CSV quoting.
- No blank rows, no repeated header, no row numbers.
- If a product appears twice in the PDF at different prices, output the
  row once and mention it in `NOTES:`.

Begin. Output the header, then the rows, then the `NOTES:` line.
