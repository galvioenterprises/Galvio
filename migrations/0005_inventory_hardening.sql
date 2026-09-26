-- Runtime inventory overrides, replay-safe orders and reliable notifications.
-- The build-time catalogue remains the source of product identity/content;
-- only the four operational fields below can be changed after deployment.

CREATE TABLE catalogue_overrides (
  slug          TEXT PRIMARY KEY,
  availability  TEXT NOT NULL CHECK (availability IN ('unknown', 'in_stock', 'out_of_stock', 'preorder', 'backorder')),
  stock_count   INTEGER CHECK (stock_count IS NULL OR stock_count >= 0),
  mrp           INTEGER CHECK (mrp IS NULL OR mrp > 0),
  selling_price INTEGER NOT NULL CHECK (selling_price > 0),
  updated_by    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  CHECK (mrp IS NULL OR selling_price <= mrp),
  CHECK (NOT (availability = 'in_stock' AND stock_count = 0)),
  CHECK (NOT (availability = 'out_of_stock' AND COALESCE(stock_count, 0) > 0))
);

CREATE TABLE catalogue_override_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL,
  actor       TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX catalogue_override_events_slug ON catalogue_override_events (slug, id DESC);

ALTER TABLE orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE orders ADD COLUMN idempotency_fingerprint TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX orders_user_idempotency
  ON orders (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Inserting a redemption and the order happens in one D1 batch. The trigger
-- makes the usage-limit check and increment one SQLite transaction, so two
-- simultaneous checkouts cannot both take the final use.
CREATE TABLE coupon_redemptions (
  order_id    TEXT PRIMARY KEY REFERENCES orders (id) ON DELETE CASCADE,
  code        TEXT NOT NULL REFERENCES coupons (code),
  user_id     TEXT NOT NULL REFERENCES users (id),
  discount    INTEGER NOT NULL CHECK (discount >= 0),
  created_at  TEXT NOT NULL
);
CREATE INDEX coupon_redemptions_code ON coupon_redemptions (code, created_at);

CREATE TRIGGER coupon_redemption_validate
BEFORE INSERT ON coupon_redemptions
BEGIN
  -- D1's remote statement splitter can mistake an unparenthesized CASE ... END
  -- for this trigger's END. Keep the CASE expression parenthesized.
  SELECT (CASE WHEN NOT EXISTS (
    SELECT 1
      FROM coupons c
      JOIN orders o ON o.id = NEW.order_id
     WHERE c.code = NEW.code
       AND o.user_id = NEW.user_id
       AND o.coupon_code = NEW.code
       AND o.coupon_discount = NEW.discount
       AND c.active = 1
       AND (c.expires_at = '' OR c.expires_at >= NEW.created_at)
       AND o.subtotal >= c.min_order
       AND (c.usage_limit = 0 OR c.used_count < c.usage_limit)
  ) THEN RAISE(ABORT, 'coupon_unavailable') END);
END;

CREATE TRIGGER coupon_redemption_increment
AFTER INSERT ON coupon_redemptions
BEGIN
  UPDATE coupons SET used_count = used_count + 1 WHERE code = NEW.code;
END;

CREATE TRIGGER coupon_redemption_decrement
AFTER DELETE ON coupon_redemptions
BEGIN
  UPDATE coupons SET used_count = MAX(0, used_count - 1) WHERE code = OLD.code;
END;

CREATE TABLE notification_outbox (
  id              TEXT PRIMARY KEY,
  dedupe_key      TEXT NOT NULL UNIQUE,
  channel         TEXT NOT NULL CHECK (channel IN ('email')),
  recipient       TEXT NOT NULL,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_error      TEXT NOT NULL DEFAULT '',
  next_attempt_at TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  sent_at         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX notification_outbox_retry
  ON notification_outbox (status, next_attempt_at);

-- Small fixed-window counters. Keys are SHA-256 fingerprints, never raw IPs,
-- phone numbers or email addresses.
CREATE TABLE api_rate_limits (
  scope          TEXT NOT NULL,
  key_hash       TEXT NOT NULL,
  window_started TEXT NOT NULL,
  hits           INTEGER NOT NULL,
  PRIMARY KEY (scope, key_hash)
);
