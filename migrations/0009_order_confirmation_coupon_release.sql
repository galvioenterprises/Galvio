-- A placed order is only a promise to call. It must be explicitly confirmed
-- before fulfilment can begin, even if a caller bypasses the admin UI.
CREATE TRIGGER order_requires_confirmation_before_fulfilment
BEFORE UPDATE OF status ON orders
WHEN OLD.status = 'placed'
 AND NEW.status IN ('packed', 'shipped', 'out_for_delivery', 'delivered')
BEGIN
  SELECT RAISE(ABORT, 'order_confirmation_required');
END;

-- Cancelled orders no longer consume limited campaign capacity. The existing
-- coupon_redemption_decrement trigger updates used_count in the same transaction.
-- Payment status is deliberately untouched so a paid cancellation still follows
-- the existing refund workflow.
CREATE TRIGGER coupon_redemption_release_cancelled_order
AFTER UPDATE OF status ON orders
WHEN NEW.status = 'cancelled' AND OLD.status != 'cancelled'
BEGIN
  DELETE FROM coupon_redemptions WHERE order_id = NEW.id;
END;
