"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, useSession, type Order } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Card, NeedHelp, TotalsList } from "../checkout/parts";
import {
  BadgeIcon,
  ChevronRightIcon,
  CopyIcon,
  CreditCardIcon,
  InfoIcon,
  PackageIcon,
  PinIcon,
  ShieldCheckIcon,
  TruckIcon,
  WrenchIcon,
} from "../icons";
import { Spinner } from "./form";
import { ExchangeNote, ItemTitle } from "./order-extras";
import { NEXT_STEP, OrderThumb, OrderTimeline, PAYMENT_LABEL, STATUS_DESCRIPTION } from "./order-status";
import { SignInForm } from "./sign-in-form";

export function OrderDetail() {
  const id = useSearchParams().get("id") ?? "";
  const session = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(() => {
    api<{ order: Order }>(`/orders/${encodeURIComponent(id)}`)
      .then((d) => setOrder(d.order))
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (session.status === "signed-in" && id) load();
  }, [session.status, id, load]);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const d = await api<{ order: Order }>(`/orders/${id}/cancel`, { body: {} });
      setOrder(d.order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (session.status === "loading") return <Centered><Spinner /></Centered>;
  if (session.status === "signed-out") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8">
        <h1 className="mb-6 text-xl font-semibold">Sign in to track this order</h1>
        <SignInForm />
      </div>
    );
  }
  if (error && !order) {
    return (
      <Centered>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/account/" className="mt-4 text-sm text-accent hover:underline">Back to My Orders</Link>
      </Centered>
    );
  }
  if (!order) return <Centered><Spinner /></Centered>;

  const itemCount = order.items.reduce((n, i) => n + i.qty, 0);
  const a = order.address;
  const cancelled = order.status === "cancelled";
  const canCancel = order.status === "placed" || order.status === "confirmed";

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-xs text-text-muted">
        <Link href="/" className="hover:text-text">Home</Link> / <Link href="/account/" className="hover:text-text">My Orders</Link> /{" "}
        <span className="text-text">Track Order</span>
      </nav>
      <h1 className="mt-3 text-[2rem] font-semibold tracking-[-0.02em]">Track Your Order</h1>
      <p className="mt-1 text-sm text-text-muted">Stay updated on your order journey. We&rsquo;ll keep you informed at every step.</p>
      <p className="mt-2 flex items-center gap-2 text-sm">
        Order ID: <span className="font-mono font-semibold">{order.id}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(order.id);
            setCopied(true);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent"
        >
          <CopyIcon className="size-3.5" /> {copied ? "Copied" : "Copy"}
        </button>
      </p>

      <section className={`mt-6 grid gap-6 rounded-2xl border p-6 md:grid-cols-[1fr_auto] ${cancelled ? "border-line bg-surface" : "border-accent/15 bg-accent/5"}`}>
        <div className="flex items-center gap-5">
          <span className={`flex size-16 shrink-0 items-center justify-center rounded-full ${cancelled ? "bg-canvas text-text-muted" : "bg-accent/10 text-accent"}`}>
            <PackageIcon className="size-7" />
          </span>
          <div>
            <span className="eyebrow rounded-full bg-surface px-2.5 py-1 text-[0.625rem] text-accent">Current status</span>
            <p className={`mt-2 text-[1.75rem] font-semibold tracking-[-0.02em] ${cancelled ? "text-text-muted" : "text-accent"}`}>{order.statusLabel}</p>
            <p className="text-sm text-text-muted">{STATUS_DESCRIPTION[order.status]}</p>
          </div>
        </div>
        <div className="space-y-3 border-line text-sm md:border-l md:pl-6">
          <p className="flex items-start gap-2.5">
            <TruckIcon className="mt-0.5 size-4 shrink-0 text-text-muted" />
            <span>
              <span className="block text-xs text-text-muted">Delivery</span>
              <span className="font-semibold">
                {order.status === "delivered"
                  ? "Delivered"
                  : order.status === "placed"
                    ? "To be confirmed on our call"
                    : order.status === "cancelled"
                      ? "Not applicable — order cancelled"
                      : "Confirmed on our call"}
              </span>
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <PinIcon className="mt-0.5 size-4 shrink-0 text-text-muted" />
            <span>
              <span className="block text-xs text-text-muted">Delivering to</span>
              <span className="font-semibold">{a.city}, {a.state} - {a.pincode}</span>
            </span>
          </p>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          {!cancelled && (
            <Card title="Order Timeline">
              <OrderTimeline order={order} />
              {NEXT_STEP[order.status] && (
                <div className="mt-6 flex gap-4 rounded-xl border border-accent/15 bg-accent/5 p-4 text-sm">
                  <InfoIcon className="mt-0.5 size-5 shrink-0 text-accent" />
                  <p>
                    <strong className="mr-2">What happens next?</strong>
                    <span className="text-text-muted">{NEXT_STEP[order.status]}</span>
                  </p>
                </div>
              )}
            </Card>
          )}

          <Card
            title="Order Details"
            action={
              <Link href={`/product/${order.items[0]?.slug}/`} className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                View Product Details <ChevronRightIcon className="size-4" />
              </Link>
            }
          >
            <ul className="divide-y divide-line">
              {order.items.map((item) => {
                const off = item.mrp && item.mrp > item.unitPrice ? Math.round(((item.mrp - item.unitPrice) / item.mrp) * 100) : 0;
                return (
                  <li key={item.slug} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <OrderThumb src={item.image} />
                    <div className="min-w-0 flex-1">
                      <ItemTitle slug={item.slug} title={item.title} className="font-semibold" />
                      <p className="mt-1 text-xs text-text-muted">Qty: {item.qty}</p>
                      {order.status === "delivered" && !item.slug.startsWith("plan:") && (
                        <Link href={`/product/${item.slug}/#reviews`} className="mt-1 inline-block text-xs font-semibold text-accent hover:underline">
                          ★ Rate &amp; review
                        </Link>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatPrice(item.unitPrice * item.qty)}</p>
                      {off > 0 && (
                        <p className="text-xs">
                          <s className="text-text-muted">{formatPrice(item.mrp! * item.qty)}</s>{" "}
                          <span className="rounded bg-scarcity px-1 font-semibold text-offer">{off}% OFF</span>
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <ExchangeNote order={order} />

          <Card title="Delivery Information">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex gap-3 text-sm">
                <PinIcon className="size-5 shrink-0 text-text-muted" />
                <div>
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
              <div className="flex gap-3 text-sm">
                <CreditCardIcon className="size-5 shrink-0 text-text-muted" />
                <div>
                  <p className="text-xs text-text-muted">Payment</p>
                  <p className="font-semibold">{order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMode || "Paid online"}</p>
                  <p className="mt-1 text-text-muted">{PAYMENT_LABEL[order.paymentStatus]}</p>
                  {order.paymentRef && <p className="mt-1 font-mono text-xs text-text-muted">Txn {order.paymentRef}</p>}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[5.5rem]">
          <Card title={<span className="flex items-center gap-2"><TruckIcon className="size-5" /> Shipment Tracking</span>}>
            {order.courier || order.trackingNumber ? (
              <dl className="space-y-2 text-sm">
                {order.courier && (
                  <div className="flex justify-between"><dt className="text-text-muted">Courier</dt><dd className="font-medium">{order.courier}</dd></div>
                )}
                {order.trackingNumber && (
                  <div className="flex justify-between"><dt className="text-text-muted">Tracking no.</dt><dd className="font-mono">{order.trackingNumber}</dd></div>
                )}
              </dl>
            ) : (
              <p className="rounded-xl bg-canvas p-4 text-sm">
                <strong className="block">Tracking information will appear once your order is shipped.</strong>
                <span className="text-text-muted">We&rsquo;ll share an update when your order is on the way.</span>
              </p>
            )}
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
              totalLabel={order.paymentStatus === "paid" ? "Total Paid" : "Total"}
            />
            {canCancel &&
              (confirming ? (
                <div className="mt-4 rounded-xl bg-canvas p-3 text-center text-sm">
                  <p>Cancel order {order.id}?</p>
                  <div className="mt-2 flex justify-center gap-4">
                    <button type="button" disabled={busy} onClick={cancel} className="font-semibold text-red-600">
                      {busy ? "Cancelling…" : "Yes, cancel"}
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="text-text-muted">
                      Keep order
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="mt-4 w-full text-sm text-text-muted hover:text-red-600">
                  Cancel this order
                </button>
              ))}
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
          </Card>

          <NeedHelp subject={`Order ${order.id}`} />

          <Card title={<span className="flex items-center gap-2"><ShieldCheckIcon className="size-5 text-emerald-600" /> Shop with Confidence</span>}>
            <ul className="grid grid-cols-2 gap-4 text-xs">
              {[
                { Icon: BadgeIcon, t: "Genuine Products", b: "Via an authorised distributor" },
                { Icon: ShieldCheckIcon, t: "Cash on Delivery", b: "Pay after the order is confirmed" },
                { Icon: WrenchIcon, t: "Manufacturer Warranty", b: "Voltas service network" },
                { Icon: TruckIcon, t: "Pan-India Delivery", b: "Distributor shipped" },
              ].map(({ Icon, t, b }) => (
                <li key={t} className="flex gap-2">
                  <Icon className="size-4 shrink-0 text-text-muted" />
                  <span><span className="block font-semibold">{t}</span><span className="text-text-muted">{b}</span></span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-24 text-text-muted">{children}</div>;
}
