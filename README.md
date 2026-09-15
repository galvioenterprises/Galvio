# Galvio Enterprises — galvioenterprises.com

Static marketing and catalogue site for an electronics distributor selling
direct to customers, plus a separate bulk/RFQ funnel.

## Architecture

Phase 1 is deliberately a fully static site. `next build` produces an `out/`
directory of plain HTML, CSS and JS which Cloudflare serves as static
assets. There is no application server, no database and no auth in
production, which removes runtime infrastructure as a class of failure
ahead of the Diwali season.

```
GitHub ──► next build (output: "export") ──► out/ ──► Cloudflare static assets
                                                            │
                                        bulk RFQ form ──► Cloudflare Worker + Turnstile
```

Product data is entered in a spreadsheet, exported to `data/products.csv`
and compiled by `pnpm import:products` into per-product JSON, validated
against the Zod schema in `src/lib/product-schema.ts`. The schema mirrors
the Google Merchant Center product feed so the same records can drive a feed
in Phase 2 without remodelling. See [data/README.md](data/README.md).

`tenantId` is present in the data model so a second distributor can be
onboarded later. Multi-tenancy is **not** implemented and should not be.

Deferred to Phase 2, after Diwali: online checkout, Merchant Center online
feed, a database, and any server runtime (vinext/OpenNext) — the latter is
still beta and has no place on a revenue-critical site under a seasonal
deadline.

## Stack

- Node 24.20.0 (Active LTS "Krypton"), pnpm 12
- Next.js 16.3.4, App Router, TypeScript, `output: "export"`
- Tailwind CSS v4
- Zod for product data validation
- sharp for the build-time image pipeline
- Cloudflare for DNS, CDN and static asset hosting; Wrangler for deploys

Use pnpm, never npm. Two lockfiles that disagree is how a build passes
locally and fails in CI.

### Version policy

Everything sits on the newest release the whole toolchain agrees on, which
is not always the newest release that exists. Three packages are pinned
below their latest on purpose — leave them alone until the note stops being
true, then upgrade and delete the note.

| Pinned | Latest | Why |
|---|---|---|
| Node 24.20.0 | 26.8.1 | 26 is Node's "Current" line, not LTS until October 2026. 24 is the Active LTS. |
| typescript 5.9.3 | 7.0.2 | typescript-eslint has no TS 7 support yet, so TS 7 turns `pnpm lint` into a hard crash. |
| eslint 9.39.5 | 10.10.0 | eslint-config-next 16.3.4 bundles eslint-plugin-react 7.37.5, which breaks on ESLint 10 (`contextOrFilename.getFilename is not a function`). |

`@types/node` tracks the Node **runtime** major (24), not its own latest
(26). Typing against APIs the runtime does not have is how you get code
that compiles and then throws.

## Pages

| Route | What it is |
|---|---|
| `/` | Landing page: hero, category strip, top deals, value props, expert CTA |
| `/products/` | Category index |
| `/products/[category]/` | Listing page: filters, sort, grid and list views, pagination |
| `/product/[slug]/` | Product detail: gallery, sticky section nav, overview, specs, warranty, delivery, FAQs |

Filtering, sorting and pagination all run client-side over the products
already embedded in the page. With a catalogue this size that is far
cheaper than a round trip, and it keeps the site static.

### Structured data

Treat it as load-bearing — it is what makes these pages eligible for free
Google listings and rich results.

| Page | Emits |
|---|---|
| Home | `Organization`, upgrading to `Store` once the address is filled in |
| Listing | `BreadcrumbList`, `ItemList` |
| Product | `BreadcrumbList`, `Product` with a full `Offer` (GTIN, schema.org availability and condition), `FAQPage` when the product has FAQs |

The name, address and phone in `src/config/site.ts` must match the Google
Business Profile character for character. If they differ, Google treats
them as two different businesses and the local listing stops inheriting
the website's authority.

The product page renders every section into the HTML and uses the tab bar
to scroll between them, rather than hiding sections behind a click.
Content behind a click is content Google weighs less and a customer never
scrolls past.

### Deliberate differences from the Figma frames

The design was drawn for a full storefront. Phase 1 has no cart, no
accounts and no checkout, so rather than render controls that do nothing:

- **Add to cart** is an **Enquire** button that opens WhatsApp with the
  product, SKU and price already in the message.
- The header's **cart and account icons** are replaced by a single
  WhatsApp action.
- The card's **wishlist heart and compare toggle** are omitted; both need
  persisted per-visitor state that does not exist yet.
- The **"Only 2 left"** badge renders only when a product has a real
  `stock_count`, and otherwise gives its slot to out-of-stock, pre-order
  and backorder states.
- **Star ratings** render only when a product has a real rating.
- Navigation items whose pages are not built yet render as plain text
  rather than links, so nothing in the header 404s. Flip `ready` in
  `src/config/nav.ts` as each page lands. Category links everywhere are
  built from categories that actually have products, never from config.
- **Buy now** is not rendered — there is nothing to buy through yet.
- The product page's **pincode check** answers from
  `site.serviceablePincodes`. Until that list is filled in it shows a
  plain message instead, because a box that approves every pincode is
  worse than no box: the customer plans around it.

### Not built: the commerce flow

The Figma `Final` page also contains **Add to cart, Checkout, Payment,
Order Confirmation, Track Order** and **My Orders**. None of them are
built. Each needs some combination of cart state, customer accounts, a
payment gateway and an order database, and this site is a static export
with no server. A checkout that renders but cannot take an order is worse
than no checkout, and a payment form that cannot take a payment should
never be deployed at all. These are Phase 2, after the season.

## Commands

```bash
pnpm dev         # local dev server
pnpm build       # static export to out/
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm preview     # serve out/ the way Cloudflare will
pnpm import:products   # data/products.csv -> data/products/*.json
pnpm build:preview     # static export, allowing the SAMPLE- placeholders
pnpm deploy      # build, then wrangler deploy
```

## Before launch

See [docs/launch-prerequisites.md](docs/launch-prerequisites.md) for the
accounts, verifications and product data that have to be gathered by hand.
Google Business Profile verification is the critical path — it is external,
slow, and everything in the local commerce strategy depends on it.
