-- Guard runtime availability at the same commit that creates an order,
-- including products whose exact quantity is intentionally not counted.
-- Also distinguish counted reservations so null-count products never mutate
-- inventory when the order is cancelled.

ALTER TABLE inventory_reservations
  ADD COLUMN counted INTEGER NOT NULL DEFAULT 1
  CHECK (counted IN (0, 1));
ALTER TABLE inventory_reservations
  ADD COLUMN override_updated_at TEXT NOT NULL DEFAULT '';

DROP TRIGGER inventory_reservation_validate;
DROP TRIGGER inventory_reservation_decrement;
DROP TRIGGER inventory_reservation_release;
DROP TRIGGER inventory_reservations_invalidate_after_admin_update;
DROP TRIGGER inventory_reservations_invalidate_after_admin_insert;

CREATE TRIGGER inventory_reservation_validate
BEFORE INSERT ON inventory_reservations
BEGIN
  -- D1's remote statement splitter can mistake an unparenthesized CASE ... END
  -- for this trigger's END. Keep the CASE expression parenthesized.
  SELECT (CASE WHEN NOT (
    (
      NEW.override_updated_at = ''
      AND NEW.counted = 0
      AND NOT EXISTS (
        SELECT 1 FROM catalogue_overrides WHERE slug = NEW.slug
      )
    )
    OR EXISTS (
      SELECT 1 FROM catalogue_overrides
       WHERE slug = NEW.slug
         AND updated_at = NEW.override_updated_at
         AND availability IN ('in_stock', 'unknown')
         AND (stock_count IS NULL OR stock_count >= NEW.qty)
         AND (
           (stock_count IS NULL AND NEW.counted = 0)
           OR (stock_count IS NOT NULL AND NEW.counted = 1)
         )
    )
  ) THEN RAISE(ABORT, 'stock_unavailable') END);
END;

CREATE TRIGGER inventory_reservation_decrement
AFTER INSERT ON inventory_reservations
WHEN NEW.counted = 1
BEGIN
  UPDATE catalogue_overrides
     SET stock_count = stock_count - NEW.qty,
         availability = CASE WHEN stock_count - NEW.qty = 0 THEN 'out_of_stock' ELSE availability END,
         updated_by = 'order:' || NEW.order_id,
         updated_at = NEW.created_at
   WHERE slug = NEW.slug;
END;

CREATE TRIGGER inventory_reservations_invalidate_after_admin_update
AFTER UPDATE ON catalogue_overrides
WHEN NEW.updated_by NOT LIKE 'order:%'
 AND NEW.updated_by NOT LIKE 'release:%'
 AND (
   NEW.stock_count IS NOT OLD.stock_count
   OR NEW.availability IS NOT OLD.availability
 )
BEGIN
  UPDATE inventory_reservations
     SET release_allowed = 0
   WHERE slug = NEW.slug;
END;

CREATE TRIGGER inventory_reservations_invalidate_after_admin_insert
AFTER INSERT ON catalogue_overrides
WHEN NEW.updated_by NOT LIKE 'order:%'
 AND NEW.updated_by NOT LIKE 'release:%'
BEGIN
  UPDATE inventory_reservations
     SET release_allowed = 0
   WHERE slug = NEW.slug;
END;

CREATE TRIGGER inventory_reservation_release
AFTER DELETE ON inventory_reservations
WHEN OLD.counted = 1
BEGIN
  UPDATE catalogue_overrides
     SET stock_count = CASE
           WHEN OLD.release_allowed = 1 THEN stock_count + OLD.qty
           ELSE stock_count
         END,
         availability = CASE
           WHEN OLD.release_allowed = 1 AND availability = 'out_of_stock'
             THEN OLD.availability_before
           ELSE availability
         END,
         updated_by = CASE
           WHEN OLD.release_allowed = 1 THEN 'release:' || OLD.order_id
           ELSE updated_by
         END,
         updated_at = CASE
           WHEN OLD.release_allowed = 1 THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           ELSE updated_at
         END
   WHERE slug = OLD.slug;
END;
