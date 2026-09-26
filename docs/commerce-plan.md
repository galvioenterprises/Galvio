# Commerce plan: COD launch, orders and distributor operations

Updated 25 September 2026. This is the current Phase 1 scope. Galvio operates
the website; the distributor owns live inventory, confirms COD orders and
ships nationwide. Online payment code is retained for later but is not exposed
to customers at launch.

## 1. Phase 1 customer flow

```
browse/search → product → cart → guest delivery details
              → Place COD order → Order placed — confirmation pending
              → distributor verifies stock, price and delivery
              → confirmed → packed → shipped → out for delivery → delivered
```

- Guest checkout is the default. A customer account is optional and must never
  stand between a shopper and a COD order.
- Add to cart records intent; it does not reserve stock.
- The first internal `placed` state is presented to the customer as **Order
  placed — confirmation pending**, not **Order confirmed**.
- The distributor creates the fulfilment commitment by moving an order to `confirmed`
  after checking the exact product, effective price, stock and delivery details.
- Email is optional for a guest. If no real address was supplied, the interface
  must promise phone updates only and must not claim that an email was sent.

## 2. Approved commercial rules

The business has approved these Phase 1 promises:

| Rule | Public meaning |
|---|---|
| Fulfilment | Nationwide delivery |
| Delivery charge | Free |
| Delivery time | 2–3 days **after distributor confirmation** |
| COD order cap | ₹50,000 |
| Exchange | Seven-day qualifying exchange, subject to the published conditions |
| Installation | Only the documented inclusions/extras; product-specific source facts still stay blank when not supplied |

Use these values consistently in product, cart, checkout, acknowledgement and
policy copy. “Order placed — confirmation pending” and “Order confirmed” remain separate even though the
commercial terms are approved.

## 3. Online payment is dormant

`business.onlinePayments` is `false` for Phase 1. The public site must not
render EMI, UPI, card, netbanking, wallet, Cashfree or payment-security claims.
The checkout places COD orders directly; there is no public payment step.

The existing Cashfree adapter, verification and webhook work remains in the
repository as a later integration path. Do not configure production Cashfree
keys or enable its routes for launch. Enabling online payment later requires:

1. an agreed seller of record and GST invoice owner;
2. an approved settlement bank account and gateway merchant account;
3. tested payment, refund, webhook and reconciliation operations;
4. policy and customer-support wording for failed/refunded payments; and
5. a complete sandbox and production end-to-end test.

This later work is not a COD launch blocker.

## 4. Architecture

Static browsing and dynamic operations stay separated:

```
Browser ──> Cloudflare
             ├─ static pages and catalogue (out/)
             └─ /api/* → Worker
                          ├─ D1 users, sessions, COD orders and events
                          ├─ D1 runtime catalogue overrides and audit history
                          └─ transactional notifications
```

- Static page views do not need a Worker invocation.
- The Worker re-prices every request. Browser-supplied prices are never trusted.
- Runtime overrides can change only MRP, selling price, availability and stock
  count. Product identity, description, source images and new SKUs remain in the
  reviewed Git/import workflow.
- Order creation uses an idempotency key so a retry cannot create a second COD
  request.
- Admin access requires an allowed application session and Cloudflare Access in
  front of both `/admin/*` and `/api/admin/*`.

## 5. Order lifecycle

```
placed (order placed — confirmation pending)
  ├─ confirmed → packed → shipped → out for delivery → delivered
  └─ cancelled
```

- `placed` means the order reached Galvio and is awaiting the confirmation call; it is not a stock promise.
- `confirmed` means the distributor checked the item and accepted fulfilment.
- Every change is appended to `order_events` for the customer timeline and
  operational audit.
- Customer notifications are transactional. Failed deliveries go to a retryable
  outbox rather than being silently discarded.
- COD is marked paid only when cash collection is recorded/delivery completes.

## 6. Admin responsibility

### Hosted admin: distributor operations

After deployment, the protected `/admin` is the distributor's working surface:

- review and progress COD orders;
- record courier/tracking details;
- update live price, MRP, availability and stock count;
- inspect override history; and
- manage coupons and verified reviews. The customer coupon input and admin tools
  stay visible; activate a code only after its campaign terms have been reviewed
  and its final checkout total has been tested end to end.

Those inventory changes are D1 runtime overrides and reach the customer-facing
storefront and checkout without a site rebuild. They do not rewrite
manufacturer facts. Search metadata and product structured data remain the
reviewed build snapshot until the next catalogue deployment.

### Local repository console: source maintenance

`pnpm admin` remains local on `127.0.0.1` for Voltas sync, weak-match review,
source images and reviewable baseline catalogue changes. It must never be
exposed to the public internet.

## 7. Native cart motion

The add-to-cart interaction stays native rather than adding Lottie/WASM for a
one-second effect. It must respect `prefers-reduced-motion`. Adding from a
listing should confirm the addition without forcing the shopper to leave the
listing; Buy now remains the fast route from a product page.

## 8. Deployment requirements

1. Create the production D1 database, replace the placeholder ID in
   `wrangler.jsonc`, and run `pnpm db:migrate`.
2. Set `ADMIN_EMAILS`, a generated `CODE_PEPPER`, `ADMIN_API_TOKEN` and the
   transactional email secrets. Supply all required values through a secure
   secrets file on the first deploy; use `wrangler secret put` only after the
   Worker exists. Never commit or paste secret values into chat or shell history.
   Do not set Cashfree secrets for the COD-only release.
3. Verify the sending domain if customer/admin email notifications are enabled.
4. Put Cloudflare Access in front of the parent paths
   `galvioenterprises.com/admin` and `galvioenterprises.com/api/admin`, limited
   to the exact approved Galvio and distributor identities. The production
   configuration disables workers.dev and version URLs so those paths cannot
   be bypassed through an alternate Worker hostname. Redirect `www` to the apex
   before launch, or protect equivalent `www` paths as separate applications.
5. Deploy, then test one complete order and one inventory override in
   production: place order → confirmation pending → admin confirmation → dispatch →
   delivered.
6. Confirm that a repeated submit with the same idempotency key creates one
   order, and that failed notifications appear for retry.
7. Assign the distributor an owner and response-time target for phone-only
   orders. Call/WhatsApp confirmation, status and tracking must be handled
   manually until transactional SMS or WhatsApp is available.

Local development uses `pnpm dev`. `pnpm build && pnpm preview` exercises the
production-style static build plus Worker and local D1.

## 9. Catalogue and stock rules

- A supplier page is evidence for manufacturer facts, never distributor stock.
- Blank or unconfirmed stock remains `unknown`; it is not silently converted to
  `in_stock`.
- A customer may place an unknown-stock product as a COD order because the
  distributor confirms it before fulfilment.
- After deployment, the distributor maintains operational inventory through the
  hosted D1-backed admin.
- Manufacturer refreshes, new products and source-field corrections still use
  reviewed batches, importer validation and a deployment diff.
- Catalogue imports continue to reject `rating_value` and `rating_count`.

## 10. Launch blockers versus later work

### Required for COD launch

- production D1 ID and all migrations;
- `ADMIN_EMAILS`, `CODE_PEPPER`, `ADMIN_API_TOKEN` and Cloudflare Access;
- working transactional notification route and monitored operations;
- distributor login and a tested inventory override;
- real phone, WhatsApp, showroom address and hours;
- consistent approved delivery, COD, exchange and installation copy; and
- a deployed end-to-end COD order test.

### Later

- Cashfree merchant onboarding and online payment;
- EMI copy and calculations;
- marketing/abandoned-cart email;
- payment refunds and settlement reconciliation; and
- any loyalty, buyback or marketplace-style urgency features.
