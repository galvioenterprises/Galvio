import { z } from "zod";
import { business } from "../src/config/business";
import { site } from "../src/config/site";
import { getAddress } from "./addresses";
import { requireUser } from "./auth";
import { adminEmails, type Env } from "./env";
import { HttpError, json, now, readBody, sha256 } from "./http";
import { sendTrackedEmail } from "./notifications";
import { enforceRateLimit } from "./rate-limit";
import {
  METHOD_FILTER,
  checkoutMode,
  createPayment,
  existingSession,
  fetchPaymentDetails,
  fetchPaymentState,
  onlinePaymentsEnabled,
  PAYMENT_WINDOW_MINUTES,
  simulated,
  type OnlineMethod,
} from "./payments";
import { couponCodeSchema, itemsSchema, quote } from "./pricing";

export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  placed: "Order placed — confirmation pending",
  confirmed: "Order confirmed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

type OrderRow = {
  id: string;
  user_id: string;
  status: OrderStatus;
  payment_method: "cod" | "online";
  payment_status: "cod_due" | "pending" | "paid" | "failed" | "refunded";
  payment_ref: string;
  payment_mode: string;
  paid_at: string;
  mrp_total: number;
  subtotal: number;
  coupon_code: string;
  coupon_discount: number;
  delivery_fee: number;
  total: number;
  email: string;
  phone: string;
  address_json: string;
  courier: string;
  tracking_number: string;
  admin_note: string;
  exchange_json: string;
  idempotency_key: string | null;
  idempotency_fingerprint: string;
  created_at: string;
  updated_at: string;
};

type ItemRow = {
  slug: string;
  sku: string;
  title: string;
  image: string;
  unit_price: number;
  mrp: number | null;
  qty: number;
};

type EventRow = { status: string; note: string; actor: string; created_at: string };

export function orderId(): string {
  // GLV-260924-7KQ2M: sortable by day, short enough to read out on a call.
  // The alphabet has no 0/O or 1/I.
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const suffix = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  const ist = new Date(Date.now() + 330 * 60_000);
  const date = ist.toISOString().slice(2, 10).replace(/-/g, "");
  return `GLV-${date}-${suffix}`;
}

export function formatRupees(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

/** The shape both the customer and admin views read. */
export async function loadOrder(env: Env, id: string) {
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?1`).bind(id).first<OrderRow>();
  if (!order) return null;
  const [items, events] = await Promise.all([
    env.DB.prepare(
      `SELECT slug, sku, title, image, unit_price, mrp, qty FROM order_items WHERE order_id = ?1`,
    )
      .bind(id)
      .all<ItemRow>(),
    env.DB.prepare(
      `SELECT status, note, actor, created_at FROM order_events WHERE order_id = ?1 ORDER BY id`,
    )
      .bind(id)
      .all<EventRow>(),
  ]);
  return {
    row: order,
    view: {
      id: order.id,
      status: order.status,
      statusLabel: STATUS_LABEL[order.status],
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentRef: order.payment_ref,
      paymentMode: order.payment_mode,
      paidAt: order.paid_at,
      mrpTotal: order.mrp_total || order.subtotal,
      subtotal: order.subtotal,
      couponCode: order.coupon_code,
      couponDiscount: order.coupon_discount,
      deliveryFee: order.delivery_fee,
      total: order.total,
      email: order.email,
      phone: order.phone,
      address: JSON.parse(order.address_json) as Record<string, string>,
      courier: order.courier,
      trackingNumber: order.tracking_number,
      exchange: order.exchange_json ? (JSON.parse(order.exchange_json) as Record<string, unknown>) : null,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      items: items.results.map((i) => ({
        slug: i.slug,
        sku: i.sku,
        title: i.title,
        image: i.image,
        unitPrice: i.unit_price,
        mrp: i.mrp,
        qty: i.qty,
      })),
      events: events.results.map((e) => ({ status: e.status, note: e.note, at: e.created_at, actor: e.actor })),
    },
  };
}

type OrderView = NonNullable<Awaited<ReturnType<typeof loadOrder>>>["view"];

function itemsText(items: { title: string; qty: number; unitPrice: number }[]) {
  return items.map((i) => `  ${i.qty} x ${i.title}  ${formatRupees(i.unitPrice * i.qty)}`).join("\n");
}

/** The customer email for each stage. */
export async function notifyCustomer(env: Env, id: string): Promise<void> {
  const loaded = await loadOrder(env, id);
  if (!loaded) return;
  const o = loaded.view;
  const link = `${env.SITE_URL}/account/order/?id=${o.id}`;
  const shipment =
    (o.courier ? ` Courier: ${o.courier}.` : "") + (o.trackingNumber ? ` Tracking number: ${o.trackingNumber}.` : "");
  const lines: Partial<Record<OrderStatus, [string, string]>> = {
    placed: [
      `Order ${o.id} placed — confirmation pending`,
      `Thank you for placing your order. We will call you on ${o.phone} to confirm stock, the final amount and the delivery date before dispatch.` +
        (o.paymentMethod === "cod"
          ? ` You pay ${formatRupees(o.total)} when it is delivered.`
          : ` Your payment of ${formatRupees(o.total)} has been received.`),
    ],
    confirmed: [
      `Order ${o.id} confirmed`,
      `Your order is confirmed and is being prepared for dispatch. It usually reaches you in ${business.deliveryDaysMin}–${business.deliveryDaysMax} days.`,
    ],
    packed: [`Order ${o.id} packed`, `Your order is packed and will be handed to the courier shortly.`],
    shipped: [`Order ${o.id} shipped`, `Your order is on its way.${shipment}`],
    out_for_delivery: [
      `Order ${o.id} is out for delivery`,
      `Your order will reach you today. Please keep your phone reachable.${shipment}`,
    ],
    delivered: [
      `Order ${o.id} delivered`,
      `Your order has been delivered. Thank you for shopping with Galvio Enterprises.\n\n` +
        `How is it? A quick review helps other buyers:\n` +
        o.items
          .filter((i) => !i.slug.startsWith("plan:"))
          .map((i) => `  ${i.title}: ${env.SITE_URL}/product/${i.slug}/#reviews`)
          .join("\n"),
    ],
    cancelled: [
      `Order ${o.id} cancelled`,
      `Your order has been cancelled.` +
        (o.paymentStatus === "paid" || o.paymentStatus === "refunded"
          ? " Your payment will be refunded to the original payment method within 5-7 working days."
          : ""),
    ],
  };
  const entry = lines[o.status];
  if (!entry) return;
  await sendTrackedEmail(env, {
    to: o.email,
    subject: entry[0],
    text: `${entry[1]}\n\n${itemsText(o.items)}\n\nTotal: ${formatRupees(o.total)}\n\nTrack your order: ${link}\n\nQuestions or complaints? Call us on ${site.contact.phone}.\n`,
  }, `order-customer:${id}:${o.status}:${o.email}`);
}

async function notifyAdmins(env: Env, id: string, heading = "New COD order"): Promise<void> {
  const loaded = await loadOrder(env, id);
  if (!loaded) return;
  const o = loaded.view;
  const a = o.address;
  await Promise.all(
    [...adminEmails(env)].map((to) =>
      sendTrackedEmail(env, {
        to,
        subject: `${heading} ${o.id} - ${formatRupees(o.total)} (${o.paymentMethod === "cod" ? "COD" : "Paid online"})`,
        text:
          `${itemsText(o.items)}\n\nTotal: ${formatRupees(o.total)}\n` +
          `Deliver to: ${a.name}, ${a.phone}\n${a.line1} ${a.line2}\n${a.city}, ${a.state} ${a.pincode}\n\n` +
          `Manage: ${env.SITE_URL}/admin/?order=${o.id}\n`,
      }, `order-admin:${id}:${o.status}:${to}`),
    ),
  );
}

// D1's meta.changes also counts rows changed by triggers (stock and coupon
// release on cancellation), so "did the guarded UPDATE apply" is tested as
// changes > 0, never === 1.

/**
 * Moves an online order from pending_payment to placed, exactly once.
 * Called from the webhook and from the status check on return, which can
 * race; the conditional UPDATE makes only one of them win.
 */
export async function markPaid(env: Env, id: string, actor: string): Promise<void> {
  const details = await fetchPaymentDetails(env, id);
  const result = await env.DB.prepare(
    `UPDATE orders SET status = 'placed', payment_status = 'paid', payment_ref = ?3, payment_mode = ?4,
            paid_at = ?5, updated_at = ?2
      WHERE id = ?1 AND status = 'pending_payment'`,
  )
    .bind(id, now(), details?.ref ?? "", details?.mode ?? "", details?.at ?? now())
    .run();
  if (result.meta.changes === 0) {
    // Paid after the customer cancelled: record the money so the order
    // shows up for a refund instead of disappearing.
    const late = await env.DB.prepare(
      `UPDATE orders SET payment_status = 'paid', payment_ref = ?3, updated_at = ?2
        WHERE id = ?1 AND status = 'cancelled' AND payment_method = 'online' AND payment_status != 'paid'`,
    )
      .bind(id, now(), details?.ref ?? "")
      .run();
    if (late.meta.changes > 0) {
      await env.DB.prepare(
        `INSERT INTO order_events (order_id, status, note, actor, created_at)
         VALUES (?1, 'cancelled', 'Payment received after cancellation: refund due', ?2, ?3)`,
      )
        .bind(id, actor, now())
        .run();
    }
    return;
  }
  await env.DB.prepare(
    `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?1, 'placed', 'Payment received', ?2, ?3)`,
  )
    .bind(id, actor, now())
    .run();
  await Promise.all([notifyCustomer(env, id), notifyAdmins(env, id)]);
}

export async function markPaymentFailed(env: Env, id: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE orders SET payment_status = 'failed', updated_at = ?2
      WHERE id = ?1 AND status = 'pending_payment' AND payment_status = 'pending'`,
  )
    .bind(id, now())
    .run();
}

const createSchema = z.object({
  items: itemsSchema,
  addressId: z.string().min(1, "Choose a delivery address."),
  coupon: couponCodeSchema.default(""),
  /** Contact email for order updates; required only if the account has none. */
  email: z.string().trim().toLowerCase().pipe(z.email()).optional().or(z.literal("")),
  paymentMethod: z.enum(["cod", ...(Object.keys(METHOD_FILTER) as OnlineMethod[])]),
  idempotencyKey: z.string().trim().regex(/^[A-Za-z0-9_-]{16,100}$/),
});

type CreateOrderBody = z.infer<typeof createSchema>;

async function orderFingerprint(body: CreateOrderBody): Promise<string> {
  const items = [...body.items]
    .map((item) => ({ slug: item.slug, qty: item.qty, plan: Boolean(item.plan) }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return sha256(JSON.stringify({
    items,
    addressId: body.addressId,
    coupon: body.coupon,
    email: body.email ?? "",
    paymentMethod: body.paymentMethod,
  }));
}

async function replayOrder(env: Env, row: Pick<OrderRow, "id" | "status" | "payment_method">): Promise<Response> {
  if (row.status === "pending_payment" && row.payment_method === "online") {
    const sessionId = await existingSession(env, row.id);
    if (sessionId !== null) {
      return json({ id: row.id, next: "pay", payment: { sessionId, mode: checkoutMode(env) }, replayed: true });
    }
  }
  return json({ id: row.id, next: "complete", replayed: true });
}

export async function createOrder(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const body = await readBody(request, createSchema);
  const headerKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (headerKey && !/^[A-Za-z0-9_-]{16,100}$/.test(headerKey)) {
    throw new HttpError(400, "Invalid idempotency key.");
  }
  if (headerKey && headerKey !== body.idempotencyKey) {
    throw new HttpError(400, "Idempotency keys in the header and body must match.");
  }
  const idempotencyKey = headerKey || body.idempotencyKey;
  const fingerprint = await orderFingerprint(body);
  const existing = await env.DB.prepare(
    `SELECT id, status, payment_method, idempotency_fingerprint
       FROM orders WHERE user_id = ?1 AND idempotency_key = ?2`,
  )
    .bind(user.id, idempotencyKey)
    .first<Pick<OrderRow, "id" | "status" | "payment_method" | "idempotency_fingerprint">>();
  if (existing) {
    if (existing.idempotency_fingerprint !== fingerprint) {
      throw new HttpError(409, "This checkout request was already used with different details.");
    }
    return replayOrder(env, existing);
  }
  await Promise.all([
    enforceRateLimit(request, env, "order-user", 10, 15 * 60, user.id),
    enforceRateLimit(request, env, "order-ip", 20, 15 * 60),
  ]);

  const address = await getAddress(user.id, body.addressId, env);
  if (!address) throw new HttpError(400, "Choose a delivery address.");

  const q = await quote(env, body.items, body.coupon);
  const cod = body.paymentMethod === "cod";

  if (cod) {
    if (!business.cashOnDelivery) throw new HttpError(400, "Cash on Delivery is not available.");
    if (q.total > business.codLimit) {
      throw new HttpError(
        400,
        `Cash on Delivery is available on orders up to ${formatRupees(business.codLimit)}. Contact us for help with a larger order.`,
      );
    }
  } else if (!business.onlinePayments || !onlinePaymentsEnabled(env)) {
    throw new HttpError(400, "Online payment is not available yet. Choose Cash on Delivery.");
  } else if (body.paymentMethod === "emi" && q.total < business.emi.minOrder) {
    throw new HttpError(400, `EMI is available on orders of ${formatRupees(business.emi.minOrder)} or more.`);
  }

  const id = orderId();
  const timestamp = now();
  const { id: _addressId, isDefault: _isDefault, ...addressSnapshot } = address;
  void _addressId;
  void _isDefault;

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO orders (id, user_id, status, payment_method, payment_status, mrp_total, subtotal,
         coupon_code, coupon_discount, delivery_fee, total, email, phone, address_json, created_at, updated_at,
         exchange_json, idempotency_key, idempotency_fingerprint)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?15, ?16, ?17, ?18)`,
    ).bind(
      id, user.id, cod ? "placed" : "pending_payment", cod ? "cod" : "online", cod ? "cod_due" : "pending",
      q.mrpTotal, q.subtotal, q.couponCode, q.couponDiscount, q.deliveryFee, q.total, body.email || user.email,
      address.phone, JSON.stringify(addressSnapshot), timestamp, "", idempotencyKey, fingerprint,
    ),
    ...q.lines.map((l) =>
      env.DB.prepare(
        `INSERT INTO order_items (order_id, slug, sku, title, image, unit_price, mrp, qty)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      ).bind(id, l.product.slug, l.product.sku, l.product.title, l.product.image, l.product.price, l.product.mrp, l.qty),
    ),
    ...q.plans.map((p) =>
      env.DB.prepare(
        `INSERT INTO order_items (order_id, slug, sku, title, image, unit_price, mrp, qty)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7)`,
      ).bind(id, `plan:${p.plan.id}:${p.product.slug}`, p.plan.id, `${p.plan.title} for ${p.product.title}`, p.product.image, p.plan.price, p.qty),
    ),
    env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?1, ?2, ?3, 'customer', ?4)`,
    ).bind(id, cod ? "placed" : "pending_payment", cod ? "Cash on Delivery request" : "", timestamp),
    // Fill in the profile from the first order, so the next checkout is
    // pre-filled.
    env.DB.prepare(
      `UPDATE users SET name = CASE WHEN name = '' THEN ?2 ELSE name END,
                        phone = CASE WHEN phone = '' THEN ?3 ELSE phone END WHERE id = ?1`,
    ).bind(user.id, address.name, address.phone),
  ];
  if (q.couponCode) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO coupon_redemptions (order_id, code, user_id, discount, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)`,
      ).bind(id, q.couponCode, user.id, q.couponDiscount, timestamp),
    );
  }
  statements.push(
    ...q.lines.map((line) =>
      env.DB.prepare(
        `INSERT INTO inventory_reservations
           (order_id, slug, qty, availability_before, counted, override_updated_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      ).bind(
        id,
        line.product.slug,
        line.qty,
        line.product.availability,
        line.countedStock ? 1 : 0,
        line.overrideUpdatedAt ?? "",
        timestamp,
      ),
    ),
  );
  try {
    await env.DB.batch(statements);
  } catch (error) {
    const concurrent = await env.DB.prepare(
      `SELECT id, status, payment_method, idempotency_fingerprint
         FROM orders WHERE user_id = ?1 AND idempotency_key = ?2`,
    )
      .bind(user.id, idempotencyKey)
      .first<Pick<OrderRow, "id" | "status" | "payment_method" | "idempotency_fingerprint">>();
    if (concurrent) {
      if (concurrent.idempotency_fingerprint !== fingerprint) {
        throw new HttpError(409, "This checkout request was already used with different details.");
      }
      return replayOrder(env, concurrent);
    }
    if (String(error).includes("stock_unavailable")) {
      throw new HttpError(409, "Price or stock changed while you were checking out. Review your cart and try again.");
    }
    if (q.couponCode && String(error).includes("coupon_unavailable")) {
      console.warn("[orders] coupon reservation failed", error);
      throw new HttpError(409, "That coupon just became unavailable. Review your total and try again.");
    }
    throw error;
  }

  // The cart is now an order: no abandoned-cart reminder for it.
  await env.DB.prepare(`DELETE FROM carts WHERE user_id = ?1`).bind(user.id).run();

  if (cod) {
    await Promise.all([notifyCustomer(env, id), notifyAdmins(env, id)]);
    return json({ id, next: "complete" });
  }

  try {
    const payment = await createPayment(env, {
      orderId: id,
      amount: q.total,
      method: body.paymentMethod as OnlineMethod,
      customer: {
        id: user.id,
        name: address.name,
        // Cashfree needs an address; a placeholder is fine for its records.
        email: body.email || (user.email.endsWith(".invalid") ? `orders+${user.id}@galvioenterprises.com` : user.email),
        phone: address.phone,
      },
    });
    return json({ id, next: "pay", payment });
  } catch (error) {
    // A timeout does not prove Cashfree failed: if it did create the order,
    // hand the customer that session instead of cancelling.
    const sessionId = await existingSession(env, id).catch(() => null);
    if (sessionId) return json({ id, next: "pay", payment: { sessionId, mode: checkoutMode(env) } });
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE orders SET status = 'cancelled', payment_status = 'failed', updated_at = ?2
          WHERE id = ?1 AND status = 'pending_payment' AND payment_status = 'pending'`,
      ).bind(id, now()),
      // If a webhook already won and marked the order paid, changes() is
      // zero and its coupon/stock reservation must remain intact.
      env.DB.prepare(
        `DELETE FROM coupon_redemptions WHERE order_id = ?1 AND changes() = 1`,
      ).bind(id),
    ]);
    throw error;
  }
}

async function ownOrder(request: Request, env: Env, id: string) {
  const user = await requireUser(request, env);
  const loaded = await loadOrder(env, id);
  if (!loaded || loaded.row.user_id !== user.id) throw new HttpError(404, "Order not found.");
  return { user, loaded };
}

/** Customers see what happened and when; internal notes and who did it stay internal. */
function customerView(view: OrderView) {
  return {
    ...view,
    events: view.events.map((e) => ({
      status: e.status,
      note: e.actor.startsWith("admin") ? "" : e.note,
      at: e.at,
    })),
  };
}

export async function listOrders(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const { results } = await env.DB.prepare(
    `SELECT id FROM orders
      WHERE user_id = ?1
        -- Unpaid or abandoned online checkouts are not orders the customer
        -- made; the checkout result page handles retrying them.
        AND status != 'pending_payment'
        AND NOT (status = 'cancelled' AND payment_status = 'failed')
      ORDER BY created_at DESC LIMIT 100`,
  )
    .bind(user.id)
    .all<{ id: string }>();
  const orders = await Promise.all(results.map((r) => loadOrder(env, r.id)));
  return json({ orders: orders.flatMap((o) => (o ? [customerView(o.view)] : [])) });
}

export async function getOrder(request: Request, env: Env, id: string): Promise<Response> {
  let { loaded } = await ownOrder(request, env, id);

  // Returning from the payment page: ask the gateway rather than wait for
  // the webhook, which can arrive a few seconds later.
  let expired = false;
  if (loaded.row.status === "pending_payment" && !simulated(env)) {
    const state = await fetchPaymentState(env, id);
    if (state === "paid") await markPaid(env, id, "gateway");
    if (state === "failed") {
      await markPaymentFailed(env, id);
      expired = true;
    }
    if (state !== "pending") loaded = (await loadOrder(env, id))!;
  }
  return json({ order: customerView(loaded.view), expired });
}

export async function retryPayment(request: Request, env: Env, id: string): Promise<Response> {
  const { loaded } = await ownOrder(request, env, id);
  if (loaded.row.status !== "pending_payment") throw new HttpError(400, "This order is not awaiting payment.");
  const sessionId = await existingSession(env, id);
  if (sessionId === null) {
    throw new HttpError(410, "This payment session has expired. Please place the order again from your cart.");
  }
  await env.DB.prepare(`UPDATE orders SET payment_status = 'pending', updated_at = ?2 WHERE id = ?1`)
    .bind(id, now())
    .run();
  return json({ id, payment: { sessionId, mode: checkoutMode(env) } });
}

/** A customer whose online payment failed can switch the order to COD. */
export async function switchToCod(request: Request, env: Env, id: string): Promise<Response> {
  const { loaded } = await ownOrder(request, env, id);
  if (loaded.row.status !== "pending_payment") throw new HttpError(400, "This order is not awaiting payment.");
  if (loaded.row.total > business.codLimit) {
    throw new HttpError(400, `Cash on Delivery is available on orders up to ${formatRupees(business.codLimit)}.`);
  }
  const result = await env.DB.prepare(
    `UPDATE orders SET status = 'placed', payment_method = 'cod', payment_status = 'cod_due', updated_at = ?2
      WHERE id = ?1 AND status = 'pending_payment'`,
  )
    .bind(id, now())
    .run();
  if (result.meta.changes > 0) {
    await env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?1, 'placed', 'Switched to Cash on Delivery', 'customer', ?2)`,
    )
      .bind(id, now())
      .run();
    await Promise.all([notifyCustomer(env, id), notifyAdmins(env, id)]);
  }
  return json({ id });
}

export async function cancelOrder(request: Request, env: Env, id: string): Promise<Response> {
  const { user, loaded } = await ownOrder(request, env, id);
  if (!["placed", "confirmed", "pending_payment"].includes(loaded.row.status)) {
    throw new HttpError(400, "This order has been packed and can no longer be cancelled online. Please contact support.");
  }
  const result = await env.DB.prepare(
    `UPDATE orders SET status = 'cancelled', updated_at = ?2
      WHERE id = ?1 AND status IN ('placed', 'confirmed', 'pending_payment')`,
  )
    .bind(id, now())
    .run();
  if (result.meta.changes > 0) {
    await env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, actor, created_at) VALUES (?1, 'cancelled', 'Cancelled by customer', ?2, ?3)`,
    )
      .bind(id, `customer:${user.email}`, now())
      .run();
    if (loaded.row.status !== "pending_payment") {
      await Promise.all([notifyCustomer(env, id), notifyAdmins(env, id, "Cancelled by customer:")]);
    }
  }
  const reloaded = await loadOrder(env, id);
  return json({ order: customerView(reloaded!.view) });
}

/** Dev only: completes a simulated payment. */
export async function simulatePayment(request: Request, env: Env): Promise<Response> {
  if (!simulated(env)) throw new HttpError(404, "Not found.");
  const body = await readBody(request, z.object({ id: z.string(), outcome: z.enum(["paid", "failed"]) }));
  await ownOrder(request, env, body.id);
  if (body.outcome === "paid") await markPaid(env, body.id, "simulator");
  else await markPaymentFailed(env, body.id);
  return json({ ok: true });
}

/**
 * Scheduled: settles online orders whose payment window has closed.
 *
 * Asks Cashfree first, so a payment whose webhook was lost is still
 * recorded as paid. Anything else is cancelled, and the database triggers
 * release the stock and coupon the order was holding. A payment that
 * somehow lands after this is kept and flagged for refund by markPaid.
 */
export async function expireUnpaidOrders(env: Env): Promise<void> {
  // A 15-minute margin past Cashfree's own expiry for in-flight payments.
  const cutoff = new Date(Date.now() - (PAYMENT_WINDOW_MINUTES + 15) * 60_000).toISOString();
  const { results } = await env.DB.prepare(
    `SELECT id FROM orders WHERE status = 'pending_payment' AND created_at < ?1 ORDER BY created_at LIMIT 50`,
  )
    .bind(cutoff)
    .all<{ id: string }>();
  for (const { id } of results) {
    try {
      const state = simulated(env) ? "failed" : await fetchPaymentState(env, id);
      if (state === "paid") {
        await markPaid(env, id, "gateway:reconcile");
        continue;
      }
      const result = await env.DB.prepare(
        `UPDATE orders SET status = 'cancelled', payment_status = 'failed', updated_at = ?2
          WHERE id = ?1 AND status = 'pending_payment'`,
      )
        .bind(id, now())
        .run();
      if (result.meta.changes > 0) {
        await env.DB.prepare(
          `INSERT INTO order_events (order_id, status, note, actor, created_at)
           VALUES (?1, 'cancelled', 'Payment not completed in time', 'system', ?2)`,
        )
          .bind(id, now())
          .run();
      }
    } catch (error) {
      console.error(`[orders] expiring ${id} failed`, error);
    }
  }
}
