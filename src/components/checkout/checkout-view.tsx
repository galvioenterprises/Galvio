"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, refreshSession, useSession, type Address, type Quote } from "@/lib/api";
import type { CartProduct } from "@/lib/cart-products";
import { useRuntimeProductRecord } from "@/components/runtime-catalogue";
import { business } from "@/config/business";
import { formatPrice } from "@/lib/format";
import { trackCommerceEvent } from "@/lib/analytics";
import { readCheckout, useCheckoutState, writeCheckout } from "@/lib/checkout-state";
import { CouponControl, QtyStepper, localTotals, totalsFromQuote, useCartRows, useCouponQuote, type CartRow } from "../cart-lines";
import { AddressForm } from "../account/address-form";
import { Field, Spinner, inputClass } from "../account/form";
import { GuestForm, SignInForm } from "../account/sign-in-form";
import { ProductImage } from "../product-image";
import { ArrowRightIcon, InfoIcon, LockIcon, TruckIcon, WrenchIcon } from "../icons";
import { Card, CheckoutSteps, NeedHelp, SpecChips, TotalsList, TrustTiles } from "./parts";

export function CheckoutView({ products }: { products: Record<string, CartProduct> }) {
  const session = useSession();
  const router = useRouter();
  const runtimeProducts = useRuntimeProductRecord(products);
  const { cart, rows: allRows } = useCartRows(runtimeProducts);
  const rows = allRows.filter((r) => r.line.selected && r.product.orderable);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signedIn = session.status === "signed-in";
  const user = signedIn ? session.user : null;
  const accountEmail = user && isUsableEmail(user.email) ? user.email : "";
  const { contactEmail = "" } = useCheckoutState();

  // Pre-fill contact details and load saved addresses once signed in.
  useEffect(() => {
    if (!user) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time pre-fill from the session */
    setName((n) => n || user.name);
    setPhone((p) => p || user.phone);
    /* eslint-enable react-hooks/set-state-in-effect */
    api<{ addresses: Address[] }>("/addresses").then((d) => {
      setAddresses(d.addresses);
      const remembered = readCheckout().addressId;
      const pick = d.addresses.find((a) => a.id === remembered) ?? d.addresses.find((a) => a.isDefault) ?? d.addresses[0];
      setAddressId(pick?.id ?? null);
      if (d.addresses.length === 0) setEditing("new");
    });
  }, [user]);

  if (session.status === "loading") {
    return <div className="flex justify-center py-24 text-text-muted"><Spinner /></div>;
  }

  if (allRows.length > 0 && rows.length === 0) {
    return <EmptyNotice text="No items are selected in your cart." />;
  }
  if (rows.length === 0) return <EmptyNotice text="Your cart is empty." />;

  const selected = addresses?.find((a) => a.id === addressId) ?? null;
  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const canContinue = signedIn && name.trim().length > 0 && phoneValid && selected !== null && !editing;

  async function continueToReview() {
    if (!canContinue || !selected) return;
    setBusy(true);
    setError(null);
    try {
      await api("/me", { method: "PUT", body: { name: name.trim(), phone } });
      await refreshSession();
      writeCheckout({ addressId: selected.id });
      trackCommerceEvent("add_shipping_info", {
        currency: "INR",
        value: localTotals(rows, business.deliveryFee).total,
        item_count: rows.reduce((sum, row) => sum + row.line.qty, 0),
      });
      router.push("/checkout/payment/");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const hasInstallable = rows.some((r) => r.product.categorySlug === "air-conditioners");

  return (
    <div>
      <CheckoutSteps current={2} />
      <h1 className="mt-10 text-[2.25rem] font-semibold leading-none tracking-[-0.03em]">Checkout</h1>
      <p className="mt-2 text-sm text-text-muted">Complete your details, then review your Cash on Delivery order.</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <Card title="1. Contact Information">
            {!signedIn ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 sm:p-5">
                  <p className="mb-1 text-sm font-semibold">Continue as a guest</p>
                  <p className="mb-4 text-xs text-text-muted">No account or verification code needed. You can create an account after placing your order.</p>
                  <GuestForm />
                </div>
                <details className="rounded-xl border border-line bg-surface p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-accent">Already have an account? Sign in</summary>
                  <p className="mb-4 mt-2 text-xs text-text-muted">Use your saved addresses and track orders across devices.</p>
                  <div className="max-w-sm">
                    <SignInForm compact />
                  </div>
                </details>
              </div>
            ) : (
              <>
                <p className="-mt-3 mb-4 text-xs text-text-muted">We&rsquo;ll use these details for order updates.</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Full Name *">
                    <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Mobile Number *" error={phone && !phoneValid ? "Enter a 10-digit mobile number." : null}>
                    <div className="flex">
                      <span className="flex h-11 items-center rounded-l-lg border border-r-0 border-line-strong bg-canvas px-2.5 text-sm text-text-muted">+91</span>
                      <input
                        required
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        className={`${inputClass} rounded-l-none`}
                      />
                    </div>
                  </Field>
                  <Field label={accountEmail ? "Email Address" : "Email (optional)"}>
                    {accountEmail ? (
                      <input value={accountEmail} readOnly className={`${inputClass} bg-canvas text-text-muted`} />
                    ) : (
                      <input
                        type="email"
                        autoComplete="email"
                        value={contactEmail}
                        onChange={(e) => writeCheckout({ contactEmail: e.target.value })}
                        placeholder="For order updates"
                        className={inputClass}
                      />
                    )}
                  </Field>
                </div>
              </>
            )}
          </Card>

          <Card
            title="2. Delivery Address"
            action={
              signedIn && addresses && addresses.length > 0 && !editing ? (
                <button type="button" onClick={() => setEditing("new")} className="text-sm font-semibold text-accent hover:underline">
                  + Add New Address
                </button>
              ) : null
            }
            className={signedIn ? "" : "opacity-60"}
          >
            {!signedIn ? (
              <p className="text-sm text-text-muted">Continue as a guest or sign in above to add a delivery address.</p>
            ) : !addresses ? (
              <Spinner />
            ) : editing ? (
              <AddressForm
                initial={editing === "new" ? undefined : editing}
                defaults={{ name, phone }}
                submitLabel="Save and deliver here"
                onSaved={(list, id) => {
                  setAddresses(list);
                  setAddressId(id);
                  setEditing(null);
                  // First-time buyers type their name and number once.
                  const saved = list.find((x) => x.id === id);
                  if (saved) {
                    setName((n) => n || saved.name);
                    setPhone((p) => p || saved.phone);
                  }
                }}
                onCancel={addresses.length ? () => setEditing(null) : undefined}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map((a) => {
                  const active = a.id === addressId;
                  return (
                    <label
                      key={a.id}
                      className={`relative cursor-pointer rounded-xl border p-4 transition-colors ${
                        active ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-line hover:border-line-strong"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="address"
                          checked={active}
                          onChange={() => setAddressId(a.id)}
                          className="size-4 accent-accent"
                        />
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${active ? "border-accent/30 bg-surface text-accent" : "border-line"}`}>
                          {a.label}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditing(a);
                          }}
                          className="ml-auto text-xs font-semibold text-accent hover:underline"
                        >
                          Edit
                        </button>
                      </span>
                      <span className="mt-3 block text-sm font-semibold">{a.name}</span>
                      <span className="mt-1 block text-[0.8125rem] leading-relaxed text-text-muted">
                        {a.line1}
                        {a.line2 && `, ${a.line2}`}
                        {a.landmark && `, near ${a.landmark}`}
                        <br />
                        {a.city}, {a.state} - {a.pincode}
                        <br />
                        Mobile: +91 {a.phone}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="3. Delivery Information">
            <div className={`grid overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60 ${hasInstallable ? "sm:grid-cols-2" : ""}`}>
              <div className="flex gap-3 p-4">
                <TruckIcon className="size-5 shrink-0 text-emerald-700" />
                <div className="text-sm">
                  <p className="font-semibold text-emerald-700">{business.deliveryFee ? `Delivery ${formatPrice(business.deliveryFee)}` : "FREE Delivery"}</p>
                  {business.deliveryDaysMin && business.deliveryDaysMax ? (
                    <p className="mt-1">
                      Delivery:{" "}
                      <strong>
                        {business.deliveryDaysMin}–{business.deliveryDaysMax} days after distributor confirmation
                      </strong>
                    </p>
                  ) : null}
                  {selected && <p className="mt-1 text-text-muted">Delivery to {selected.pincode}</p>}
                  <p className="mt-2 flex gap-1.5 text-xs text-text-muted">
                    <InfoIcon className="mt-px size-3.5 shrink-0" />
                    We call you to confirm stock and the delivery date before dispatch.
                  </p>
                </div>
              </div>
              {hasInstallable && (
                <div className="flex gap-3 border-t border-emerald-200 p-4 sm:border-l sm:border-t-0">
                  <WrenchIcon className="size-5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold">Installation Available</p>
                    <p className="mt-1 text-text-muted">Installation is arranged through Voltas&rsquo;s authorised service network.</p>
                    <Link href="/policies/delivery/" className="mt-1 inline-block text-xs font-medium text-accent underline">
                      Know more
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="4. Your Order">
            <ul className="divide-y divide-line">
              {rows.map((r) => (
                <OrderLine key={r.line.slug} row={r} onQty={(q) => cart.setQty(r.line.slug, q)} />
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[5.5rem]">
          <SummaryCard rows={rows} coupon={cart.coupon} setCoupon={cart.setCoupon}>
            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={continueToReview}
              disabled={!canContinue || busy}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-text-muted"
            >
              {busy ? "Saving…" : "Review COD Order"} <ArrowRightIcon className="size-4" />
            </button>
            {!canContinue && signedIn && (
              <p className="mt-2 text-center text-xs text-text-muted">
                {!name.trim() || !phoneValid ? "Add your name and mobile number." : "Choose a delivery address."}
              </p>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium">
              <LockIcon className="size-3.5" /> No online payment now
            </p>
            <p className="text-center text-xs text-text-muted">Pay only when the confirmed order is delivered.</p>
          </SummaryCard>
          <TrustTiles />
          <NeedHelp />
        </aside>
      </div>
    </div>
  );
}

function isUsableEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? "";
  return email.length > 0 && !email.endsWith(".invalid") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function EmptyNotice({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-6 py-20 text-center">
      <p className="text-lg font-semibold">{text}</p>
      <Link href="/cart/" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
        Back to cart <ArrowRightIcon className="size-4" />
      </Link>
    </div>
  );
}

export function OrderLine({ row, onQty }: { row: CartRow; onQty?: (qty: number) => void }) {
  const { line, product } = row;
  const off = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;
  return (
    <li className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
      <span className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-canvas p-2 [&>picture]:contents">
        <ProductImage src={product.image} alt="" sizes="96px" className="max-h-full w-auto object-contain" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="eyebrow text-text-muted">{product.brand}</p>
        <p className="mt-0.5 font-semibold leading-snug">{product.title}</p>
        {product.variant && <p className="text-xs text-text-muted">{product.variant}</p>}
        <SpecChips chips={product.chips} />
        {onQty && product.plan && <PlanOffer slug={line.slug} plan={product.plan} qty={line.qty} />}
      </div>
      {onQty ? (
        <QtyStepper
          qty={line.qty}
          max={Math.min(10, product.stockCount ?? 10)}
          title={product.title}
          onChange={onQty}
          onRemove={() => onQty(0)}
        />
      ) : (
        <p className="text-sm text-text-muted">Qty: {line.qty}</p>
      )}
      <div className="text-right">
        <p className="text-lg font-semibold">{formatPrice(product.price * line.qty)}</p>
        {off > 0 && (
          <>
            <p className="text-xs text-text-muted line-through">{formatPrice(product.mrp * line.qty)}</p>
            <span className="mt-1 inline-block rounded-md bg-scarcity px-1.5 py-0.5 text-[0.6875rem] font-semibold text-offer">{off}% OFF</span>
          </>
        )}
      </div>
    </li>
  );
}

/** Order summary with any already-applied promotion; shared by checkout and review. */
export function SummaryCard({
  rows,
  coupon,
  setCoupon,
  quoteState,
  totalLabel,
  children,
}: {
  rows: CartRow[];
  coupon: string;
  setCoupon: (c: string) => void;
  quoteState?: { quote: Quote | null; error: string | null; pending: boolean };
  totalLabel?: string;
  children?: React.ReactNode;
}) {
  const { plans = [] } = useCheckoutState();
  const localQuoteState = useCouponQuote(rows, quoteState === undefined ? coupon : "", plans);
  const { quote, error, pending } = quoteState ?? localQuoteState;
  const base = localTotals(rows, business.deliveryFee, plans);
  const totals = totalsFromQuote(base, quote);
  const itemCount = rows.reduce((n, r) => n + r.line.qty, 0);

  return (
    <Card title="Order Summary" action={<span className="text-xs text-text-muted">{itemCount} item{itemCount === 1 ? "" : "s"}</span>}>
      <ul className="-mt-1 space-y-3 border-b border-line pb-4">
        {rows.map(({ line, product }) => (
          <li key={line.slug} className="flex gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-canvas p-1 [&>picture]:contents">
              <ProductImage src={product.image} alt="" sizes="56px" className="max-h-full w-auto object-contain" />
            </span>
            <div className="min-w-0 flex-1 text-xs">
              <p className="eyebrow text-[0.5625rem] text-text-muted">{product.brand}</p>
              <p className="line-clamp-2 font-semibold">{product.title}</p>
              <p className="mt-0.5 text-text-muted">Qty: {line.qty}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{formatPrice(product.price * line.qty)}</p>
              {product.mrp > product.price && <p className="text-xs text-text-muted line-through">{formatPrice(product.mrp * line.qty)}</p>}
            </div>
          </li>
        ))}
      </ul>

      <div className="pt-4">
        <TotalsList totals={totals} totalLabel={totalLabel} />
      </div>
      {children}
      <CouponControl coupon={coupon} setCoupon={setCoupon} quote={quote} error={error} pending={pending} />
    </Card>
  );
}


function PlanOffer({ slug, qty, plan }: { slug: string; qty: number; plan: { title: string; price: number; summary: string } }) {
  const { plans = [] } = useCheckoutState();
  const on = plans.includes(slug);
  return (
    <label className={`mt-3 flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${on ? "border-accent bg-accent/5" : "border-dashed border-line-strong"}`}>
      <input
        type="checkbox"
        checked={on}
        onChange={() => writeCheckout({ plans: on ? plans.filter((s) => s !== slug) : [...plans, slug] })}
        className="mt-0.5 size-4 accent-accent"
      />
      <span>
        <span className="font-semibold">
          Add {plan.title} · {formatPrice(plan.price)}
          {qty > 1 ? ` × ${qty}` : ""}
        </span>
        <span className="block text-xs text-text-muted">{plan.summary}</span>
      </span>
    </label>
  );
}
