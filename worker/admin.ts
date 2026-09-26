import { z } from "zod";
import { publicEmail, requireAdmin } from "./auth";
import type { Env } from "./env";
import { HttpError, json, now, readBody } from "./http";
import { STATUS_LABEL, loadOrder, notifyCustomer, type OrderStatus } from "./orders";
import {
  CATALOGUE,
  loadCatalogueOverrides,
  withCatalogueOverride,
  type CatalogueEntry,
  type CatalogueOverride,
} from "./pricing";

/**
 * Order management for the distributor.
 *
 * Status moves one way along placed → confirmed → packed → shipped →
 * out for delivery → delivered, with cancel allowed until the order ships.
 * Steps can be skipped forwards (a local delivery may go straight from
 * confirmed to out for delivery) but never backwards, which keeps a
 * mis-click from undoing a delivery.
 */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["cancelled"],
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "shipped", "out_for_delivery", "cancelled"],
  packed: ["shipped", "out_for_delivery", "cancelled"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

export async function adminListOrders(request: Request, env: Env): Promise<Response> {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const where: string[] = [];
  const binds: unknown[] = [];
  if (STATUSES.includes(status as OrderStatus)) {
    binds.push(status);
    where.push(`o.status = ?${binds.length}`);
  } else if (status !== "all") {
    // The default view hides abandoned online checkouts.
    where.push(`NOT (o.status = 'cancelled' AND o.payment_status = 'failed')`);
    where.push(`o.status != 'pending_payment'`);
  }
  if (q) {
    binds.push(`%${q}%`);
    const n = binds.length;
    where.push(`(LOWER(o.id) LIKE ?${n} OR LOWER(o.email) LIKE ?${n} OR o.phone LIKE ?${n})`);
  }

  const [list, counts] = await Promise.all([
    env.DB.prepare(
      `SELECT o.id, o.status, o.payment_method, o.payment_status, o.total, o.phone, o.email,
              o.address_json, o.created_at,
              (SELECT SUM(qty) FROM order_items WHERE order_id = o.id) AS item_count,
              (SELECT title FROM order_items WHERE order_id = o.id LIMIT 1) AS first_title
         FROM orders o ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY o.created_at DESC LIMIT 200`,
    )
      .bind(...binds)
      .all<{
        id: string; status: OrderStatus; payment_method: string; payment_status: string;
        total: number; phone: string; email: string; address_json: string; created_at: string;
        item_count: number; first_title: string;
      }>(),
    env.DB.prepare(`SELECT status, COUNT(*) AS n FROM orders GROUP BY status`).all<{ status: string; n: number }>(),
  ]);

  return json({
    counts: Object.fromEntries(counts.results.map((c) => [c.status, c.n])),
    orders: list.results.map((o) => {
      const address = JSON.parse(o.address_json) as { name: string; city: string; state: string };
      return {
        id: o.id,
        status: o.status,
        statusLabel: STATUS_LABEL[o.status],
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status,
        total: o.total,
        phone: o.phone,
        email: publicEmail(o.email),
        customer: address.name,
        city: `${address.city}, ${address.state}`,
        createdAt: o.created_at,
        itemCount: o.item_count,
        title: o.first_title,
      };
    }),
  });
}

export async function adminGetOrder(request: Request, env: Env, id: string): Promise<Response> {
  await requireAdmin(request, env);
  const loaded = await loadOrder(env, id);
  if (!loaded) throw new HttpError(404, "Order not found.");
  return json({
    order: { ...loaded.view, adminNote: loaded.row.admin_note },
    nextStatuses: NEXT[loaded.row.status],
  });
}

const patchSchema = z.object({
  status: z.enum(STATUSES as [OrderStatus, ...OrderStatus[]]).optional(),
  note: z.string().trim().max(300).default(""),
  courier: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  adminNote: z.string().trim().max(2000).optional(),
  paymentStatus: z.enum(["paid", "refunded"]).optional(),
});

export async function adminUpdateOrder(request: Request, env: Env, id: string): Promise<Response> {
  const admin = await requireAdmin(request, env);
  const body = await readBody(request, patchSchema);
  const loaded = await loadOrder(env, id);
  if (!loaded) throw new HttpError(404, "Order not found.");
  if (body.status && body.paymentStatus) {
    throw new HttpError(400, "Update the order status and payment status separately.");
  }
  const current = loaded.row;
  const timestamp = now();
  const actor = `admin:${admin.email}`;
  let nextPaymentStatus = current.payment_status;
  let paymentChanged = false;

  if (body.paymentStatus && body.paymentStatus !== current.payment_status) {
    const allowed =
      (body.paymentStatus === "paid" && current.payment_status === "cod_due") ||
      (body.paymentStatus === "refunded" && current.payment_status === "paid");
    if (!allowed) throw new HttpError(400, `Payment cannot move from ${current.payment_status} to ${body.paymentStatus}.`);
    nextPaymentStatus = body.paymentStatus;
    paymentChanged = true;
  }

  const nextStatus = body.status ?? current.status;
  const statusChanged = nextStatus !== current.status;
  if (body.status && body.status !== current.status) {
    if (!NEXT[current.status].includes(body.status)) {
      throw new HttpError(400, `An order cannot move from ${STATUS_LABEL[current.status]} to ${STATUS_LABEL[body.status]}.`);
    }
  }
  // A delivered COD order means the cash was collected at the door.
  if (nextStatus === "delivered" && nextPaymentStatus === "cod_due") {
    nextPaymentStatus = "paid";
  }

  const metadataChanged =
    (body.courier !== undefined && body.courier !== current.courier) ||
    (body.trackingNumber !== undefined && body.trackingNumber !== current.tracking_number) ||
    (body.adminNote !== undefined && body.adminNote !== current.admin_note);
  if (metadataChanged || paymentChanged || statusChanged) {
    const auditStatements: D1PreparedStatement[] = [];
    if (statusChanged) {
      auditStatements.push(
        env.DB.prepare(
          `INSERT INTO order_events (order_id, status, note, actor, created_at)
           SELECT ?1, ?2, ?3, ?4, ?5 WHERE changes() = 1`,
        ).bind(id, nextStatus, body.note, actor, timestamp),
      );
    }
    if (paymentChanged) {
      auditStatements.push(
        env.DB.prepare(
          `INSERT INTO order_events (order_id, status, note, actor, created_at)
           SELECT ?1, ?2, ?3, ?4, ?5 WHERE changes() = 1`,
        ).bind(
          id,
          nextStatus,
          nextPaymentStatus === "paid" ? "Cash payment collected" : "Payment refunded",
          actor,
          timestamp,
        ),
      );
    }

    const [mutationResult] = await env.DB.batch([
      env.DB.prepare(
        `UPDATE orders
            SET status = ?2,
                payment_status = ?3,
                courier = CASE WHEN ?4 IS NULL THEN courier ELSE ?4 END,
                tracking_number = CASE WHEN ?5 IS NULL THEN tracking_number ELSE ?5 END,
                admin_note = CASE WHEN ?6 IS NULL THEN admin_note ELSE ?6 END,
                updated_at = ?7
          WHERE id = ?1 AND status = ?8 AND payment_status = ?9`,
      ).bind(
        id,
        nextStatus,
        nextPaymentStatus,
        body.courier ?? null,
        body.trackingNumber ?? null,
        body.adminNote ?? null,
        timestamp,
        current.status,
        current.payment_status,
      ),
      ...auditStatements,
    ]);
    if (mutationResult.meta.changes !== 1) {
      throw new HttpError(409, "This order changed in another session. Refresh before saving.");
    }
  }

  if (statusChanged) await notifyCustomer(env, id);

  return adminGetOrder(request, env, id);
}

/* ------------------------------------------------------------------ */
/* Coupons                                                              */
/* ------------------------------------------------------------------ */

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(30).regex(/^[A-Z0-9_-]+$/, "Letters, numbers, - and _ only."),
  description: z.string().trim().max(120).default(""),
  kind: z.enum(["percent", "flat"]),
  value: z.number().int().positive(),
  minOrder: z.number().int().min(0).default(0),
  maxDiscount: z.number().int().min(0).default(0),
  usageLimit: z.number().int().min(0).default(0),
  expiresAt: z.string().default(""),
  active: z.boolean().default(true),
});

export async function adminCoupons(request: Request, env: Env): Promise<Response> {
  await requireAdmin(request, env);
  if (request.method === "POST") {
    const c = await readBody(request, couponSchema);
    if (c.kind === "percent" && c.value > 90) throw new HttpError(400, "A percentage coupon can be at most 90%.");
    await env.DB.prepare(
      `INSERT INTO coupons (code, description, kind, value, min_order, max_discount, usage_limit, active, expires_at, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
       ON CONFLICT (code) DO UPDATE SET description = ?2, kind = ?3, value = ?4, min_order = ?5,
         max_discount = ?6, usage_limit = ?7, active = ?8, expires_at = ?9`,
    )
      .bind(c.code, c.description, c.kind, c.value, c.minOrder, c.maxDiscount, c.usageLimit, c.active ? 1 : 0, c.expiresAt, now())
      .run();
  }
  const { results } = await env.DB.prepare(`SELECT * FROM coupons ORDER BY created_at DESC`).all<{
    code: string; description: string; kind: string; value: number; min_order: number; max_discount: number;
    usage_limit: number; used_count: number; active: number; expires_at: string;
  }>();
  return json({
    coupons: results.map((c) => ({
      code: c.code,
      description: c.description,
      kind: c.kind,
      value: c.value,
      minOrder: c.min_order,
      maxDiscount: c.max_discount,
      usageLimit: c.usage_limit,
      usedCount: c.used_count,
      active: c.active === 1,
      expiresAt: c.expires_at,
    })),
  });
}

/* ------------------------------------------------------------------ */
/* Runtime inventory                                                    */
/* ------------------------------------------------------------------ */

const availabilityValues = ["unknown", "in_stock", "out_of_stock", "preorder", "backorder"] as const;

const inventorySchema = z.object({
  availability: z.enum(availabilityValues),
  stockCount: z.number().int().min(0).nullable(),
  mrp: z.number().int().positive().nullable(),
  sellingPrice: z.number().int().positive(),
  expectedUpdatedAt: z.string().optional(),
});

type OperationalProduct = {
  availability: string;
  stockCount: number | null;
  mrp: number | null;
  sellingPrice: number;
};

function operational(product: CatalogueEntry): OperationalProduct {
  return {
    availability: product.availability,
    stockCount: product.stockCount,
    mrp: product.mrp,
    sellingPrice: product.price,
  };
}

function inventoryView(product: CatalogueEntry, override?: CatalogueOverride) {
  const effective = withCatalogueOverride(product, override);
  return {
    slug: product.slug,
    sku: product.sku,
    title: product.title,
    image: product.image,
    category: product.category,
    base: operational(product),
    effective: operational(effective),
    overridden: Boolean(override),
    updatedBy: override?.updated_by ?? "",
    updatedAt: override?.updated_at ?? "",
  };
}

/** Public operational fields only; audit actors are never exposed. */
export async function catalogueOverrides(env: Env): Promise<Response> {
  const overrides = await loadCatalogueOverrides(env);
  return json(
    {
      overrides: Object.fromEntries(
        [...overrides.values()].map((row) => [
          row.slug,
          {
            sellingPrice: row.selling_price,
            mrp: row.mrp,
            availability: row.availability,
            stockCount: row.stock_count,
            updatedAt: row.updated_at,
          },
        ]),
      ),
    },
    { headers: { "cache-control": "public, max-age=15, stale-while-revalidate=45" } },
  );
}

/**
 * Protected distributor inventory API.
 *
 * GET    /api/admin/inventory             list current operational values
 * GET    /api/admin/inventory/:slug       product plus its audit history
 * PATCH  /api/admin/inventory/:slug       replace operational values
 * DELETE /api/admin/inventory/:slug       return to the build-time values
 */
export async function adminInventory(request: Request, env: Env, slug = ""): Promise<Response> {
  const admin = await requireAdmin(request, env);
  const product = slug ? CATALOGUE[slug] : undefined;
  if (slug && !product) throw new HttpError(404, "Product not found.");

  if (request.method === "PATCH") {
    const body = await readBody(request, inventorySchema);
    if (!product) throw new HttpError(404, "Product not found.");
    if (body.mrp !== null && body.sellingPrice > body.mrp) {
      throw new HttpError(400, "Selling price cannot be higher than MRP.");
    }
    if (body.availability === "in_stock" && body.stockCount === 0) {
      throw new HttpError(400, "In-stock products cannot have zero stock.");
    }
    if (body.availability === "out_of_stock" && (body.stockCount ?? 0) > 0) {
      throw new HttpError(400, "Out-of-stock products cannot have a positive stock count.");
    }

    const existing = (await loadCatalogueOverrides(env, [slug])).get(slug);
    if ((body.expectedUpdatedAt ?? "") !== (existing?.updated_at ?? "")) {
      throw new HttpError(409, "This product changed in another session. Refresh before saving.");
    }
    const before = operational(withCatalogueOverride(product, existing));
    const after: OperationalProduct = {
      availability: body.availability,
      stockCount: body.stockCount,
      mrp: body.mrp,
      sellingPrice: body.sellingPrice,
    };
    const timestamp = now();
    const actor = `admin:${admin.email}`;
    const mutation = existing
      ? env.DB.prepare(
          `UPDATE catalogue_overrides
              SET availability = ?2, stock_count = ?3, mrp = ?4,
                  selling_price = ?5, updated_by = ?6, updated_at = ?7
            WHERE slug = ?1 AND updated_at = ?8`,
        ).bind(
          slug,
          body.availability,
          body.stockCount,
          body.mrp,
          body.sellingPrice,
          actor,
          timestamp,
          existing.updated_at,
        )
      : env.DB.prepare(
          `INSERT INTO catalogue_overrides
             (slug, availability, stock_count, mrp, selling_price, updated_by, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           ON CONFLICT (slug) DO NOTHING`,
        ).bind(
          slug,
          body.availability,
          body.stockCount,
          body.mrp,
          body.sellingPrice,
          actor,
          timestamp,
        );
    const [mutationResult] = await env.DB.batch([
      mutation,
      env.DB.prepare(
        `INSERT INTO catalogue_override_events
           (slug, actor, before_json, after_json, created_at)
         SELECT ?1, ?2, ?3, ?4, ?5 WHERE changes() = 1`,
      ).bind(slug, actor, JSON.stringify(before), JSON.stringify(after), timestamp),
    ]);
    if (mutationResult.meta.changes !== 1) {
      throw new HttpError(409, "This product changed in another session. Refresh before saving.");
    }
    const saved = (await loadCatalogueOverrides(env, [slug])).get(slug);
    return json({ product: inventoryView(product, saved) });
  }

  if (request.method === "DELETE") {
    if (!product) throw new HttpError(404, "Product not found.");
    const existing = (await loadCatalogueOverrides(env, [slug])).get(slug);
    if (existing) {
      const expectedUpdatedAt = new URL(request.url).searchParams.get("updatedAt") ?? "";
      if (expectedUpdatedAt !== existing.updated_at) {
        throw new HttpError(409, "This product changed in another session. Refresh before resetting.");
      }
      const timestamp = now();
      const actor = `admin:${admin.email}`;
      const [mutationResult] = await env.DB.batch([
        env.DB.prepare(`DELETE FROM catalogue_overrides WHERE slug = ?1 AND updated_at = ?2`).bind(slug, existing.updated_at),
        env.DB.prepare(
          `INSERT INTO catalogue_override_events
             (slug, actor, before_json, after_json, created_at)
           SELECT ?1, ?2, ?3, ?4, ?5 WHERE changes() = 1`,
        ).bind(
          slug,
          actor,
          JSON.stringify(operational(withCatalogueOverride(product, existing))),
          JSON.stringify(operational(product)),
          timestamp,
        ),
      ]);
      if (mutationResult.meta.changes !== 1) {
        throw new HttpError(409, "This product changed in another session. Refresh before resetting.");
      }
    }
    return json({ product: inventoryView(product) });
  }

  const overrides = await loadCatalogueOverrides(env, slug ? [slug] : undefined);
  if (slug && product) {
    const { results: history } = await env.DB.prepare(
      `SELECT actor, before_json, after_json, created_at
         FROM catalogue_override_events WHERE slug = ?1 ORDER BY id DESC LIMIT 30`,
    )
      .bind(slug)
      .all<{ actor: string; before_json: string; after_json: string; created_at: string }>();
    return json({
      product: inventoryView(product, overrides.get(slug)),
      history: history.map((event) => ({
        actor: event.actor,
        before: JSON.parse(event.before_json),
        after: JSON.parse(event.after_json),
        createdAt: event.created_at,
      })),
    });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  const products = Object.values(CATALOGUE)
    .filter((entry) => !q || `${entry.title} ${entry.sku} ${entry.slug}`.toLowerCase().includes(q))
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((entry) => inventoryView(entry, overrides.get(entry.slug)));
  return json({
    products,
    summary: {
      total: Object.keys(CATALOGUE).length,
      overridden: overrides.size,
      outOfStock: products.filter((entry) => entry.effective.availability === "out_of_stock").length,
    },
  });
}
