import { z } from "zod";
import { publicEmail, requireAdmin, requireUser, currentUser } from "./auth";
import type { Env } from "./env";
import { HttpError, json, now, randomId, readBody } from "./http";
import {
  CATALOGUE,
  effectiveCatalogueEntry,
  loadCatalogueOverrides,
  withCatalogueOverride,
} from "./pricing";
import { formatRupees } from "./orders";
import { sendTrackedEmail } from "./notifications";

/* ------------------------------------------------------------------ */
/* Reviews                                                              */
/* ------------------------------------------------------------------ */

type ReviewRow = { id: string; rating: number; title: string; body: string; name: string; created_at: string };

/** Approved reviews and the summary for a product page. */
export async function listReviews(env: Env, slug: string): Promise<Response> {
  const [list, summary] = await Promise.all([
    env.DB.prepare(
      `SELECT id, rating, title, body, name, created_at FROM reviews
        WHERE slug = ?1 AND status = 'approved' ORDER BY created_at DESC LIMIT 50`,
    )
      .bind(slug)
      .all<ReviewRow>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS count, AVG(rating) AS average,
              SUM(rating = 5) AS s5, SUM(rating = 4) AS s4, SUM(rating = 3) AS s3, SUM(rating = 2) AS s2, SUM(rating = 1) AS s1
         FROM reviews WHERE slug = ?1 AND status = 'approved'`,
    )
      .bind(slug)
      .first<{ count: number; average: number | null; s5: number; s4: number; s3: number; s2: number; s1: number }>(),
  ]);
  const s = summary ?? { count: 0, average: null, s5: 0, s4: 0, s3: 0, s2: 0, s1: 0 };
  return json({
    count: s.count,
    average: s.average ? Math.round(s.average * 10) / 10 : null,
    breakdown: [s.s5 ?? 0, s.s4 ?? 0, s.s3 ?? 0, s.s2 ?? 0, s.s1 ?? 0],
    reviews: list.results.map((r) => ({ id: r.id, rating: r.rating, title: r.title, body: r.body, name: r.name, at: r.created_at })),
  });
}

/** Whether the signed-in customer may review this product, and why not. */
export async function reviewEligibility(request: Request, env: Env, slug: string): Promise<Response> {
  const user = await currentUser(request, env);
  if (!user) return json({ canReview: false, reason: "signin" });
  const existing = await env.DB.prepare(`SELECT status FROM reviews WHERE slug = ?1 AND user_id = ?2`)
    .bind(slug, user.id)
    .first<{ status: string }>();
  if (existing) return json({ canReview: false, reason: "reviewed", status: existing.status });
  const order = await deliveredOrderFor(env, user.id, slug);
  return json({ canReview: Boolean(order), reason: order ? null : "not-purchased" });
}

async function deliveredOrderFor(env: Env, userId: string, slug: string) {
  return env.DB.prepare(
    `SELECT o.id FROM orders o JOIN order_items i ON i.order_id = o.id
      WHERE o.user_id = ?1 AND i.slug = ?2 AND o.status = 'delivered' LIMIT 1`,
  )
    .bind(userId, slug)
    .first<{ id: string }>();
}

export async function createReview(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const body = await readBody(
    request,
    z.object({
      slug: z.string().max(120),
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().max(100).default(""),
      body: z.string().trim().min(10, "Tell others a little more (at least 10 characters).").max(2000),
    }),
  );
  const order = await deliveredOrderFor(env, user.id, body.slug);
  if (!order) throw new HttpError(403, "You can review a product once it has been delivered to you.");
  const name = user.name ? `${user.name.split(" ")[0]} ${user.name.split(" ")[1]?.[0] ?? ""}`.trim() : "Verified buyer";
  try {
    await env.DB.prepare(
      `INSERT INTO reviews (id, slug, user_id, order_id, rating, title, body, name, status, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', ?9)`,
    )
      .bind(randomId(), body.slug, user.id, order.id, body.rating, body.title, body.body, name, now())
      .run();
  } catch {
    throw new HttpError(409, "You have already reviewed this product.");
  }
  return json({ ok: true });
}

export async function adminReviews(request: Request, env: Env): Promise<Response> {
  await requireAdmin(request, env);
  if (request.method === "PATCH") {
    const body = await readBody(request, z.object({ id: z.string(), status: z.enum(["approved", "rejected"]) }));
    await env.DB.prepare(`UPDATE reviews SET status = ?2 WHERE id = ?1`).bind(body.id, body.status).run();
  }
  const status = new URL(request.url).searchParams.get("status") || "pending";
  const { results } = await env.DB.prepare(
    `SELECT id, slug, rating, title, body, name, status, created_at FROM reviews WHERE status = ?1 ORDER BY created_at DESC LIMIT 200`,
  )
    .bind(status)
    .all();
  return json({ reviews: results.map((r) => ({ ...r, product: CATALOGUE[String(r.slug)]?.title ?? r.slug })) });
}

/* ------------------------------------------------------------------ */
/* Cart mirror (abandoned-cart reminders)                               */
/* ------------------------------------------------------------------ */

export async function saveCart(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const body = await readBody(
    request,
    z.object({ items: z.array(z.object({ slug: z.string().max(120), qty: z.number().int().min(1).max(10) })).max(30) }),
  );
  const items = body.items.filter((i) => CATALOGUE[i.slug]);
  if (items.length === 0) {
    await env.DB.prepare(`DELETE FROM carts WHERE user_id = ?1`).bind(user.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO carts (user_id, items_json, updated_at, reminded_at) VALUES (?1, ?2, ?3, '')
       ON CONFLICT (user_id) DO UPDATE SET items_json = ?2, updated_at = ?3, reminded_at = ''`,
    )
      .bind(user.id, JSON.stringify(items), now())
      .run();
  }
  return json({ ok: true });
}

/* ------------------------------------------------------------------ */
/* Price-drop and back-in-stock alerts                                  */
/* ------------------------------------------------------------------ */

const ORDERABLE = new Set(["in_stock", "unknown"]);

export async function createAlert(request: Request, env: Env): Promise<Response> {
  if (env.ENGAGEMENT_EMAILS !== "true") {
    throw new HttpError(503, "Price and stock alerts are not available yet.");
  }
  const user = await currentUser(request, env);
  const body = await readBody(
    request,
    z.object({
      slug: z.string().max(120),
      kind: z.enum(["price", "stock"]),
      email: z.string().trim().toLowerCase().pipe(z.email({ message: "Enter a valid email address." })).optional(),
    }),
  );
  const product = await effectiveCatalogueEntry(env, body.slug);
  if (!product) throw new HttpError(404, "Product not found.");
  const email = body.email || (user ? publicEmail(user.email) : "");
  if (!email) throw new HttpError(400, "Enter your email so we can let you know.");
  await env.DB.prepare(
    `INSERT INTO alerts (id, email, slug, kind, price, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT (email, slug, kind) DO UPDATE SET price = ?5, created_at = ?6, notified_at = ''`,
  )
    .bind(randomId(), email, body.slug, body.kind, product.price, now())
    .run();
  return json({ ok: true, email });
}

/* ------------------------------------------------------------------ */
/* Scheduled job (wrangler.jsonc triggers)                              */
/* ------------------------------------------------------------------ */

/**
 * Runs every 30 minutes:
 *  - one reminder per abandoned cart, 1 hour to 3 days after it was last
 *    changed, if no order was placed since;
 *  - price-drop and back-in-stock alerts against the deployed catalogue.
 */
export async function runScheduled(env: Env): Promise<void> {
  // Phase 1 is transactional email only. This gate keeps the implementation
  // ready without sending marketing mail before consent/unsubscribe exists.
  if (env.ENGAGEMENT_EMAILS !== "true") return;
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 86400_000).toISOString();
  const { results: carts } = await env.DB.prepare(
    `SELECT c.user_id, c.items_json, u.email, u.name FROM carts c JOIN users u ON u.id = c.user_id
      WHERE c.reminded_at = '' AND c.updated_at < ?1 AND c.updated_at > ?2
        AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = c.user_id AND o.created_at > c.updated_at AND o.status != 'pending_payment')
      LIMIT 50`,
  )
    .bind(hourAgo, threeDaysAgo)
    .all<{ user_id: string; items_json: string; email: string; name: string }>();

  for (const cart of carts) {
    const items = (JSON.parse(cart.items_json) as { slug: string; qty: number }[]).filter((i) => CATALOGUE[i.slug]);
    if (items.length && !cart.email.endsWith(".invalid")) {
      const overrides = await loadCatalogueOverrides(env, items.map((item) => item.slug));
      const lines = items.map((item) => {
        const product = withCatalogueOverride(CATALOGUE[item.slug], overrides.get(item.slug));
        return `  ${item.qty} x ${product.title}  ${formatRupees(product.price * item.qty)}`;
      });
      await sendTrackedEmail(env, {
        to: cart.email,
        subject: "You left something in your cart",
        text:
          `Hi${cart.name ? ` ${cart.name.split(" ")[0]}` : ""},\n\nYour cart is saved:\n\n${lines.join("\n")}\n\n` +
          `Pick up where you left off: ${env.SITE_URL}/cart/\n\nChoose Cash on Delivery. We confirm stock, the final amount and delivery timing before dispatch.\n`,
      }, `cart-reminder:${cart.user_id}:${cart.items_json}`);
    }
    await env.DB.prepare(`UPDATE carts SET reminded_at = ?2 WHERE user_id = ?1`).bind(cart.user_id, now()).run();
  }

  const { results: alerts } = await env.DB.prepare(
    `SELECT id, email, slug, kind, price FROM alerts WHERE notified_at = '' LIMIT 200`,
  ).all<{ id: string; email: string; slug: string; kind: "price" | "stock"; price: number }>();
  for (const alert of alerts) {
    const product = await effectiveCatalogueEntry(env, alert.slug);
    if (!product) continue;
    const link = `${env.SITE_URL}/product/${product.slug}/`;
    const fire =
      alert.kind === "price" ? product.price < alert.price && ORDERABLE.has(product.availability) : ORDERABLE.has(product.availability);
    if (!fire) continue;
    await sendTrackedEmail(env, {
      to: alert.email,
      subject: alert.kind === "price" ? `Price drop: ${product.title}` : `Back in stock: ${product.title}`,
      text:
        alert.kind === "price"
          ? `Good news: ${product.title} is now ${formatRupees(product.price)} (was ${formatRupees(alert.price)}).\n\n${link}\n`
          : `${product.title} is available to order again at ${formatRupees(product.price)}.\n\n${link}\n`,
    }, `alert:${alert.id}`);
    await env.DB.prepare(`UPDATE alerts SET notified_at = ?2 WHERE id = ?1`).bind(alert.id, now()).run();
  }
}
