/**
 * Business facts that appear in more than one place.
 *
 * Kept here so a policy page, the About page and the structured data can
 * never disagree with each other. Everything marked TODO is a real number
 * the business has to decide before launch — the pages read fine with the
 * defaults, but the defaults are conservative guesses, not commitments.
 */
export const business = {
  /** TODO: confirm. Shown on About and in the local listing. */
  foundedYear: 2014,

  /** The brand this distributorship is built around. */
  primaryBrand: "Voltas",

  /** TODO: confirm with the accountant before launch. */
  returnWindowDays: 7,

  /** TODO: confirm. Used on the delivery policy and product pages. */
  deliveryDaysMin: 2,
  deliveryDaysMax: 4,

  /** TODO: fill in from the GST registration. */
  gstin: "",

  /** Shown on the policy pages so a customer can see how current they are. */
  policiesUpdated: "September 2026",

  hours: [
    { days: "Monday – Saturday", time: "10:00 am – 8:00 pm" },
    { days: "Sunday", time: "11:00 am – 6:00 pm" },
  ],
} as const;
