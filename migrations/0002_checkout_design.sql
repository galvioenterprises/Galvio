-- Fields the checkout, confirmation and tracking designs need.

-- "Home", "Work" or "Other" on each saved address.
ALTER TABLE addresses ADD COLUMN label TEXT NOT NULL DEFAULT 'Home';

-- status now also allows: packed, out_for_delivery.
-- Gateway transaction id and time, shown on the confirmation page.
ALTER TABLE orders ADD COLUMN payment_ref TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN payment_mode TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN paid_at TEXT NOT NULL DEFAULT '';
-- Sum of MRPs, so the summary can show "Discount" like the cart does.
ALTER TABLE orders ADD COLUMN mrp_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN coupon_code TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN coupon_discount INTEGER NOT NULL DEFAULT 0;

-- Coupons, managed from /admin/.
-- kind: percent | flat. value: percent (1-90) or rupees.
CREATE TABLE coupons (
  code          TEXT PRIMARY KEY,
  description   TEXT NOT NULL DEFAULT '',
  kind          TEXT NOT NULL,
  value         INTEGER NOT NULL,
  min_order     INTEGER NOT NULL DEFAULT 0,
  max_discount  INTEGER NOT NULL DEFAULT 0,
  usage_limit   INTEGER NOT NULL DEFAULT 0,
  used_count    INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1,
  expires_at    TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL
);
