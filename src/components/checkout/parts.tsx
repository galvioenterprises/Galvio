import type { ReactNode } from "react";
import Link from "next/link";
import { business } from "@/config/business";
import { site } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { BadgeIcon, CheckIcon, CreditCardIcon, HeadsetIcon, ShieldCheckIcon, TruckIcon } from "../icons";

const STEPS = business.onlinePayments
  ? (["Cart", "Checkout", "Payment", "Confirmation"] as const)
  : (["Cart", "Details", "Review", "Order placed"] as const);

/** The payment step becomes a COD order review while online payments are off. */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="mx-auto flex max-w-xl items-start" aria-label="Checkout progress">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute left-[calc(-50%+1.25rem)] right-[calc(50%+1.25rem)] top-3.5 h-0.5 ${step <= current ? "bg-accent" : "bg-line"}`}
              />
            )}
            <span
              aria-current={active ? "step" : undefined}
              className={`relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                done || active ? "bg-accent text-white" : "bg-text-faint text-white"
              }`}
            >
              {done ? <CheckIcon className="size-3.5" /> : step}
            </span>
            <span className={`mt-2 text-xs ${active ? "font-semibold text-text" : done ? "text-text" : "text-text-muted"}`}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Card({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export type Totals = {
  itemCount: number;
  mrpTotal: number;
  subtotal: number;
  couponCode?: string;
  couponDiscount?: number;
  addonTotal?: number;
  deliveryFee: number;
  total: number;
};

/** Subtotal at MRP, then the savings, then what is actually paid. */
export function TotalsList({ totals, totalLabel = "Total" }: { totals: Totals; totalLabel?: string }) {
  const discount = totals.mrpTotal - totals.subtotal;
  return (
    <div>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-muted">
            Subtotal ({totals.itemCount} item{totals.itemCount === 1 ? "" : "s"})
          </dt>
          <dd>{formatPrice(totals.mrpTotal)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <dt className="text-offer">Discount</dt>
            <dd className="text-offer">− {formatPrice(discount)}</dd>
          </div>
        )}
        {!!totals.couponDiscount && (
          <div className="flex justify-between">
            <dt className="text-emerald-700">Coupon ({totals.couponCode})</dt>
            <dd className="text-emerald-700">− {formatPrice(totals.couponDiscount)}</dd>
          </div>
        )}
        {!!totals.addonTotal && (
          <div className="flex justify-between">
            <dt className="text-text-muted">Protection plans</dt>
            <dd>+ {formatPrice(totals.addonTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-text-muted">Delivery</dt>
          <dd className={totals.deliveryFee ? "" : "font-semibold text-emerald-700"}>
            {totals.deliveryFee ? formatPrice(totals.deliveryFee) : "FREE"}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
        <div>
          <p className="text-lg font-semibold">{totalLabel}</p>
          <p className="text-xs text-text-muted">Inclusive of all taxes</p>
        </div>
        <p className="text-[1.625rem] font-semibold tracking-[-0.02em]">{formatPrice(totals.total)}</p>
      </div>
      {discount + (totals.couponDiscount ?? 0) > 0 && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          You save {formatPrice(discount + (totals.couponDiscount ?? 0))} on this order
        </p>
      )}
    </div>
  );
}

/** The three reassurances under the pay button. Only claims the business has confirmed. */
export function TrustTiles() {
  const tiles = business.onlinePayments
    ? [
        { Icon: ShieldCheckIcon, title: "Secure Payments", body: "Processed by Cashfree" },
        { Icon: BadgeIcon, title: "Genuine Products", body: "Via an authorised distributor" },
        business.cashOnDelivery
          ? { Icon: CreditCardIcon, title: "Cash on Delivery", body: "On eligible orders" }
          : { Icon: TruckIcon, title: "Pan-India Delivery", body: "Distributor shipped" },
      ]
    : [
        { Icon: ShieldCheckIcon, title: "Confirmation First", body: "By phone before dispatch" },
        { Icon: BadgeIcon, title: "Genuine Products", body: "Via an authorised distributor" },
        { Icon: TruckIcon, title: "Cash on Delivery", body: "Pay when delivered" },
      ];
  return (
    <ul className="grid grid-cols-3 divide-x divide-accent/10 rounded-xl bg-accent/5 text-center">
      {tiles.map(({ Icon, title, body }) => (
        <li key={title} className="px-2 py-3.5">
          <Icon className="mx-auto size-5 text-text" />
          <p className="mt-1.5 text-xs font-semibold leading-tight">{title}</p>
          <p className="mt-0.5 text-[0.6875rem] leading-tight text-text-muted">{body}</p>
        </li>
      ))}
    </ul>
  );
}

export function NeedHelp({ subject }: { subject?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
      <HeadsetIcon className="size-6 shrink-0 text-text-muted" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Need help?</p>
        <p className="text-xs text-text-muted">
          {site.contact.phone ? `Call ${site.contact.phone}` : "Our support team is here for you."}
        </p>
      </div>
      <Link
        href={subject ? `/contact/?subject=${encodeURIComponent(subject)}` : "/contact/"}
        className="shrink-0 rounded-lg border border-accent px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/5"
      >
        Contact Us
      </Link>
    </div>
  );
}

export function SpecChips({ chips }: { chips: string[] }) {
  if (chips.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <li key={c} className="rounded-md border border-line bg-canvas px-2 py-1 font-mono text-[0.625rem] font-medium uppercase tracking-wide text-text">
          {c}
        </li>
      ))}
    </ul>
  );
}
