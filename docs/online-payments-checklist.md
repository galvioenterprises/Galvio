# Online payments: deliberately deferred

Phase 1 is Cash on Delivery only. Keep `business.onlinePayments` disabled
and leave Cashfree secrets unset until this checklist has been completed and
tested in the gateway sandbox.

- Reconcile ambiguous create-payment timeouts by querying the provider before
  changing an order to failed. A network error does not prove that the gateway
  failed to create or collect the payment.
- Expire abandoned `pending_payment` orders on a scheduled job, then release
  their counted inventory and coupon reservation exactly once.
- Test webhook and browser-return races, including a payment arriving after a
  customer cancellation. A paid order must never be overwritten as failed.
- Confirm gateway idempotency, webhook signature verification, refund
  operations, settlement reconciliation and support procedures.
- Add only the production gateway domains required by the selected browser SDK
  to the Content Security Policy.
- Complete sandbox end-to-end tests before setting Cashfree secrets or enabling
  the storefront payment controls.
