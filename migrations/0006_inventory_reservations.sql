-- Reserve counted inventory when a request is created. This closes the race
-- where two customers could both pass quote validation for the final unit.
-- Products with a NULL stock_count remain confirmation-based and are not
-- numerically reserved.

CREATE TABLE inventory_reservations (
  order_id            TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  slug                TEXT NOT NULL,
  qty                 INTEGER NOT NULL CHECK (qty > 0),
  availability_before TEXT NOT NULL,
  created_at          TEXT NOT NULL,
  PRIMARY KEY (order_id, slug)
);
CREATE INDEX inventory_reservations_slug ON inventory_reservations (slug, created_at);

CREATE TRIGGER inventory_reservation_validate
BEFORE INSERT ON inventory_reservations
BEGIN
  -- D1's remote statement splitter can mistake an unparenthesized CASE ... END
  -- for this trigger's END. Keep the CASE expression parenthesized.
  SELECT (CASE WHEN NOT EXISTS (
    SELECT 1 FROM catalogue_overrides
     WHERE slug = NEW.slug
       AND availability IN ('in_stock', 'unknown')
       AND stock_count IS NOT NULL
       AND stock_count >= NEW.qty
  ) THEN RAISE(ABORT, 'stock_unavailable') END);
END;

CREATE TRIGGER inventory_reservation_decrement
AFTER INSERT ON inventory_reservations
BEGIN
  UPDATE catalogue_overrides
     SET stock_count = stock_count - NEW.qty,
         availability = CASE WHEN stock_count - NEW.qty = 0 THEN 'out_of_stock' ELSE availability END,
         updated_by = 'order:' || NEW.order_id,
         updated_at = NEW.created_at
   WHERE slug = NEW.slug;
END;

CREATE TRIGGER inventory_reservation_release
AFTER DELETE ON inventory_reservations
BEGIN
  UPDATE catalogue_overrides
     SET stock_count = CASE
           WHEN updated_by LIKE 'order:%' OR updated_by LIKE 'release:%' THEN stock_count + OLD.qty
           ELSE stock_count
         END,
         availability = CASE
           WHEN (updated_by LIKE 'order:%' OR updated_by LIKE 'release:%') AND availability = 'out_of_stock'
             THEN OLD.availability_before
           ELSE availability
         END,
         updated_by = CASE
           WHEN updated_by LIKE 'order:%' OR updated_by LIKE 'release:%' THEN 'release:' || OLD.order_id
           ELSE updated_by
         END,
         updated_at = CASE
           WHEN updated_by LIKE 'order:%' OR updated_by LIKE 'release:%' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           ELSE updated_at
         END
   WHERE slug = OLD.slug;
END;

CREATE TRIGGER inventory_release_cancelled_order
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'cancelled' AND OLD.status != 'cancelled'
BEGIN
  DELETE FROM inventory_reservations WHERE order_id = NEW.id;
END;
