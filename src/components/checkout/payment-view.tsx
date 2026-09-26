"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, startPayment, useSession, type PaymentChoice, type PaymentHandoff, type StoreConfig } from "@/lib/api";
import type { CartProduct } from "@/lib/cart-products";
import { useRuntimeProductRecord } from "@/components/runtime-catalogue";
import { business } from "@/config/business";
import { formatPrice } from "@/lib/format";
import { trackCommerceEvent } from "@/lib/analytics";
import { cartEnquiryLink } from "@/lib/whatsapp";
import { readCheckout, useCheckoutState, writeCheckout } from "@/lib/checkout-state";
import { emiFrom, emiPlans } from "@/lib/emi";
import { localTotals, totalsFromQuote, useCartRows, useCouponQuote } from "../cart-lines";
import { Spinner } from "../account/form";
import { ArrowRightIcon, BankIcon, ChevronLeftIcon, CreditCardIcon, InfoIcon, LockIcon, TruckIcon, UpiIcon, WalletIcon } from "../icons";
import { Card, CheckoutSteps, NeedHelp, TrustTiles } from "./parts";
import { SummaryCard } from "./checkout-view";

const METHODS: {
  id: PaymentChoice;
  Icon: typeof UpiIcon;
  title: string;
  body: string;
  chips: string[];
  detail: string;
}[] = [
  {
    id: "upi",
    Icon: UpiIcon,
    title: "UPI",
    body: "Pay instantly using your preferred UPI app.",
    chips: ["Google Pay", "PhonePe", "Paytm", "BHIM"],
    detail: "On the next screen, scan the QR code or pick your UPI app. On a phone, your UPI app opens directly.",
  },
  {
    id: "card",
    Icon: CreditCardIcon,
    title: "Credit / Debit Card",
    body: "Pay using Visa, Mastercard, RuPay or other cards.",
    chips: ["Visa", "Mastercard", "RuPay"],
    detail: "Card details are entered on Cashfree's secure page. We never see or store your card number.",
  },
  {
    id: "emi",
    Icon: CreditCardIcon,
    title: "EMI",
    body: "Pay in monthly instalments with your card or a cardless EMI provider.",
    chips: ["Credit card", "Debit card", "Cardless"],
    detail: "",
  },
  {
    id: "netbanking",
    Icon: BankIcon,
    title: "Net Banking",
    body: "Pay securely through your bank.",
    chips: ["SBI", "HDFC Bank", "ICICI Bank"],
    detail: "Choose your bank on the next screen and sign in to your bank to approve the payment.",
  },
  {
    id: "wallet",
    Icon: WalletIcon,
    title: "Wallets",
    body: "Use your preferred wallet to pay.",
    chips: ["Paytm", "Amazon Pay", "MobiKwik"],
    detail: "Choose your wallet on the next screen.",
  },
];

const ORDER_IDEMPOTENCY_STORAGE_KEY = "galvio:checkout:order-idempotency";

function getOrderIdempotencyKey() {
  const existing = window.sessionStorage.getItem(ORDER_IDEMPOTENCY_STORAGE_KEY);
  if (existing) return existing;
  const key = window.crypto.randomUUID();
  window.sessionStorage.setItem(ORDER_IDEMPOTENCY_STORAGE_KEY, key);
  return key;
}

function clearOrderIdempotencyKey() {
  window.sessionStorage.removeItem(ORDER_IDEMPOTENCY_STORAGE_KEY);
}

export function PaymentView({ products }: { products: Record<string, CartProduct> }) {
  const session = useSession();
  const router = useRouter();
  const runtimeProducts = useRuntimeProductRecord(products);
  const { cart, rows: allRows } = useCartRows(runtimeProducts);
  const rows = allRows.filter((r) => r.line.selected && r.product.orderable);
  const checkout = useCheckoutState();
  // The review screen always waits for one authoritative Worker quote, even
  // without a coupon, so the displayed total is the total that will be placed.
  const quoteState = useCouponQuote(rows, cart.coupon, checkout.plans ?? [], true);
  const totals = totalsFromQuote(
    localTotals(rows, business.deliveryFee, checkout.plans ?? []),
    quoteState.quote,
  );
  const total = totals.total;
  const quoteNotReady = quoteState.pending || Boolean(quoteState.error) || !quoteState.quote;

  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [method, setMethod] = useState<PaymentChoice>(business.onlinePayments ? "upi" : "cod");
  const [state, setState] = useState<"idle" | "processing">("idle");
  const [error, setError] = useState<string | null>(null);
  const [addressId, setAddressId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
    setAddressId(readCheckout().addressId ?? "");
    api<StoreConfig>("/config")
      .then((c) => {
        setConfig(c);
        if (!business.onlinePayments || !c.onlinePayments) setMethod("cod");
      })
      .catch(() => setConfig({ cashOnDelivery: business.cashOnDelivery, codLimit: business.codLimit, deliveryFee: business.deliveryFee, onlinePayments: false, paymentMode: "production" }));
  }, []);

  // Without a signed-in customer and a chosen address, this step makes no
  // sense; send them back to finish it.
  useEffect(() => {
    if (session.status === "signed-out" || addressId === "") router.replace("/checkout/");
  }, [session.status, addressId, router]);

  if (session.status !== "signed-in" || !addressId || !config) {
    return <div className="flex justify-center py-24 text-text-muted"><Spinner /></div>;
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface px-6 py-20 text-center">
        <p className="text-lg font-semibold">Your cart is empty.</p>
        <Link href="/products/" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">Browse products</Link>
      </div>
    );
  }

  const codAllowed = config.cashOnDelivery && total <= config.codLimit;
  const cod = method === "cod";
  const onlinePaymentsEnabled = business.onlinePayments && config.onlinePayments;
  const assistedOrderHref = cartEnquiryLink(
    rows.map((row) => ({ title: row.product.title, qty: row.line.qty })),
    total,
  );

  async function pay() {
    setState("processing");
    setError(null);
    try {
      // Keep this key across network failures so retrying cannot create a
      // second order. A fresh key is generated only after creation succeeds.
      const idempotencyKey = getOrderIdempotencyKey();
      const data = await api<{ id: string; next: "complete" | "pay"; payment?: PaymentHandoff }>("/orders", {
        body: {
          items: rows.map((r) => ({
            slug: r.line.slug,
            qty: r.line.qty,
            plan: Boolean(r.product.plan && (checkout.plans ?? []).includes(r.line.slug)),
          })),
          addressId,
          coupon: cart.coupon,
          email: checkout.contactEmail?.trim() || undefined,
          paymentMethod: method,
          idempotencyKey,
        },
      });
      clearOrderIdempotencyKey();
      writeCheckout({ ordered: rows.map((r) => r.line.slug) });
      if (method === "cod") {
        trackCommerceEvent("place_cod_request", {
          currency: "INR",
          value: total,
          item_count: rows.reduce((sum, row) => sum + row.line.qty, 0),
        });
      }
      if (data.next === "complete") {
        router.push(`/checkout/complete/?order=${data.id}`);
      } else if (data.payment) {
        await startPayment(data.id, data.payment);
      }
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }

  return (
    <div>
      <CheckoutSteps current={3} />
      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2.25rem] font-semibold leading-none tracking-[-0.03em]">
            {onlinePaymentsEnabled ? "Payment" : "Review Your COD Order"}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {onlinePaymentsEnabled
              ? "Choose your preferred payment method to complete your order."
              : "Check the total before placing your order. No payment is collected now; we’ll call to confirm stock and delivery."}
          </p>
        </div>
        <Link href="/checkout/" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
          <ChevronLeftIcon className="size-4" /> Back to details
        </Link>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card title={onlinePaymentsEnabled ? "1. Choose Payment Method" : "Cash on Delivery"}>
          {onlinePaymentsEnabled ? (
            <div role="radiogroup" aria-label="Payment method" className="space-y-3">
              {METHODS.map((m) => (
                <MethodRow
                  key={m.id}
                  selected={method === m.id}
                  disabled={m.id === "emi" && total < business.emi.minOrder}
                  onSelect={() => setMethod(m.id)}
                  Icon={m.Icon}
                  title={m.title}
                  body={m.id === "emi" && total >= business.emi.minOrder ? `From ${formatPrice(emiFrom(total) ?? 0)}/month. ${m.body}` : m.body}
                  chips={m.chips}
                >
                  {m.id === "emi" ? (
                    <>
                      {emiPlans(total).map((p) => `${p.months} months × ${formatPrice(p.monthly)}`).join(" · ")}
                      <br />
                      Indicative at {business.emi.indicativeAnnualRate}% a year. You pick your bank and tenure on the next screen, where
                      no-cost EMI is shown if your bank offers it. Your bank sets the final terms.
                    </>
                  ) : (
                    m.detail
                  )}
                </MethodRow>
              ))}
              {config.cashOnDelivery && (
                <MethodRow
                  selected={cod}
                  disabled={!codAllowed}
                  onSelect={() => setMethod("cod")}
                  Icon={TruckIcon}
                  title="Cash on Delivery"
                  body="Pay when your order is delivered."
                  badge="Available for eligible orders"
                >
                  Pay in cash when the confirmed order is delivered. We call you to confirm stock and delivery details before dispatch.
                </MethodRow>
              )}
              {config.paymentMode === "simulated" && (
                <p className="rounded-lg bg-scarcity px-3 py-2 text-xs text-scarcity-text">
                  Development mode: no real payment is taken. You&rsquo;ll choose success or failure on the next screen.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 rounded-xl border border-accent/25 bg-accent/5 p-5">
                <TruckIcon className="size-6 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold">Pay when your confirmed order is delivered</p>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">
                    Placing this order does not collect a payment. We will call you to confirm stock and delivery details before dispatch.
                  </p>
                </div>
              </div>
              <ol className="grid gap-3 text-sm sm:grid-cols-3" aria-label="What happens after you place this order">
                {[
                  ["1", "Order placed", "We receive your selected items and delivery details."],
                  ["2", "Confirmation call", "We confirm stock and delivery details with you."],
                  ["3", "Pay on delivery", "Pay in cash when the confirmed order is delivered."],
                ].map(([number, title, body]) => (
                  <li key={number} className="rounded-xl border border-line p-4">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">{number}</span>
                    <p className="mt-3 font-semibold">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">{body}</p>
                  </li>
                ))}
              </ol>
              {!codAllowed && config.cashOnDelivery && (
                <p className="flex gap-1.5 rounded-lg bg-scarcity px-3 py-2 text-xs text-scarcity-text" role="status">
                  <InfoIcon className="mt-px size-3.5 shrink-0" />
                  Online Cash on Delivery checkout is available up to {formatPrice(config.codLimit)}.
                  Contact us to arrange this order.
                </p>
              )}
              {!config.cashOnDelivery && (
                <p className="flex gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
                  <InfoIcon className="mt-px size-3.5 shrink-0" />
                  Cash on Delivery is currently unavailable. Please contact us before placing this order.
                </p>
              )}
            </div>
          )}
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-[5.5rem]">
          <SummaryCard
            rows={rows}
            coupon={cart.coupon}
            setCoupon={cart.setCoupon}
            quoteState={quoteState}
            totalLabel={cod ? "Pay on Delivery" : "Total Amount"}
          >
            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
            {quoteState.error && !cart.coupon && (
              <p role="alert" className="mt-4 text-sm text-red-600">{quoteState.error}</p>
            )}
            {cod && !codAllowed && config.cashOnDelivery && !onlinePaymentsEnabled ? (
              <a
                href={assistedOrderHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackCommerceEvent("whatsapp_click", { context: "cod_limit_checkout", value: total })}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Contact to order · {formatPrice(total)} <ArrowRightIcon className="size-4" />
              </a>
            ) : (
              <button
                type="button"
                onClick={pay}
                disabled={state === "processing" || quoteNotReady || (cod && !codAllowed)}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {state === "processing" ? (
                  <>
                    <Spinner className="size-4" /> {cod ? "Placing order…" : "Processing Payment…"}
                  </>
                ) : quoteState.pending ? (
                  <>
                    <Spinner className="size-4" /> Checking total…
                  </>
                ) : cod ? (
                  <>
                    Place COD Order · {formatPrice(total)} <ArrowRightIcon className="size-4" />
                  </>
                ) : (
                  <>
                    Pay {formatPrice(total)} <ArrowRightIcon className="size-4" />
                  </>
                )}
              </button>
            )}
            {state === "processing" && !cod && (
              <p className="mt-2 text-center text-xs text-text-muted">Please don&rsquo;t close this window while your payment is being processed.</p>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium">
              <LockIcon className="size-3.5" /> {cod && !codAllowed ? "Stock and delivery confirmed directly" : cod ? "No payment collected now" : "Secure Payment"}
            </p>
            <p className="text-center text-xs text-text-muted">
              {cod ? "Stock and delivery details are confirmed before dispatch." : "Your payment information is encrypted and securely processed."}
            </p>
          </SummaryCard>
          <TrustTiles />
          <NeedHelp />
        </aside>
      </div>
    </div>
  );
}

function MethodRow({
  selected,
  disabled,
  onSelect,
  Icon,
  title,
  body,
  chips,
  badge,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  Icon: typeof UpiIcon;
  title: string;
  body: string;
  chips?: string[];
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border transition-colors ${
        selected ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <label className={`flex items-center gap-4 p-4 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <input
          type="radio"
          name="payment-method"
          checked={selected}
          disabled={disabled}
          onChange={onSelect}
          className="size-4 accent-accent"
        />
        <Icon className="size-6 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-xs text-text-muted">{body}</span>
        </span>
        {chips && (
          <span className="hidden flex-wrap justify-end gap-1.5 md:flex">
            {chips.map((c) => (
              <span key={c} className="rounded-md border border-line bg-surface px-2 py-1 text-[0.625rem] font-semibold">
                {c}
              </span>
            ))}
          </span>
        )}
        {badge && (
          <span className="hidden rounded-full bg-scarcity px-2.5 py-1 text-[0.6875rem] font-medium text-scarcity-text sm:inline">
            {badge}
          </span>
        )}
      </label>
      {selected && <p className="-mt-1 px-4 pb-4 pl-[4.5rem] text-xs leading-relaxed text-text-muted">{children}</p>}
    </div>
  );
}
