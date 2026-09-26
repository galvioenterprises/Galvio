-- Accounts, sessions, addresses and orders for the storefront Worker.
-- Money is stored in whole rupees (every catalogue price is whole rupees).
-- Times are ISO-8601 UTC strings.

CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);

-- One live code per email. Codes are stored hashed.
CREATE TABLE login_codes (
  email       TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0
);

-- Every code sent, kept for rate limiting per email and per IP.
CREATE TABLE login_sends (
  email       TEXT NOT NULL,
  ip          TEXT NOT NULL,
  sent_at     TEXT NOT NULL
);
CREATE INDEX login_sends_email ON login_sends (email, sent_at);
CREATE INDEX login_sends_ip ON login_sends (ip, sent_at);

-- id is the SHA-256 of the cookie token, so a database leak is not a
-- session leak.
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX sessions_user ON sessions (user_id);

CREATE TABLE addresses (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  line1       TEXT NOT NULL,
  line2       TEXT NOT NULL DEFAULT '',
  landmark    TEXT NOT NULL DEFAULT '',
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  pincode     TEXT NOT NULL,
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX addresses_user ON addresses (user_id);

-- status:         pending_payment | placed | confirmed | shipped | delivered | cancelled
-- payment_method: cod | online
-- payment_status: cod_due | pending | paid | failed | refunded
CREATE TABLE orders (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users (id),
  status          TEXT NOT NULL,
  payment_method  TEXT NOT NULL,
  payment_status  TEXT NOT NULL,
  subtotal        INTEGER NOT NULL,
  delivery_fee    INTEGER NOT NULL,
  total           INTEGER NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT NOT NULL,
  address_json    TEXT NOT NULL,
  courier         TEXT NOT NULL DEFAULT '',
  tracking_number TEXT NOT NULL DEFAULT '',
  admin_note      TEXT NOT NULL DEFAULT '',
  gateway_ref     TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX orders_user ON orders (user_id, created_at);
CREATE INDEX orders_status ON orders (status, created_at);

CREATE TABLE order_items (
  order_id    TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  sku         TEXT NOT NULL,
  title       TEXT NOT NULL,
  image       TEXT NOT NULL,
  unit_price  INTEGER NOT NULL,
  mrp         INTEGER,
  qty         INTEGER NOT NULL
);
CREATE INDEX order_items_order ON order_items (order_id);

-- The customer-visible timeline, and the audit trail of who changed what.
CREATE TABLE order_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  actor       TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX order_events_order ON order_events (order_id, id);
