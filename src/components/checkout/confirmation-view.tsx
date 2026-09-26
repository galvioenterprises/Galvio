"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, startPayment, useSession, type Order, type PaymentHandoff } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { readCheckout, writeCheckout } from "@/lib/checkout-state";
import { business } from "@/config/business";
import { formatPrice } from "@/lib/format";
import { trackCommerceEvent } from "@/lib/analytics";
import { ExchangeNote, ItemTitle } from "../account/order-extras";
import { Spinner } from "../account/form";
import { OrderThumb, OrderTimeline, formatDate } from "../account/order-status";
import { AlertIcon, ArrowRightIcon, CheckIcon, ClockIcon, CopyIcon, PinIcon, TruckIcon } from "../icons";
import { Card, CheckoutSteps, NeedHelp, TotalsList } from "./parts";

type Phase = "loading" | "waiting" | "failed" | "expired" | "done" | "error";

export function ConfirmationView() {
  const id = useSearchParams().get("order") ?? "";
  const session = useSession();
  const router = useRouter();
  const { removeOrdered } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const polls = useRef(0);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api<{ order: Order; expired: boolean }>(`/orders/${encodeURIComponent(id)}`);
      setOrder(data.order);
      if (data.order.status !== "pending_payment") {
        setPhase("done");
        // Only now is the order real: take exactly those items out of the cart.
        const ordered = readCheckout().ordered;
        if (ordered?.length) {
          removeOrdered(ordered);
          writeCheckout({ ordered: [] });
        }
      } else if (data.expired) {
        setPhase("expired");
      } else if (data.order.paymentStatus === "failed") {
        setPhase("failed");
      } else if (polls.current < 5) {
        // Just back from the gateway: the result can lag by a few seconds.
        polls.current += 1;
        setPhase("waiting");
        setAttempt((n) => n + 1);
      } else {
        setPhase("failed");
      }
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }, [id, removeOrdered]);

  useEffect(() => {
    // State is set only after the fetch resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session.status === "signed-in" && id) void load();
  }, [session.status, id, load]);

  // Poll again a little later while the gateway result is still pending.
  useEffect(() => {
    if (attempt === 0) return;
    const timer = window.setTimeout(() => void load(), 2000);
    return () => window.clearTimeout(timer);
  }, [attempt, load]);

  useEffect(() => {
    if (!order || phase !== "done" || order.paymentMethod !== "cod") return;
    const key = `galvio:analytics:cod-request:${order.id}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    trackCommerceEvent("cod_request_received", {
      currency: "INR",
      value: order.total,
      item_count: order.items.reduce((sum, item) => sum + item.qty, 0),
    });
  }, [order, phase]);

  async function act(path: "/pay" | "/cod") {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ payment?: PaymentHandoff }>(`/orders/${id}${path}`, { body: {} });
      if (path === "/pay" && data.payment) await startPayment(id, data.payment);
      else {
        polls.current = 0;
        await load();
      }
    } catch (e) {
      setError((e as Error).message);
      if ((e as { status?: number }).status === 410) setPhase("expired");
    } finally {
      setBusy(false);
    }
  }

  if (session.status === "signed-out") {
    return (
      <StateCard tone="neutral" Icon={AlertIcon} title="Please sign in">
        <p>Sign in to see this order.</p>
        <Link href="/account/" className="mt-5 inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white">Sign in</Link>
      </StateCard>
    );
  }

  if (phase === "loading" || phase === "waiting") {
    return (
      <StateCard tone="accent" Icon={null} title={business.onlinePayments ? "Processing Payment…" : "Loading your order…"}>
        <p>{business.onlinePayments ? "Please don’t close this window while your payment is being confirmed." : "Please wait while we retrieve your COD order."}</p>
      </StateCard>
    );
  }

  if (phase === "error" || !order) {
    return (
      <StateCard tone="red" Icon={AlertIcon} title="We couldn't load this order">
        <p>{error}</p>
        <Link href="/account/" className="mt-5 inline-block text-sm font-semibold text-accent">Go to My Orders</Link>
      </StateCard>
    );
  }

  const codOk = business.cashOnDelivery && order.total <= business.codLimit;

  if (phase === "failed") {
    return (
      <StateCard tone="red" Icon={AlertIcon} title="Payment could not be completed">
        <p>Your payment was not completed and no money was taken. Please try again or choose another payment method.</p>
        {error && <p className="mt-3 text-red-600">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" disabled={busy} onClick={() => act("/pay")} className="h-11 rounded-xl bg-accent px-6 text-sm font-semibold text-white disabled:opacity-60">
            Try Again
          </button>
          {codOk ? (
            <button type="button" disabled={busy} onClick={() => act("/cod")} className="h-11 rounded-xl border border-line-strong px-6 text-sm font-semibold disabled:opacity-60">
              Pay on Delivery instead
            </button>
          ) : (
            <button type="button" onClick={() => router.push("/checkout/payment/")} className="h-11 rounded-xl border border-line-strong px-6 text-sm font-semibold">
              Change Method
            </button>
          )}
        </div>
      </StateCard>
    );
  }

  if (phase === "expired") {
    return (
      <StateCard tone="amber" Icon={ClockIcon} title="Payment session expired">
        <p>Your payment session has expired. Your cart is saved, so you can return to payment and try again.</p>
        <button type="button" onClick={() => router.push("/checkout/payment/")} className="mt-6 h-11 rounded-xl bg-accent px-8 text-sm font-semibold text-white">
          Return to Payment
        </button>
      </StateCard>
    );
  }

  if (order.status === "cancelled") {
    const cancellationMessage =
      order.paymentStatus === "refunded"
        ? "This order was cancelled and its payment is marked as refunded."
        : order.paymentStatus === "paid"
          ? "This order was cancelled. Open the order details to follow its refund status."
          : "This order was cancelled. No payment is due.";
    return (
      <StateCard tone="neutral" Icon={AlertIcon} title="Order Cancelled">
        <p>{cancellationMessage}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/account/order/?id=${order.id}`} className="inline-flex h-11 items-center rounded-xl bg-accent px-6 font-semibold text-white">
            View Order Details
          </Link>
          <Link href="/products/" className="inline-flex h-11 items-center rounded-xl border border-line-strong px-6 font-semibold text-text">
            Continue Shopping
          </Link>
        </div>
      </StateCard>
    );
  }

  return <Confirmation order={order} />;
}

function StateCard({
  tone,
  Icon,
  title,
  children,
}: {
  tone: "accent" | "red" | "amber" | "neutral";
  Icon: typeof AlertIcon | null;
  title: string;
  children: React.ReactNode;
}) {
  const ring = { accent: "bg-accent/10 text-accent", red: "bg-red-50 text-red-600", amber: "bg-scarcity text-scarcity-text", neutral: "bg-canvas text-text-muted" }[tone];
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-line bg-surface p-8 text-center sm:p-10">
      <span className={`mx-auto flex size-14 items-center justify-center rounded-full ${ring}`}>
        {Icon ? <Icon className="size-7" /> : <Spinner className="size-7" />}
      </span>
      <h1 className="mt-5 text-xl font-semibold">{title}</h1>
      <div className="mt-2 text-sm leading-relaxed text-text-muted">{children}</div>
    </div>
  );
}

function Confirmation({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false);
  const paid = order.paymentStatus === "paid";
  const codRequest = order.paymentMethod === "cod";
  const awaitingConfirmation = codRequest && order.status === "placed";
  const email = isUsableEmail(order.email) ? order.email.trim() : "";
  const itemCount = order.items.reduce((n, i) => n + i.qty, 0);
  const a = order.address;

  return (
    <div>
      <CheckoutSteps current={4} />
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-10 text-center">
            <Confetti />
            <span className="relative mx-auto flex size-16 animate-[pop_500ms_cubic-bezier(.2,1.4,.4,1)_both] items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <CheckIcon className="size-8" />
            </span>
            <h1 className="relative mt-6 text-[1.75rem] font-semibold tracking-[-0.02em] sm:text-[2rem]">
              {awaitingConfirmation ? "Order placed" : paid ? "Payment Received" : order.statusLabel}
            </h1>
            <p className="relative mt-2 font-semibold">
              {awaitingConfirmation ? "Confirmation pending — we’ll call you next." : "Thank you for shopping with GALVIO."}
            </p>
            <p className="relative mt-1 text-sm text-text-muted">
              {awaitingConfirmation
                ? `We’ll call you on +91 ${order.phone} to confirm stock and delivery details before dispatch.`
                : `Updates will be shared on +91 ${order.phone}.`}
            </p>
            {awaitingConfirmation && (
              <ol className="relative mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-3" aria-label="What happens next">
                {[
                  ["1", "Order placed", "Your selected items and delivery details are with our team."],
                  ["2", "Confirmation call", "We confirm stock and delivery details with you."],
                  ["3", "Dispatch and delivery", "After confirmation, the order is dispatched and you pay on delivery."],
                ].map(([number, title, body]) => (
                  <li key={number} className="rounded-xl border border-emerald-200 bg-surface/90 p-4">
                    <span className="flex size-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">{number}</span>
                    <p className="mt-3 text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">{body}</p>
                  </li>
                ))}
              </ol>
            )}
            <div className="relative mx-auto mt-6 flex w-fit items-center overflow-hidden rounded-xl border border-line bg-surface">
              <span className="px-4 py-3 text-sm text-text-muted">Order ID</span>
              <span className="py-3 pr-4 font-mono text-sm font-semibold text-accent">{order.id}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(order.id);
                  setCopied(true);
                }}
                className="flex items-center gap-1.5 border-l border-line px-4 py-3 text-sm font-semibold text-accent hover:bg-accent/5"
              >
                <CopyIcon className="size-4" /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="relative mt-4 text-xs text-text-muted">
              {email ? `Order updates will be sent to ${email}.` : `Confirmation updates will use your mobile number, +91 ${order.phone}.`}
            </p>
          </section>

          <Card title="Order Details">
            <ul className="divide-y divide-line">
              {order.items.map((item) => {
                const off = item.mrp && item.mrp > item.unitPrice ? Math.round(((item.mrp - item.unitPrice) / item.mrp) * 100) : 0;
                return (
                  <li key={item.slug} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <OrderThumb src={item.image} className="size-24" />
                    <div className="min-w-0 flex-1">
                      <ItemTitle slug={item.slug} title={item.title} className="font-semibold" />
                      <p className="mt-1 text-xs text-text-muted">Qty: {item.qty}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatPrice(item.unitPrice * item.qty)}</p>
                      {off > 0 && (
                        <>
                          <p className="text-xs text-text-muted line-through">{formatPrice(item.mrp! * item.qty)}</p>
                          <span className="mt-1 inline-block rounded-md bg-scarcity px-1.5 py-0.5 text-[0.6875rem] font-semibold text-offer">{off}% OFF</span>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Delivery Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3 rounded-xl border border-line p-4">
                <PinIcon className="size-5 shrink-0 text-text-muted" />
                <div className="text-sm">
                  <p className="text-xs text-text-muted">Delivering to</p>
                  <p className="font-semibold">{a.name}</p>
                  <p className="mt-1 leading-relaxed text-text-muted">
                    {a.line1}
                    {a.line2 && `, ${a.line2}`}
                    <br />
                    {a.city}, {a.state} - {a.pincode}
                    <br />
                    Mobile: +91 {a.phone}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl border border-line p-4">
                <TruckIcon className="size-5 shrink-0 text-text-muted" />
                <div className="text-sm">
                  <p className="text-xs text-text-muted">Delivery date</p>
                  <p className="font-semibold">{awaitingConfirmation ? "To be confirmed on our call" : "Confirmed on our call"}</p>
                  {!order.deliveryFee && <span className="mt-2 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">FREE Delivery</span>}
                  <p className="mt-2 text-xs text-text-muted">
                    {email ? `Updates will be sent to ${email}.` : `Updates will be shared on +91 ${order.phone}.`}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <ExchangeNote order={order} />

          {awaitingConfirmation ? (
            <Card title="Confirmation Status">
              <p className="flex items-start gap-3 rounded-xl bg-accent/5 p-4 text-sm">
                <CheckIcon className="mt-0.5 size-5 shrink-0 text-accent" />
                <span>
                  <strong className="block">Order placed — confirmation pending</strong>
                  <span className="text-text-muted">We’ll call to confirm stock, the final price and delivery details before dispatch.</span>
                </span>
              </p>
            </Card>
          ) : (
            <Card title="Order Status">
              <OrderTimeline order={order} compact />
            </Card>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[5.5rem]">
          <Card title="Payment Information">
            <p className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${paid ? "bg-emerald-50 text-emerald-700" : "bg-accent/5 text-accent"}`}>
              <CheckIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="block">{paid ? "Payment Successful" : "Cash on Delivery"}</strong>
                <span className="text-xs">
                  {paid ? "Your payment has been received." : `Pay ${formatPrice(order.total)} when your order arrives.`}
                </span>
              </span>
            </p>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Payment Method">{order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMode || "Online"}</Row>
              <Row label={paid ? "Amount Paid" : "Amount Payable"}>{formatPrice(order.total)}</Row>
              {order.paymentRef && <Row label="Transaction ID"><span className="font-mono text-xs">{order.paymentRef}</span></Row>}
              <Row label={paid ? "Payment Date" : "Order Date"}>{formatDate(order.paidAt || order.createdAt, true)}</Row>
            </dl>
          </Card>

          <Card title="Order Summary">
            <TotalsList
              totals={{
                itemCount,
                mrpTotal: order.mrpTotal,
                subtotal: order.subtotal,
                couponCode: order.couponCode,
                couponDiscount: order.couponDiscount,
                deliveryFee: order.deliveryFee,
                total: order.total,
              }}
              totalLabel={paid ? "Total Paid" : "Total Payable"}
            />
            <Link
              href={`/account/order/?id=${order.id}`}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Track Order <ArrowRightIcon className="size-4" />
            </Link>
            <Link
              href="/products/"
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-accent text-sm font-semibold text-accent hover:bg-accent/5"
            >
              Continue Shopping
            </Link>
          </Card>
          <NeedHelp subject={`Order ${order.id}`} />
        </aside>
      </div>
    </div>
  );
}

function isUsableEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";
  return email.length > 0 && !email.endsWith(".invalid") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

/** A short burst of dots behind the tick. CSS only; skipped under reduced motion. */
function Confetti() {
  const dots = [
    { x: -150, y: -60, c: "bg-emerald-400" },
    { x: 140, y: -70, c: "bg-accent" },
    { x: -110, y: 30, c: "bg-offer" },
    { x: 120, y: 20, c: "bg-emerald-500" },
    { x: -60, y: -90, c: "bg-star" },
    { x: 70, y: -95, c: "bg-offer" },
    { x: -190, y: -10, c: "bg-accent" },
    { x: 185, y: -25, c: "bg-star" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-[4.5rem] motion-reduce:hidden">
      {dots.map((d, i) => (
        <span
          key={i}
          className={`absolute size-2 rounded-full ${d.c} animate-[burst_900ms_ease-out_both]`}
          style={{ "--x": `${d.x}px`, "--y": `${d.y}px`, animationDelay: `${120 + i * 30}ms` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
