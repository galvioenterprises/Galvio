# Galvio Enterprises — galvioenterprises.com

Static-first catalogue and COD-ordering site for an electronics distributor
selling direct to customers, plus a separate bulk/RFQ funnel.

## Architecture

Phase 1 keeps browsing static and isolates dynamic commerce under `/api/*`.
`next build` produces an `out/` directory of HTML, CSS and JS which
Cloudflare serves directly. A Cloudflare Worker handles COD orders,
sessions, customer order state and the protected distributor admin; D1 stores
only dynamic operational data.

```
source CSV batches + reviewed baseline ──► validated products.csv ──► out/
                                                                        │
Browser ──► Cloudflare ──┬─ static pages/assets ─────────────────────────┘
                         └─ /api/* ──► Worker ──► D1 orders/runtime inventory
```

Product facts are kept in source-scoped CSV batches. `pnpm compose:products`
creates `data/products.csv`, and the importer validates it before generating
per-product JSON. See [data/README.md](data/README.md). Manufacturer facts and
new SKUs remain reviewable build inputs. After deployment, the distributor
manages live MRP, selling price, availability and stock count through protected
D1 runtime overrides; those changes do not rewrite source data.

`tenantId` is present in the data model so a second distributor can be
onboarded later. Multi-tenancy is **not** implemented and should not be.

Online payment is deferred. The existing Cashfree path remains dormant behind
`business.onlinePayments = false`; Phase 1 is COD-only and exposes no payment
or EMI claims.

## Stack

- Node 24.20.0 (Active LTS "Krypton"), pnpm 12
- Next.js 16.3.4, App Router, TypeScript, `output: "export"`
- Tailwind CSS v4
- Zod for product data validation
- sharp for the build-time image pipeline
- Cloudflare for DNS, CDN and static assets; Workers/D1 for COD and admin;
  Wrangler for migrations, previews and deploys

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
| `/products/` | Every product in one grid, category demoted to a filter |
| `/products/[category]/` | Listing page: filters, sort, grid and list views, pagination |
| `/product/[slug]/` | Product detail: gallery, sticky section nav, overview, specs, warranty, delivery, FAQs |
| `/offers/` | Discounted manufacturer listings, with availability confirmed separately |
| `/cart/` | Cart with COD-order summary and a sticky mobile checkout action |
| `/checkout/` | Guest-first delivery details and COD order review |
| `/checkout/complete/` | Order placement acknowledgement with confirmation still pending |
| `/account/` | Optional sign-in, saved details and customer order history |
| `/admin/` | Protected distributor orders, runtime inventory, coupons and verified reviews |
| `/compare/` | Customer comparison using supplied specifications |
| `/search/` | Search results from the generated static index |
| `/bulk-orders/` | Static bulk-enquiry form that prepares email/WhatsApp copy |
| `/about/` | Who we are, and why a single-brand distributorship |
| `/contact/` | WhatsApp, phone, email, showroom, and what to say in the first message |
| `/stores/` | Showroom details and hours, carrying the `Store` markup Google cross-checks |
| `/policies/[policy]/` | Delivery, Returns, Warranty, Privacy, Terms |

Filtering, sorting and pagination all run client-side over the products
already embedded in the page. With a catalogue this size that is far
cheaper than a round trip, and it keeps the site static.

`/products/` is a listing, not an index of category cards. The Products
dropdown links only to sellable categories; future categories do not occupy the
primary navigation. The page itself is the whole catalogue.

Header search works the same way. `scripts/build-search-index.mts` writes
`public/search-index.json` (generated, git-ignored, rebuilt by every
`pnpm build` and `pnpm dev`), and the browser fetches it the first time
someone focuses the search box — not on page load, because most visitors
never search and should not pay for the bytes. Matching is "every typed
word appears somewhere in the product", so "voltas 1.5 ton" behaves the
way people expect.

Every category has a page whether or not stock has been imported. An
empty one is not thin content: each carries its own buying guide, which
is unique and is what people actually search, and the page says plainly
that stock is arriving and routes the visitor to WhatsApp rather than
showing an empty grid. Its title changes too — promising a "price list"
on a page with no prices costs a listing its click-through long before
it costs it a ranking.

Each category page ends with a buying guide — the sizing advice a good
salesperson gives across the counter, set in `buyingGuide` on the
category config. It sits below the grid so someone who already knows what
they want is not made to scroll past a lesson, and it exists because
people search "which ton AC for 150 sq ft" far more often than they
search a model number.

### Product photography

Source photographs are committed to `assets/products/` exactly as
supplied. `scripts/build-images.mts` generates what the site serves:
AVIF with a WebP fallback at 400/800/1600 (never upscaling past the
source), plus a manifest of intrinsic dimensions so pages reserve the
right box and nothing shifts as images load.

`ProductImage` renders a `<picture>` rather than `next/image`. Under
`output: "export"` there is no server to negotiate formats, so the
choice has to live in the markup — that is the whole reason both formats
are generated. Always pass `sizes`; without it the browser assumes the
image spans the viewport and downloads the largest file in the set.

The pipeline also emits a `-cutout` variant with the studio white knocked
out, for placing a product on a dark surface such as the category banner.
Compositing a white-background photo onto a dark panel otherwise shows
the white box, and dropping the opacity to hide it washes the product out
along with it.

### Brand assets

`scripts/build-brand-assets.mts` generates `src/app/icon.png`,
`apple-icon.png`, `opengraph-image.png` and `twitter-image.png` from the
logo. Next picks those filenames up by convention and emits the tags.
The outputs are committed rather than built on demand — a missing
favicon is a visible defect, and nobody should have to remember a build
step to get one. Re-run the script if the logo changes.

### Structured data

Treat it as load-bearing — it is what makes these pages eligible for free
Google listings and rich results.

| Page | Emits |
|---|---|
| Home | `Organization` (upgrading to `Store` once the address is filled in), `WebSite` |
| Listing | `BreadcrumbList`, `ItemList` |
| Product | `BreadcrumbList`, `Product` and `Offer`; optional GTIN, availability and rating fields are emitted only when real, plus `FAQPage` when supplied |

`WebSite` is what Google reads to decide the site name shown above a
result; without it the name is guessed from the title tag, which is
usually the page name rather than the business.

The name, address and phone in `src/config/site.ts` must match the Google
Business Profile character for character. If they differ, Google treats
them as two different businesses and the local listing stops inheriting
the website's authority.

The product page renders every section into the HTML and uses the tab bar
to scroll between them, rather than hiding sections behind a click.
Content behind a click is content Google weighs less and a customer never
scrolls past.

### Deliberate differences from the Figma frames

The design was drawn for a full online-payment storefront. Phase 1 instead
implements a COD order flow with a separate distributor-confirmation step:

- Products with `unknown` distributor stock may be collected in the cart, but
  checkout and acknowledgement copy label the first state **Order placed —
  confirmation pending**, never **Order confirmed**.
- Guest checkout is the default. Accounts, saved carts, wishlist and comparison
  are useful optional features, not prerequisites for ordering.
- The **"Only 2 left"** badge renders only when a product has a real
  `stock_count`, and otherwise gives its slot to out-of-stock, pre-order
  and backorder states.
- Catalogue **star ratings** remain absent. Imports reject review aggregates;
  only the delivered-order review system can create customer ratings.
- **Buy now** goes directly to the COD order flow. It never bypasses
  server-side repricing or distributor confirmation.
- Product cards reserve height for the title, the chip row and the
  strikethrough price whether or not each is present. Titles run to one
  or two lines and discounts come and go, and without reserved height the
  price and the button land at a different height on every card.
- Trust and fulfilment terms sit close to the price and action, where the
  customer is making the decision.
- On phones a **sticky bar** carries the price and purchase action
  once the real button scrolls away. It measures that button on scroll
  rather than observing a 1px sentinel: a box that small does not
  reliably fire IntersectionObserver callbacks, and when it silently
  never fires the bar stays pinned open.
- Delivery copy uses the approved nationwide/free policy and states that the
  2–3-day window begins after distributor confirmation. A format-only PIN check
  must not pretend to be live courier serviceability.

### Commerce flow

Checkout, order acknowledgement, customer order history and the protected
order admin use the Worker/D1 backend. The first order state is deliberately
labelled **Order placed — confirmation pending** in customer-facing copy; it
must not say **Order confirmed** until the distributor moves it to `confirmed`.

The online-payment implementation is deliberately not part of the launch flow.
Do not expose the payment page, Cashfree claims, UPI/cards or EMI copy while
`business.onlinePayments` is false.

### Layout and spacing

The Figma frames are 1920 wide with a 1240px content column. `Container`
sets that width from the design rather than from the browser window —
sizing the column to a 1440px laptop is what made the first pass read as
cramped. Everything shares that one component, so the page cannot drift
into three slightly different gutters.

The current landing source is frame **347:146**. The older `118:3` landmark
table was removed because it described a different, shorter page. Re-measure
the final build at the 1920px source viewport after the promo, buying-assistant
and popular-search sections settle; record only values captured from that
current frame and the final DOM.

**Product listing** (frame 132:2405). Note the content column is 1560
here, not the landing page's 1240 — the listing carries a filter rail
beside a four-column grid, and the design widens for it:

| Landmark | Figma | Built |
|---|---|---|
| Breadcrumb band height | 45 | 46 |
| Eyebrow top | 146 | 146 |
| H1 top / font size | 173 / 40 | 173 / 40 |
| Paragraph top | 231 | 233 |
| Banner top / height | 143 / 196 | 142 / 196 |
| Banner left / width | 906 / 832 | 901 / 832 |
| Filter rail top / width | 390 / 266 | 390 / 266 |
| Grid left / card width / gap | 509 / 281 / 35 | 503 / 281 / 36 |

**Product page** (frame 174:3056). Content column 1192 — a specification
page reads better narrow. The gallery and the details share one 852-wide
card; the delivery panel is a separate 319 card beside it:

| Landmark | Figma | Built |
|---|---|---|
| Card top | 113 | 118 |
| Card left / width | 364 / 852 | 357 / 849 |
| Brand eyebrow top | 149 | 149 |
| H1 top / font size | 182 / 28 | 182 / 28 |
| Sidebar left / width | 1237 / 319 | 1230 / 319 |
| Content width | 1192 | 1192 |

The card runs ~50px taller than the frame, and that is content rather
than spacing: the mock's title fits one line where a real product name
("Voltas 260L Frost Free Double Door Refrigerator") takes two. Pinning
the card to the frame's height would clip the longer names every real
product has.

The consistent 5-7px shortfall on left-edge numbers is the scrollbar:
the viewport is 1905 wide, not 1920.

Comparing screenshots does not work for this: the capture is rescaled
between runs, so every measurement carries a different conversion error.
Read the DOM.

### Images: which format, and why

| Asset | Format | Reason |
|---|---|---|
| Wordmark | WebP | See below — the supplied "SVG" is not a vector |
| Interface icons (chevrons, search, arrows, checks) | Inline SVG | Change colour with their surroundings via `currentColor`, cost no request |
| Figma icon set (categories, trust, value props) | WebP | Half that set is raster in the source file; see below |
| Product photographs | AVIF + WebP | Photographs are raster by nature; SVG cannot represent them |

**SVG is not automatically the right answer.** It is right for artwork
that is genuinely vector — shapes and paths — because it scales to any
size and takes its colour from CSS. It is the *wrong* answer for a
photograph, and it is actively worse than WebP when a raster image has
merely been wrapped in an SVG tag, because base64 inflates the bytes by
about a third and nothing can compress it.

Both supplied logo files were exactly that: a 2172x724 PNG base64-encoded
inside an SVG wrapper, 330KB each. `public/images/brand/logo-*.webp` is
the same artwork trimmed and re-encoded at 3x its rendered size — 9KB, a
97% saving. **Ask the designer for a real vector export** (paths, not a
placed image); when it arrives, inline it and delete both files.

The Figma icon set has the same problem in part: of its 30 icons, 12 are
true vectors and 18 are 512px PNGs pasted into the file. Because the
raster ones cannot inherit `currentColor`, the set ships separate light
and dark artwork for the placements that need each, and
`scripts/extract-figma-icons.mts` splits the exported frame into
`public/images/icons/*.webp` (18 files, 112KB total). Interface chrome
stays as inline SVG, where colour has to follow the theme.

## Commands

```bash
pnpm dev         # local dev server
pnpm build       # static export to out/
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm preview     # serve out/ the way Cloudflare will
pnpm db:migrate  # apply D1 migrations to the configured production database
pnpm import:products   # merge data/products.csv into data/products/*.json
pnpm build:preview     # static export, allowing the SAMPLE- placeholders
pnpm deploy      # build, then wrangler deploy
pnpm admin       # local source-sync/match-review console; never expose publicly
```

## Before launch

See [docs/launch-prerequisites.md](docs/launch-prerequisites.md) for the
accounts, verifications and product data that have to be gathered by hand.
Google Business Profile verification is the critical path — it is external,
slow, and everything in the local commerce strategy depends on it.
