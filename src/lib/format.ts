/** Indian numbering, so 84990 reads as ₹84,990 rather than ₹84,990.00. */
const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return rupees.format(value);
}

const compact = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 2,
});

/**
 * Short prices for the filter chips and slider labels: 20000 becomes
 * "₹20K", 104990 becomes "₹1.05L". Rounding 104990 down to a flat "₹1L"
 * would put the slider's own maximum below the most expensive product.
 */
export function formatPriceShort(value: number): string {
  return `₹${compact.format(value)}`;
}
