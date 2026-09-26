import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (let number = 1; number <= 9; number += 1) {
    const name = String(number).padStart(4, "0");
    const file = number === 1
      ? `migrations/${name}_init.sql`
      : number === 2
        ? `migrations/${name}_checkout_design.sql`
        : number === 3
          ? `migrations/${name}_addons_exchange.sql`
          : number === 4
            ? `migrations/${name}_reviews_carts_alerts.sql`
            : number === 5
              ? `migrations/${name}_inventory_hardening.sql`
              : number === 6
                ? `migrations/${name}_inventory_reservations.sql`
                : number === 7
                ? `migrations/${name}_inventory_release_safety.sql`
                : number === 8
                  ? `migrations/${name}_inventory_commit_guards.sql`
                  : `migrations/${name}_order_confirmation_coupon_release.sql`;
    db.exec(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
  }
  db.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)")
    .run("user-1", "buyer@example.com", "2026-09-25T00:00:00.000Z");
  return db;
}

function insertOrder(db, id, key, coupon = "", discount = 0) {
  db.prepare(
    `INSERT INTO orders
       (id, user_id, status, payment_method, payment_status, subtotal, delivery_fee, total,
        email, phone, address_json, created_at, updated_at, coupon_code, coupon_discount,
        idempotency_key, idempotency_fingerprint)
     VALUES (?, 'user-1', 'placed', 'cod', 'cod_due', 1000, 0, ?,
             'buyer@example.com', '9876543210', '{}', ?, ?, ?, ?, ?, 'fingerprint')`,
  ).run(id, 1000 - discount, "2026-09-25T00:00:00.000Z", "2026-09-25T00:00:00.000Z", coupon, discount, key);
}

test("order idempotency is unique per customer", () => {
  const db = database();
  insertOrder(db, "GLV-260925-ABCDE", "stable-request-key-1");
  assert.throws(() => insertOrder(db, "GLV-260925-ABCDF", "stable-request-key-1"), /UNIQUE/);
});

test("OTP attempts are capped and a correct code is consumed once", () => {
  const db = database();
  const timestamp = "2026-09-25T00:00:00.000Z";
  const expires = "2026-09-25T00:10:00.000Z";
  db.prepare(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts)
     VALUES ('email:buyer@example.com', 'hash-a', ?, 0)`,
  ).run(expires);
  const wrongAttempt = db.prepare(
    `UPDATE login_codes SET attempts = attempts + 1
      WHERE email = 'email:buyer@example.com' AND code_hash = ? AND expires_at >= ? AND attempts < 5`,
  );
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(wrongAttempt.run("hash-a", timestamp).changes, 1);
  }
  assert.equal(wrongAttempt.run("hash-a", timestamp).changes, 0);

  db.prepare(
    `UPDATE login_codes SET code_hash = 'hash-b', attempts = 0
      WHERE email = 'email:buyer@example.com'`,
  ).run();
  assert.equal(wrongAttempt.run("hash-a", timestamp).changes, 0);
  assert.equal(
    db.prepare("SELECT attempts FROM login_codes WHERE email = 'email:buyer@example.com'").get().attempts,
    0,
  );

  const consume = db.prepare(
    `DELETE FROM login_codes
      WHERE email = 'email:buyer@example.com' AND code_hash = 'hash-b'
        AND expires_at >= ? AND attempts < 5`,
  );
  assert.equal(consume.run(timestamp).changes, 1);
  assert.equal(consume.run(timestamp).changes, 0);
});

test("a stale admin status transition writes no audit event", () => {
  const db = database();
  insertOrder(db, "GLV-260925-ADMIN", "admin-transition-key");
  const transition = db.prepare(
    `UPDATE orders SET status = ?, updated_at = ?
      WHERE id = 'GLV-260925-ADMIN' AND status = ? AND payment_status = 'cod_due'`,
  );
  const audit = db.prepare(
    `INSERT INTO order_events (order_id, status, note, actor, created_at)
     SELECT 'GLV-260925-ADMIN', ?, '', 'admin:test@example.com', ? WHERE changes() = 1`,
  );

  assert.equal(transition.run("confirmed", "2026-09-25T00:00:01.000Z", "placed").changes, 1);
  audit.run("confirmed", "2026-09-25T00:00:01.000Z");
  assert.equal(transition.run("cancelled", "2026-09-25T00:00:02.000Z", "placed").changes, 0);
  audit.run("cancelled", "2026-09-25T00:00:02.000Z");

  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM order_events WHERE order_id = 'GLV-260925-ADMIN'").get().count,
    1,
  );
  assert.equal(db.prepare("SELECT status FROM orders WHERE id = 'GLV-260925-ADMIN'").get().status, "confirmed");
});

test("the last coupon use can only be reserved once", () => {
  const db = database();
  db.prepare(
    `INSERT INTO coupons
       (code, kind, value, usage_limit, created_at)
     VALUES ('LASTONE', 'flat', 100, 1, '2026-09-25T00:00:00.000Z')`,
  ).run();
  insertOrder(db, "GLV-260925-AAAAB", "coupon-request-0001", "LASTONE", 100);
  db.prepare(
    `INSERT INTO coupon_redemptions (order_id, code, user_id, discount, created_at)
     VALUES (?, 'LASTONE', 'user-1', 100, ?)`,
  ).run("GLV-260925-AAAAB", "2026-09-25T00:00:00.000Z");
  assert.equal(db.prepare("SELECT used_count FROM coupons WHERE code = 'LASTONE'").get().used_count, 1);

  db.exec("BEGIN");
  insertOrder(db, "GLV-260925-AAAAC", "coupon-request-0002", "LASTONE", 100);
  assert.throws(
    () => db.prepare(
      `INSERT INTO coupon_redemptions (order_id, code, user_id, discount, created_at)
       VALUES (?, 'LASTONE', 'user-1', 100, ?)`,
    ).run("GLV-260925-AAAAC", "2026-09-25T00:00:00.000Z"),
    /coupon_unavailable/,
  );
  db.exec("ROLLBACK");
});

test("a placed order must be confirmed before fulfilment", () => {
  const db = database();
  insertOrder(db, "GLV-260925-CONFR", "confirmation-required-key");

  assert.throws(
    () => db.prepare("UPDATE orders SET status = 'packed' WHERE id = 'GLV-260925-CONFR'").run(),
    /order_confirmation_required/,
  );
  assert.equal(
    db.prepare("UPDATE orders SET status = 'confirmed' WHERE id = 'GLV-260925-CONFR'").run().changes,
    1,
  );
  assert.equal(
    db.prepare("UPDATE orders SET status = 'shipped' WHERE id = 'GLV-260925-CONFR'").run().changes,
    1,
  );
});

test("cancelling a COD order releases its coupon use", () => {
  const db = database();
  db.prepare(
    `INSERT INTO coupons (code, kind, value, usage_limit, created_at)
     VALUES ('CANCELLED', 'flat', 100, 1, '2026-09-25T00:00:00.000Z')`,
  ).run();
  insertOrder(db, "GLV-260925-CODCX", "cancelled-cod-order", "CANCELLED", 100);
  db.prepare(
    `INSERT INTO coupon_redemptions (order_id, code, user_id, discount, created_at)
     VALUES ('GLV-260925-CODCX', 'CANCELLED', 'user-1', 100, '2026-09-25T00:00:00.000Z')`,
  ).run();

  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'GLV-260925-CODCX'").run();

  assert.equal(db.prepare("SELECT used_count FROM coupons WHERE code = 'CANCELLED'").get().used_count, 0);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM coupon_redemptions WHERE order_id = 'GLV-260925-CODCX'").get().count,
    0,
  );
  assert.equal(db.prepare("SELECT payment_status FROM orders WHERE id = 'GLV-260925-CODCX'").get().payment_status, "cod_due");
});

test("coupon release does not mark a paid cancellation as refunded", () => {
  const db = database();
  db.prepare(
    `INSERT INTO coupons (code, kind, value, usage_limit, created_at)
     VALUES ('REFUNDSAFE', 'flat', 100, 1, '2026-09-25T00:00:00.000Z')`,
  ).run();
  insertOrder(db, "GLV-260925-PAICX", "paid-cancel-order", "REFUNDSAFE", 100);
  db.prepare(
    `UPDATE orders SET payment_method = 'online', payment_status = 'paid'
      WHERE id = 'GLV-260925-PAICX'`,
  ).run();
  db.prepare(
    `INSERT INTO coupon_redemptions (order_id, code, user_id, discount, created_at)
     VALUES ('GLV-260925-PAICX', 'REFUNDSAFE', 'user-1', 100, '2026-09-25T00:00:00.000Z')`,
  ).run();

  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'GLV-260925-PAICX'").run();

  assert.equal(db.prepare("SELECT used_count FROM coupons WHERE code = 'REFUNDSAFE'").get().used_count, 0);
  assert.equal(db.prepare("SELECT payment_status FROM orders WHERE id = 'GLV-260925-PAICX'").get().payment_status, "paid");
});

test("runtime inventory constraints reject contradictory values", () => {
  const db = database();
  const insert = db.prepare(
    `INSERT INTO catalogue_overrides
       (slug, availability, stock_count, mrp, selling_price, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, 'admin:test@example.com', '2026-09-25T00:00:00.000Z')`,
  );
  assert.throws(() => insert.run("bad-price", "in_stock", 2, 1000, 1100), /CHECK/);
  assert.throws(() => insert.run("bad-stock", "out_of_stock", 2, 1000, 900), /CHECK/);
  assert.doesNotThrow(() => insert.run("valid", "unknown", null, 1000, 900));
});

test("counted stock is reserved atomically and released on cancellation", () => {
  const db = database();
  db.prepare(
    `INSERT INTO catalogue_overrides
       (slug, availability, stock_count, mrp, selling_price, updated_by, updated_at)
     VALUES ('only-one', 'in_stock', 1, 1000, 900, 'admin:test@example.com', ?)`,
  ).run("2026-09-25T00:00:00.000Z");
  insertOrder(db, "GLV-260925-STOCK", "stock-request-0001");
  db.prepare(
    `INSERT INTO inventory_reservations
       (order_id, slug, qty, availability_before, counted, override_updated_at, created_at)
     VALUES ('GLV-260925-STOCK', 'only-one', 1, 'in_stock', 1, ?, ?)`,
  ).run("2026-09-25T00:00:00.000Z", "2026-09-25T00:00:00.000Z");
  const reservedStock = db
    .prepare("SELECT availability, stock_count FROM catalogue_overrides WHERE slug = 'only-one'")
    .get();
  assert.equal(reservedStock.availability, "out_of_stock");
  assert.equal(reservedStock.stock_count, 0);

  db.exec("BEGIN");
  insertOrder(db, "GLV-260925-STOC2", "stock-request-0002");
  assert.throws(
    () => db.prepare(
      `INSERT INTO inventory_reservations
         (order_id, slug, qty, availability_before, counted, override_updated_at, created_at)
       VALUES ('GLV-260925-STOC2', 'only-one', 1, 'in_stock', 1, ?, ?)`,
    ).run("2026-09-25T00:00:00.000Z", "2026-09-25T00:00:01.000Z"),
    /stock_unavailable/,
  );
  db.exec("ROLLBACK");

  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'GLV-260925-STOCK'").run();
  const releasedStock = db
    .prepare("SELECT availability, stock_count FROM catalogue_overrides WHERE slug = 'only-one'")
    .get();
  assert.equal(releasedStock.availability, "in_stock");
  assert.equal(releasedStock.stock_count, 1);
});

test("admin stock corrections are not inflated by older cancellations", () => {
  const db = database();
  db.prepare(
    `INSERT INTO catalogue_overrides
       (slug, availability, stock_count, mrp, selling_price, updated_by, updated_at)
     VALUES ('corrected-stock', 'in_stock', 2, 1000, 900, 'admin:test@example.com', ?)`,
  ).run("2026-09-25T00:00:00.000Z");

  insertOrder(db, "GLV-260925-OLDRS", "stock-request-old1");
  db.prepare(
    `INSERT INTO inventory_reservations
       (order_id, slug, qty, availability_before, counted, override_updated_at, created_at)
     VALUES ('GLV-260925-OLDRS', 'corrected-stock', 1, 'in_stock', 1, ?, ?)`,
  ).run("2026-09-25T00:00:00.000Z", "2026-09-25T00:00:01.000Z");

  db.prepare(
    `UPDATE catalogue_overrides
        SET stock_count = 5, updated_by = 'admin:test@example.com', updated_at = ?
      WHERE slug = 'corrected-stock'`,
  ).run("2026-09-25T00:00:02.000Z");

  insertOrder(db, "GLV-260925-NEWRS", "stock-request-new1");
  db.prepare(
    `INSERT INTO inventory_reservations
       (order_id, slug, qty, availability_before, counted, override_updated_at, created_at)
     VALUES ('GLV-260925-NEWRS', 'corrected-stock', 1, 'in_stock', 1, ?, ?)`,
  ).run("2026-09-25T00:00:02.000Z", "2026-09-25T00:00:03.000Z");

  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'GLV-260925-OLDRS'").run();
  assert.equal(
    db.prepare("SELECT stock_count FROM catalogue_overrides WHERE slug = 'corrected-stock'").get().stock_count,
    4,
  );

  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'GLV-260925-NEWRS'").run();
  assert.equal(
    db.prepare("SELECT stock_count FROM catalogue_overrides WHERE slug = 'corrected-stock'").get().stock_count,
    5,
  );
});

test("price-only admin edits keep counted stock releasable", () => {
  const db = database();
  db.prepare(
    `INSERT INTO catalogue_overrides
       (slug, availability, stock_count, mrp, selling_price, updated_by, updated_at)
     VALUES ('price-edit', 'in_stock', 2, 1000, 900, 'admin:test@example.com', ?)`,
  ).run("2026-09-25T00:00:00.000Z");
  insertOrder(db, "GLV-260925-PRICE", "stock-request-price");
  db.prepare(
    `INSERT INTO inventory_reservations
       (order_id, slug, qty, availability_before, counted, override_updated_at, created_at)
     VALUES ('GLV-260925-PRICE', 'price-edit', 1, 'in_stock', 1, ?, ?)`,
  ).run("2026-09-25T00:00:00.000Z", "2026-09-25T00:00:01.000Z");

  db.prepare(
    `UPDATE catalogue_overrides
        SET selling_price = 850, updated_by = 'admin:test@example.com', updated_at = ?
      WHERE slug = 'price-edit'`,
  ).run("2026-09-25T00:00:02.000Z");
  assert.equal(
    db.prepare("SELECT release_allowed FROM inventory_reservations WHERE order_id = 'GLV-260925-PRICE'").get().release_allowed,
    1,
  );

  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = 'GLV-260925-PRICE'").run();
  assert.equal(
    db.prepare("SELECT stock_count FROM catalogue_overrides WHERE slug = 'price-edit'").get().stock_count,
    2,
  );
});

test("null-count inventory still guards availability at order commit", () => {
  const db = database();
  db.prepare(
    `INSERT INTO catalogue_overrides
       (slug, availability, stock_count, mrp, selling_price, updated_by, updated_at)
     VALUES ('confirm-stock', 'unknown', NULL, 1000, 900, 'admin:test@example.com', ?)`,
  ).run("2026-09-25T00:00:00.000Z");
  insertOrder(db, "GLV-260925-NULLS", "stock-request-null1");
  db.prepare(
    `INSERT INTO inventory_reservations
       (order_id, slug, qty, availability_before, counted, override_updated_at, created_at)
     SELECT 'GLV-260925-NULLS', slug, 1, availability,
            CASE WHEN stock_count IS NULL THEN 0 ELSE 1 END, updated_at, ?
       FROM catalogue_overrides WHERE slug = 'confirm-stock'`,
  ).run("2026-09-25T00:00:01.000Z");
  assert.equal(
    db.prepare("SELECT counted FROM inventory_reservations WHERE order_id = 'GLV-260925-NULLS'").get().counted,
    0,
  );

  db.prepare(
    `UPDATE catalogue_overrides
        SET availability = 'out_of_stock', updated_by = 'admin:test@example.com', updated_at = ?
      WHERE slug = 'confirm-stock'`,
  ).run("2026-09-25T00:00:02.000Z");
  insertOrder(db, "GLV-260925-NULL2", "stock-request-null2");
  assert.throws(
    () => db.prepare(
      `INSERT INTO inventory_reservations
         (order_id, slug, qty, availability_before, counted, override_updated_at, created_at)
       VALUES ('GLV-260925-NULL2', 'confirm-stock', 1, 'unknown', 0, ?, ?)`,
    ).run("2026-09-25T00:00:00.000Z", "2026-09-25T00:00:03.000Z"),
    /stock_unavailable/,
  );
});

test("a payment setup failure cannot cancel a webhook-won order", () => {
  const db = database();
  db.prepare(
    `INSERT INTO coupons (code, kind, value, usage_limit, created_at)
     VALUES ('PAIDSAFE', 'flat', 100, 1, '2026-09-25T00:00:00.000Z')`,
  ).run();
  insertOrder(db, "GLV-260925-PAIDS", "payment-race-key", "PAIDSAFE", 100);
  db.prepare(
    `UPDATE orders SET payment_method = 'online', payment_status = 'paid'
      WHERE id = 'GLV-260925-PAIDS'`,
  ).run();
  db.prepare(
    `INSERT INTO coupon_redemptions (order_id, code, user_id, discount, created_at)
     VALUES ('GLV-260925-PAIDS', 'PAIDSAFE', 'user-1', 100, '2026-09-25T00:00:00.000Z')`,
  ).run();

  assert.equal(
    db.prepare(
      `UPDATE orders SET status = 'cancelled', payment_status = 'failed'
        WHERE id = 'GLV-260925-PAIDS'
          AND status = 'pending_payment' AND payment_status = 'pending'`,
    ).run().changes,
    0,
  );
  db.prepare(
    `DELETE FROM coupon_redemptions
      WHERE order_id = 'GLV-260925-PAIDS' AND changes() = 1`,
  ).run();

  assert.equal(
    db.prepare("SELECT payment_status FROM orders WHERE id = 'GLV-260925-PAIDS'").get().payment_status,
    "paid",
  );
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM coupon_redemptions WHERE order_id = 'GLV-260925-PAIDS'").get().count,
    1,
  );
});

test("notification dedupe keys prevent duplicate sends", () => {
  const db = database();
  const insert = db.prepare(
    `INSERT INTO notification_outbox
       (id, dedupe_key, channel, recipient, subject, body, status, next_attempt_at, created_at, updated_at)
     VALUES (?, 'order:1:placed', 'email', 'buyer@example.com', 'Subject', 'Body', 'pending', ?, ?, ?)`,
  );
  const at = "2026-09-25T00:00:00.000Z";
  insert.run("message-1", at, at, at);
  assert.throws(() => insert.run("message-2", at, at, at), /UNIQUE/);
});
