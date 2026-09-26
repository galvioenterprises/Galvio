import type { Product } from "./product-schema";
import { business } from "@/config/business";

/**
 * Products with dealer stock still awaiting confirmation can be added to a
 * COD order. This is deliberately separate from claiming they are in
 * stock: the distributor confirms stock and delivery before dispatch.
 */
export function canAddToCart(
  availability: Product["availability"],
): boolean {
  return availability === "in_stock" || availability === "unknown";
}

/**
 * Phase 1 accepts COD orders only up to the approved limit. Higher-value
 * products remain sellable through an assisted call/WhatsApp handoff instead
 * of leading the customer into a checkout that cannot complete.
 */
export function requiresAssistedOrder(price: number): boolean {
  return business.cashOnDelivery && !business.onlinePayments && price > business.codLimit;
}
