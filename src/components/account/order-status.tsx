import type { Order, OrderStatus, PaymentStatus } from "@/lib/api";
import { getProductImageManifestEntry } from "@/lib/product-images";
import { ProductImage } from "../product-image";
import { BoxIcon, CheckIcon } from "../icons";

const TONE: Record<OrderStatus, string> = {
  pending_payment: "bg-scarcity text-scarcity-text",
  placed: "bg-blue-50 text-blue-700",
  confirmed: "bg-blue-50 text-blue-700",
  packed: "bg-indigo-50 text-indigo-700",
  shipped: "bg-violet-50 text-violet-700",
  out_for_delivery: "bg-amber-50 text-amber-800",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-canvas text-text-muted",
};

export function StatusPill({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${TONE[status]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  cod_due: "Pay on delivery",
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

/** One line under the status: what is happening now. */
export const STATUS_DESCRIPTION: Record<OrderStatus, string> = {
  pending_payment: "We're waiting for your payment to complete.",
  placed: "Your order is placed. We’ll call you to confirm stock, the final price and the delivery date.",
  confirmed: "Your order is confirmed and is being prepared for dispatch.",
  packed: "Your order is packed and will be handed to the courier shortly.",
  shipped: "Your order is on its way.",
  out_for_delivery: "Your order will reach you today. Please keep your phone reachable.",
  delivered: "Your order has been delivered.",
  cancelled: "This order was cancelled.",
};

/** "What happens next?" on the tracking page. */
export const NEXT_STEP: Partial<Record<OrderStatus, string>> = {
  placed: "We'll call you on your mobile number to confirm stock and agree a delivery date. Nothing is dispatched before that call.",
  confirmed: "Your order will be packed and prepared for dispatch. We'll update you when it ships.",
  packed: "Your order will be handed to the courier. We'll share the courier name and tracking details when available.",
  shipped: "The courier will deliver to your address. For large appliances, they usually call before arriving.",
  out_for_delivery: "Please keep your phone reachable and check the product for damage before you accept it.",
  delivered: "If your order needs installation, the manufacturer's service team will contact you to arrange it.",
};

export const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "placed", label: "Order Placed" },
  { status: "confirmed", label: "Order Confirmed" },
  { status: "packed", label: "Packed" },
  { status: "shipped", label: "Shipped" },
  { status: "out_for_delivery", label: "Out for Delivery" },
  { status: "delivered", label: "Delivered" },
];

export function formatDate(iso: string, withTime = false) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Six-step progress. Steps the distributor skipped (a local delivery can go
 * straight from confirmed to out for delivery) still show as done, just
 * without a date.
 */
export function OrderTimeline({ order, compact = false }: { order: Order; compact?: boolean }) {
  if (order.status === "cancelled" || order.status === "pending_payment") return null;
  const reached = STEPS.findIndex((s) => s.status === order.status);
  const when = (status: OrderStatus) => order.events.findLast((e) => e.status === status)?.at;

  return (
    <ol className="grid grid-cols-1 gap-0 sm:grid-cols-6">
      {STEPS.map((step, i) => {
        const done = i < reached || order.status === "delivered";
        const current = i === reached && order.status !== "delivered";
        const at = when(step.status);
        return (
          <li key={step.status} className="relative flex gap-3 pb-5 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[0.9375rem] top-8 h-[calc(100%-2rem)] w-0.5 sm:left-[calc(50%+1.25rem)] sm:top-[0.9375rem] sm:h-0.5 sm:w-[calc(100%-2.5rem)] ${
                  i < reached ? "bg-emerald-500" : "bg-line"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? "bg-emerald-500 text-white"
                  : current
                    ? "bg-accent text-white ring-4 ring-accent/15"
                    : "bg-line text-text-muted"
              }`}
            >
              {done ? <CheckIcon className="size-4" /> : i + 1}
            </span>
            <span className="block sm:mt-2.5">
              <span className={`block text-[0.8125rem] font-semibold ${done || current ? "" : "text-text-muted"}`}>{step.label}</span>
              <span className="block font-mono text-[0.6875rem] text-text-muted">
                {at ? formatDate(at, true) : done ? "" : "Pending"}
              </span>
              {current && !compact && (
                <span className="mt-1.5 inline-block rounded-md bg-accent/10 px-2 py-1 text-[0.6875rem] text-accent">
                  In progress
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * An order line's photo. Orders outlive catalogue changes, so an image that
 * has since been removed shows a neutral box instead of breaking the page.
 */
export function OrderThumb({ src, className = "size-20" }: { src: string; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-canvas p-2 [&>picture]:contents ${className}`}>
      {getProductImageManifestEntry(src) ? (
        <ProductImage src={src} alt="" sizes="96px" className="max-h-full w-auto object-contain" />
      ) : (
        <BoxIcon className="size-6 text-text-faint" />
      )}
    </span>
  );
}
