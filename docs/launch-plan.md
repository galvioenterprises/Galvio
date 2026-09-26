# Launch plan

Updated 25 September 2026 after confirming the launch operating model: the
distributor owns inventory and nationwide fulfilment, while the website accepts
cash-on-delivery (COD) orders pending confirmation. Online payment remains later work.

## Current release truth

- The public domain still serves Hostinger's parked-domain page. The local
  export is not the live site yet.
- The catalogue composes source-scoped batches instead of allowing a Voltas
  refresh to replace the master CSV. Product counts are build outputs, not a
  promise in this document; use `pnpm import:products --check data/products.csv`
  for the current publishable/draft totals.
- Voltas catalogue availability is not evidence of distributor stock. A product
  whose baseline availability is `unknown` may still be added to a COD order,
  but **unknown never means in stock**. After deployment, the distributor owns
  the operational price, availability and stock values through the protected
  hosted admin and D1 runtime overrides.
- The matcher applies hard type/model/capacity contradictions, produces
  top-three review candidates and folds duplicate stock aliases. Weak matches
  still require an explicit human decision; a threshold is not product proof.
- Official Voltas galleries are keyed by immutable supplier article number and
  retain the manufacturer's display order, including a 500 px featured image
  when Voltas uses one. The downloader records source URL and SHA-256, replaces
  changed files atomically and fails the batch if any image cannot be verified.
  Gallery counts change as reviewed products are added; source URL and hash are
  retained so every image remains auditable.
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
| Baseline selling price, availability and publication status | Distributor/Galvio | Reviewable repository data; supplier sync cannot replace it |
| Live selling price, stock count and availability | Distributor | Protected hosted admin writes D1 runtime overrides after deployment; storefront and checkout update at runtime, while metadata and structured data update on the next catalogue deployment |
| Shipping serviceability, charges and COD acceptance | Distributor | Operational policy; never inferred from a manufacturer page or product match |
| GTIN, HSN, dimensions, weight, warranty, installation | Source evidence only | Blank and hidden unless the source actually supplies it |
| Ratings and review count | Verified customer-review system | Always blank in catalogue imports |

The operational sequence is:

1. **Stage Voltas refresh** — fetch snapshot, rebuild the match report, apply
   existing human decisions, create `data/sources/voltas-products.csv`, and
   validate it. This does not publish.
2. **Review** — work through the weak queue. Each row shows the stock line,
   evidence, margin and top candidates. A decision is explicit and persistent.
3. **Apply reviewed source changes** — download changed official images,
   compose all source batches with reviewed baseline overrides, run the importer
   in `--check` mode, replace generated JSON only after validation, and rebuild
   image/search assets.
4. **Review the Git diff** — especially product identity, capacity, price and
   stock. A schema can validate structure; it cannot know a plausible capacity
   is the wrong one.
5. **Build and deploy** — data changes do not alter the public static site until
   a new export is deployed.

## Admin boundary

The two admin surfaces have deliberately different jobs:

- The protected hosted `/admin` is the distributor's operational console. Its
  inventory changes write only selling price, MRP, availability and stock count
  to D1 runtime overrides, with actor/time audit history. Orders are re-priced
  from the effective build catalogue plus those overrides.
- `pnpm admin` remains the repository console for source refreshes, weak-match
  review and reviewable baseline catalogue changes. Keep it on
  `127.0.0.1:4100`; never expose this local Node process to the internet.

The production boundary is:

```
Cloudflare Access login
        │
static /admin UI
        │ authenticated API request
Cloudflare Worker
        ├── D1 runtime inventory overrides + audit history
        └── D1 COD orders, customer/order state
```

The hosted path still requires a real D1 database ID, `ADMIN_EMAILS`,
`CODE_PEPPER`, the required email configuration, and Cloudflare Access policies
for `/admin/*` and `/api/admin/*`. An application login is not a substitute for
the Access layer. Runtime overrides are operational state; manufacturer facts,
new products and source copy stay in Git and go through the reviewed import and
deployment workflow.

## Figma implementation boundary

The current landing frame is **`347:146`**, not the obsolete `278:7354` listed
in the previous plan. The launch-critical pages are the landing,
catalogue/listing, product, cart, COD checkout, offers, about, contact, store,
policies and bulk-order enquiry flows. The homepage should follow the current
frame's full sequence: hero, trust band, category strip, promo pair, deals,
buying assistant, expert CTA, value props, popular searches and footer.

Cart and COD order intake are Phase 1. Adding an item to the cart records
shopping intent only. Submitting the cart creates an order in the **Order
placed — confirmation pending** state, not a distributor-confirmed order. When the distributor has supplied a counted stock
quantity, the backend creates an internal hold and decrements that count to
prevent overselling; unknown inventory is not presented as confirmed stock.
That internal hold is not a fulfilment promise. The distributor must still
confirm the order after checking product identity, current price, stock and
delivery serviceability. The checkout flow must say this before submission and
again in its acknowledgement.

The Worker and D1 order backend now support COD order intake, customer order
state and the protected hosted admin. Guest checkout is the default; an account
is optional. The first internal `placed` state is shown as **Order placed —
confirmation pending**, not stock confirmed. The acknowledgement must use the same language and must not
promise fulfilment before the distributor moves the order to `confirmed`.

Online payment is not part of Phase 1. The Cashfree implementation is retained
as dormant later work behind `business.onlinePayments = false`; payment routes,
EMI copy and online-payment choices must remain absent from the public flow.

The bulk-order page currently prepares an email (and will add WhatsApp once the
number exists) without transmitting or storing personal data on the static
site. A real RFQ submission endpoint remains Worker + Turnstile work.

## Launch gates, in order

### P0 — security and business truth

1. Revoke the Figma sessions/tokens exposed in the shared curl command and sign
   in again. Use a scoped token from a secret store; never paste session cookies
   into chat, source files or shell history.
2. Supply the business WhatsApp number, phone, exact showroom address and
   verified hours. Do not invent any of those values.
3. Publish the approved commercial rules consistently: nationwide delivery,
   free delivery, delivery in 2–3 days after distributor confirmation, a
   ₹50,000 COD cap, a seven-day qualifying exchange policy, and the documented
   installation inclusions/extras. The wording must distinguish order placement
   from distributor confirmation.
4. Finish the remaining weak-match review queue. Never use an “import all weak”
   switch; it was removed because it would turn suggestions into products.

### P0 — deployment

5. Decide the Cloudflare production account/project and connect the canonical
   domain. Keep `galvioenterprises.com` canonical and add a strict
   `www.galvioenterprises.com` → apex redirect before exposing admin paths;
   otherwise the `www` hostname needs the same Worker route and Access policy.
   Deploy the validated static export; confirm the parked page is gone.
6. Create the production D1 database, apply every migration, replace the
   placeholder database ID, configure `ADMIN_EMAILS`, a generated
   `CODE_PEPPER`, `ADMIN_API_TOKEN` and transactional notification secrets,
   and restrict `/admin/*` plus
   `/api/admin/*` with Cloudflare Access. Configure the application paths as
   `galvioenterprises.com/admin` and `galvioenterprises.com/api/admin` so each
   parent and its descendants are covered. Add only the exact owner and
   distributor email addresses to the Allow policy.
7. Exercise the hosted inventory override path and its audit history before the
   distributor takes ownership of post-deployment inventory and shipping work.
8. Assign an owner and response-time target for every phone-only COD order.
   Transactional email reaches only customers who supplied an email address, so
   the distributor must call or WhatsApp those customers and share confirmation,
   status and tracking updates manually until transactional SMS/WhatsApp exists.
9. Before publishing a coupon campaign, test its active dates, minimum order,
   usage limit, discount cap, cart quote and final COD order total end to end.
10. Run the release checks against the deployed hostname: canonical redirects,
   every route, responsive images, Add-to-cart state, complete COD order
   handoff, acknowledgement wording, structured data, sitemap, robots, 404,
   mobile navigation and a real-device pass.

### P1 — catalogue depth and acquisition

11. Request the current DP list, ERP article master with EAN/HSN, channel asset
   kit and model spec sheets. Missing GTIN/HSN/dimensions remain blank until
   those sources arrive.
12. Continue the image-only PDF in reviewed 20–30-row batches. The 500 × 500
   Merchant image minimum takes effect on 31 January 2027; replace narrow PDF
   crops with the channel asset kit or original 1600px photography before then.
13. Complete the authenticated RFQ submission and abuse-protection path if bulk
    requests must be stored rather than handed off to email/WhatsApp.
14. Enable the dormant payment gateway only after its commercial account,
    settlement ownership, refund process and webhook-backed order states are
    approved. COD launch does not depend on exposing a non-functional payment
    option.

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
