-- An admin stock edit is an absolute correction. Reservations created before
-- that edit must not add their units back later, or a subsequent cancellation
-- could push the corrected stock above the distributor's stated quantity.

ALTER TABLE inventory_reservations
  ADD COLUMN release_allowed INTEGER NOT NULL DEFAULT 1
  CHECK (release_allowed IN (0, 1));

DROP TRIGGER inventory_reservation_release;

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
