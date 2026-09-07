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

Product data lives in `data/products/*.json`, validated at build time
against the Zod schema in `src/lib/product-schema.ts`. The schema mirrors
the Google Merchant Center product feed so the same records can drive a feed
in Phase 2 without remodelling.

`tenantId` is present in the data model so a second distributor can be
onboarded later. Multi-tenancy is **not** implemented and should not be.

Deferred to Phase 2, after Diwali: online checkout, Merchant Center online
feed, a database, and any server runtime (vinext/OpenNext) — the latter is
still beta and has no place on a revenue-critical site under a seasonal
deadline.

## Stack

- Next.js 16.3.4, App Router, TypeScript, `output: "export"`
- Tailwind CSS v4
- Zod for product data validation
- sharp for the build-time image pipeline
- Cloudflare for DNS, CDN and static asset hosting; Wrangler for deploys

## Commands

```bash
pnpm dev         # local dev server
pnpm build       # static export to out/
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm preview     # serve out/ the way Cloudflare will
pnpm deploy      # build, then wrangler deploy
```

## Before launch

See [docs/launch-prerequisites.md](docs/launch-prerequisites.md) for the
accounts, verifications and product data that have to be gathered by hand.
Google Business Profile verification is the critical path — it is external,
slow, and everything in the local commerce strategy depends on it.
