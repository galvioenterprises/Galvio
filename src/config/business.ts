/**
 * Business facts that appear in more than one place.
 *
 * Kept here so a policy page, the About page and the structured data can
 * never disagree with each other. Everything marked TODO is a real number
 * the business has to decide before launch — the pages read fine with the
 * UI must hide unconfirmed values rather than render placeholders as facts.
 */
export const business = {
  /** TODO: confirm. Hidden until supplied by the business. */
  foundedYear: null as number | null,

  /** The brand this distributorship is built around. */
  primaryBrand: "Voltas",

  /** Confirmed operating model for the current launch. */
  nationwideDelivery: true,
  cashOnDelivery: true,

  /**
   * Phase 1 is Cash on Delivery only. Keep the Cashfree implementation in
   * place, but gate every customer-facing payment path behind this flag until
   * production credentials, reconciliation and refunds have been signed off.
   */
  onlinePayments: false,

  /** Largest order total accepted on Cash on Delivery, in rupees. A refused
   *  doorstep delivery of a large appliance costs freight both ways. */
  codLimit: 50000,

  /** Flat delivery charge per order, in rupees. 0 shows as "Free". */
  deliveryFee: 0,

  /**
   * Card and cardless EMI through Cashfree. "EMI from" shows the smallest
   * instalment at the longest tenure and this indicative annual rate; the
   * customer's bank sets the final terms, and the page says so.
   */
  emi: {
    minOrder: 3000,
    tenures: [3, 6, 9, 12] as const,
    indicativeAnnualRate: 16,
  },

  /**
   * Air-conditioner installation. What standard installation covers is
   * Voltas's own definition. TODO(business): set `standardCharge` once
   * confirmed for orders placed through us — 0 shows "Free"; null shows
   * "confirmed on our call".
   */
  installation: {
    standardCharge: null as number | null,
    includes: [
      "Mounting the indoor and outdoor units",
      "One wall hole up to 10 inches through standard brick",
      "Connecting the copper pipes, cable and drain pipe supplied with the AC",
      "Gas check and a demo of the remote and features",
    ],
    extras: [
      "Extra copper pipe beyond the supplied length (per metre)",
      "Outdoor unit stand or wall bracket",
      "Core cutting through concrete, or a second wall hole",
      "Drain pipe extension",
      "Dismantling and moving an old AC",
    ],
  },

  /**
   * No returns or refunds once delivered. A damaged, defective or wrong
   * product can be exchanged if reported within this many days of
   * delivery, subject to the conditions on /policies/returns/.
   */
  exchangeWindowDays: 7,

  /** Days from order confirmation to delivery. */
  deliveryDaysMin: 2 as number | null,
  deliveryDaysMax: 3 as number | null,

  /** TODO: fill in from the GST registration. */
  gstin: "",

  /** Shown on the policy pages so a customer can see how current they are. */
  policiesUpdated: "September 2026",

  /** TODO: fill from the showroom's confirmed public hours. */
  hours: [] as { days: string; time: string }[],
} as const;
