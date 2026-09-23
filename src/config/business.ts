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

  /** TODO: confirm with the business before publishing a return window. */
  returnWindowDays: null as number | null,

  /** TODO: confirm before publishing delivery timelines. */
  deliveryDaysMin: null as number | null,
  deliveryDaysMax: null as number | null,

  /** TODO: fill in from the GST registration. */
  gstin: "",

  /** Shown on the policy pages so a customer can see how current they are. */
  policiesUpdated: "September 2026",

  /** TODO: fill from the showroom's confirmed public hours. */
  hours: [] as { days: string; time: string }[],
} as const;
