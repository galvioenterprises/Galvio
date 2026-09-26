-- Verified-buyer reviews. Only customers with a delivered order for the
-- product can write one; each is moderated before it shows.
CREATE TABLE reviews (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users (id),
  order_id    TEXT NOT NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL,
  -- pending | approved | rejected
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL,
  UNIQUE (slug, user_id)
);
CREATE INDEX reviews_slug ON reviews (slug, status, created_at);

-- The signed-in customer's cart, mirrored for abandoned-cart reminders.
CREATE TABLE carts (
  user_id      TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  items_json   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  reminded_at  TEXT NOT NULL DEFAULT ''
);

-- "Tell me when the price drops / it's back in stock".
CREATE TABLE alerts (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  slug         TEXT NOT NULL,
  -- price | stock
  kind         TEXT NOT NULL,
  price        INTEGER NOT NULL,
  created_at   TEXT NOT NULL,
  notified_at  TEXT NOT NULL DEFAULT '',
  UNIQUE (email, slug, kind)
);
CREATE INDEX alerts_open ON alerts (notified_at, kind);
