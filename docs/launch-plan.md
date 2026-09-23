# Launch plan

Updated 23 September 2026 after auditing the supplier sync, the current Figma
file and the local/static deployment boundary.

## Current release truth

- The public domain still serves Hostinger's parked-domain page. The local
  export is not the live site yet.
- The catalogue now composes two source-scoped batches instead of allowing a
  Voltas refresh to replace the master CSV:
  - **33 unique manufacturer-backed products** are publishable: 14 air
    conditioners, 13 air coolers, 4 stabilisers, 1 freezer and 1 visi cooler.
  - All 33 use `availability: unknown`. Voltas catalogue availability is not
    evidence of Galvio showroom stock, so they show **Confirm availability**
    and use enquiry actions rather than Buy/Add to cart.
  - The PDF work is preserved as **14 canonical drafts** containing 27 source
    rows after colour variants are folded.
- The old matcher produced 45 “confident” lines but at least eight were false
  and seven supplier article codes were duplicated. The replacement applies
  hard type/model/capacity contradictions, produces top-three review
  candidates and folds duplicate stock aliases. Current result: 35 safe stock
  lines become 33 unique products; 47 remain for human review; 82 have no safe
  candidate.
- Official Voltas galleries are keyed by immutable supplier article number and
  retain the manufacturer's display order, including a 500 px featured image
  when Voltas uses one. The downloader records source URL and SHA-256, replaces
  changed files atomically and fails the batch if any image cannot be verified.
  The current 33-product storefront has 343 verified images, with 3–20 images
  per product.
- `rating_value` and `rating_count` are rejected by the importer. No review
  aggregate can be created from supplier data.
- The configured public taxonomy is the agreed 11 categories. The one exact
  microwave match is reported but remains outside the catalogue until the
  business explicitly expands scope.

## Safe catalogue workflow

The manufacturer site is a source for manufacturer facts, not dealer facts.
Those ownership boundaries are now explicit:

| Field group | Owner | Sync behaviour |
|---|---|---|
| Title, description, model, official images, manufacturer MRP | Voltas snapshot | May be refreshed into a staged supplier batch |
| Manufacturer-listed web price | Voltas snapshot | May seed the staged listing; it is not proof of Galvio's final quote |
| Galvio price override, stock count, availability, publication status | Galvio | Stored in `inventory-overrides.json`; supplier sync cannot replace it |
| GTIN, HSN, dimensions, weight, warranty, installation | Source evidence only | Blank and hidden unless the source actually supplies it |
| Ratings and review count | Verified customer-review system | Always blank in catalogue imports |

The operational sequence is:

1. **Stage Voltas refresh** — fetch snapshot, rebuild the match report, apply
   existing human decisions, create `data/sources/voltas-products.csv`, and
   validate it. This does not publish.
2. **Review** — work through the weak queue. Each row shows the stock line,
   evidence, margin and top candidates. A decision is explicit and persistent.
3. **Apply reviewed changes** — download changed official images, compose all
   source batches with dealer overrides, run the importer in `--check` mode,
   replace generated JSON only after validation, and rebuild image/search
   assets.
4. **Review the Git diff** — especially product identity, capacity, price and
   stock. A schema can validate structure; it cannot know a plausible capacity
   is the wrong one.
5. **Build and deploy** — data changes do not alter the public static site until
   a new export is deployed.

## Admin boundary

`pnpm admin` starts the repository console on `127.0.0.1:4100`. It now prints a
random token in the URL, requires that token on every API request, accepts POSTs
only from its own origin, limits request bodies, validates an allowlist of
editable fields, writes atomically, escapes supplier content by building DOM
nodes, prevents concurrent syncs and records `updatedAt`/`updatedBy` with each
dealer override.

Loopback plus a token protects a tool on this computer; it does not make it a
hosted `/admin` for another person. The production site is a static export and
cannot securely write repository files. The hosted design is:

```
Cloudflare Access login
        │
static /admin UI
        │ signed request
Cloudflare Worker
        │ GitHub App / workflow
reviewable catalogue branch or PR
        │ validation + build
production deploy
```

Do not expose the local Node server to the internet and do not ship a
client-side password. Building the hosted path requires the Cloudflare account,
allowed user email(s), a repository write credential and the deployment
workflow decision.

## Figma implementation boundary

The current landing frame is **`347:146`**, not the obsolete `278:7354` listed
in the previous plan. The launch-critical static pages are the landing,
catalogue/listing, product, cart/enquiry, offers, about, contact, store,
policies and bulk-order enquiry flows. The homepage should follow the current
frame's full sequence: hero, trust band, category strip, promo pair, deals,
buying assistant, expert CTA, value props, popular searches and footer.

Checkout, Payment, Order Confirmation, Track Order and My Orders are deliberate
Phase 2 work. Their Figma frames contain decorative order/customer/payment
state, but this release has no identity system, payment gateway or order
database. Static lookalikes would mislead customers and must not be deployed.

The bulk-order page currently prepares an email (and will add WhatsApp once the
number exists) without transmitting or storing personal data on the static
site. A real RFQ submission endpoint remains Worker + Turnstile work.

## Launch gates, in order

### P0 — security and business truth

1. Revoke the Figma sessions/tokens exposed in the shared curl command and sign
   in again. Use a scoped token from a secret store; never paste session cookies
   into chat, source files or shell history.
2. Supply the business WhatsApp number, phone, exact showroom address, verified
   hours, delivery area, return terms and warranty wording. Current TODO values
   must not become public commitments by accident.
3. Have the distributor confirm Galvio stock, selling price and which of the 33
   staged models are actually offered. Apply those values as dealer overrides.
4. Finish the 47-row review queue. Never use an “import all weak” switch; it was
   removed because it would turn suggestions into products.

### P0 — deployment

5. Decide the Cloudflare production account/project and connect the canonical
   domain. Deploy the validated static export; confirm the parked page is gone.
6. If the distributor friend needs remote inventory access for launch, provide
   Cloudflare Access identities and choose the Worker-to-GitHub write workflow.
   Otherwise keep `pnpm admin` local for Phase 1.
7. Run the release checks against the deployed hostname: canonical redirects,
   every route, responsive images, enquiry links, structured data, sitemap,
   robots, 404, mobile navigation and a real-device pass.

### P1 — catalogue depth and acquisition

8. Request the current DP list, ERP article master with EAN/HSN, channel asset
   kit and model spec sheets. Missing GTIN/HSN/dimensions remain blank until
   those sources arrive.
9. Continue the image-only PDF in reviewed 20–30-row batches. The 500 × 500
   Merchant image minimum takes effect on 31 January 2027; replace narrow PDF
   crops with the channel asset kit or original 1600px photography before then.
10. Build the authenticated RFQ Worker, Turnstile validation and notification
    path; then switch the bulk form from email preparation to direct submission.

## Release commands

```bash
pnpm sync:voltas
pnpm match:voltas -- --csv data/sources/voltas-match-report.tsv
pnpm bridge:voltas
pnpm import:products --check data/sources/voltas-products.csv
pnpm sync:images
pnpm compose:products
pnpm import:products --check data/products.csv
pnpm import:products --replace data/products.csv
pnpm build
```

For a gallery-only correction, use `pnpm sync:voltas -- --images-only` instead
of the full first command so manufacturer prices and copy stay untouched.

Never run a supplier refresh straight through to publication. “Schema valid”
means the row has the required shape; it does not mean the match, capacity,
price or inventory claim is correct.
