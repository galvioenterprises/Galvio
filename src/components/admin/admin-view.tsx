"use client";

import { useCallback, useEffect, useState } from "react";
import { api, signOut, useSession, type Order, type OrderStatus } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Field, Spinner, inputClass, secondaryButtonClass } from "../account/form";
import { SignInForm } from "../account/sign-in-form";
import { OrderThumb, PAYMENT_LABEL, StatusPill, formatDate } from "../account/order-status";
import { SearchIcon } from "../icons";
import { ExchangeNote, ItemTitle } from "../account/order-extras";

type Row = {
  id: string;
  status: OrderStatus;
  statusLabel: string;
  paymentMethod: "cod" | "online";
  paymentStatus: keyof typeof PAYMENT_LABEL;
  total: number;
  phone: string;
  email: string;
  customer: string;
  city: string;
  createdAt: string;
  itemCount: number;
  title: string;
};

type Detail = Order & { adminNote: string };

type Coupon = {
  code: string;
  description: string;
  kind: "percent" | "flat";
  value: number;
  minOrder: number;
  maxDiscount: number;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  expiresAt: string;
};

type InventoryAvailability = "unknown" | "in_stock" | "out_of_stock" | "preorder" | "backorder";
type InventoryValues = {
  availability: InventoryAvailability;
  stockCount: number | null;
  mrp: number | null;
  sellingPrice: number;
};
type InventoryProduct = {
  slug: string;
  sku: string;
  title: string;
  image: string;
  category: string;
  base: InventoryValues;
  effective: InventoryValues;
  overridden: boolean;
  updatedBy: string;
  updatedAt: string;
};

const FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Active" },
  { id: "placed", label: "New" },
  { id: "confirmed", label: "Confirmed" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All incl. unpaid" },
];

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Mark confirmed",
  packed: "Mark packed",
  shipped: "Mark shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

export function AdminView() {
  const session = useSession();
  const [tab, setTab] = useState<"orders" | "inventory" | "coupons" | "reviews">("orders");

  if (session.status === "loading") return <div className="flex justify-center py-24"><Spinner /></div>;
  if (session.status === "signed-out") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8">
        <p className="eyebrow text-accent">Galvio admin</p>
        <h1 className="mb-6 mt-2 text-xl font-semibold">Sign in with your admin email</h1>
        <SignInForm compact emailOnly />
      </div>
    );
  }
  if (!session.isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
        <h1 className="text-xl font-semibold">Not an admin account</h1>
        <p className="mt-2 text-sm text-text-muted">{session.user.email} does not have access to the admin.</p>
        <button type="button" onClick={() => void signOut()} className="mt-5 text-sm font-semibold text-accent">
          Sign in with another email
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-accent">Galvio admin</p>
          <h1 className="mt-1 text-[2rem] font-semibold tracking-[-0.02em]">
            {tab === "orders" ? "Orders" : tab === "inventory" ? "Inventory" : tab === "coupons" ? "Coupons" : "Reviews"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {(["orders", "inventory", "coupons", "reviews"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${tab === t ? "bg-ink text-white" : "bg-surface hover:bg-line"}`}
            >
              {t}
            </button>
          ))}
          <span className="ml-3 hidden text-xs text-text-muted sm:inline">{session.user.email}</span>
        </div>
      </div>
      <div className="mt-6">
        {tab === "orders" ? <Orders /> : tab === "inventory" ? <Inventory /> : tab === "coupons" ? <Coupons /> : <Reviews />}
      </div>
    </div>
  );
}

function Orders() {
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{ orders: Row[]; counts: Record<string, number> } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (query.trim()) params.set("q", query.trim());
    api<{ orders: Row[]; counts: Record<string, number> }>(`/admin/orders?${params}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [filter, query]);

  useEffect(() => {
    const timer = window.setTimeout(load, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  // Deep link from the new-order email: /admin/?order=GLV-…
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("order");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the URL
    if (id) setSelected(id);
  }, []);

  const counts = data?.counts ?? {};

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_30rem]">
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "New orders", n: counts.placed ?? 0, tone: "text-accent" },
            { label: "To dispatch", n: (counts.confirmed ?? 0) + (counts.packed ?? 0), tone: "text-indigo-700" },
            { label: "In transit", n: (counts.shipped ?? 0) + (counts.out_for_delivery ?? 0), tone: "text-violet-700" },
            { label: "Delivered", n: counts.delivered ?? 0, tone: "text-emerald-700" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-xs text-text-muted">{s.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${s.tone}`}>{s.n}</p>
            </div>
          ))}
        </div>

        <label className="relative mt-5 block">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order ID, email or phone"
            aria-label="Search orders"
            className={`${inputClass} pl-10`}
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                filter === f.id ? "border-accent bg-accent text-white" : "border-line-strong bg-surface"
              }`}
            >
              {f.label}
              {f.id && f.id !== "all" && counts[f.id] ? ` (${counts[f.id]})` : ""}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {!data ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : data.orders.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-text-muted">No orders here.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {data.orders.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelected(o.id)}
                  className={`grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3.5 text-left transition-colors hover:bg-canvas sm:grid-cols-[10rem_1fr_auto_auto] sm:items-center ${
                    selected === o.id ? "bg-accent/5" : ""
                  }`}
                >
                  <span>
                    <span className="block font-mono text-xs font-semibold text-accent">{o.id}</span>
                    <span className="text-xs text-text-muted">{formatDate(o.createdAt, true)}</span>
                  </span>
                  <span className="min-w-0 text-sm sm:order-none">
                    <span className="block truncate font-medium">{o.customer} · {o.city}</span>
                    <span className="block truncate text-xs text-text-muted">
                      {o.title}
                      {o.itemCount > 1 && ` + ${o.itemCount - 1} more`}
                    </span>
                  </span>
                  <StatusPill status={o.status} label={o.statusLabel} />
                  <span className="text-right text-sm">
                    <span className="block font-semibold">{formatPrice(o.total)}</span>
                    <span className="text-xs text-text-muted">{o.paymentMethod === "cod" ? "COD" : "Online"} · {PAYMENT_LABEL[o.paymentStatus]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? (
        <OrderPanel id={selected} onClose={() => setSelected(null)} onChange={load} />
      ) : (
        <p className="hidden rounded-2xl border border-dashed border-line-strong p-10 text-center text-sm text-text-muted xl:block">
          Select an order to manage it.
        </p>
      )}
    </div>
  );
}

function OrderPanel({ id, onClose, onChange }: { id: string; onClose: () => void; onChange: () => void }) {
  const [detail, setDetail] = useState<{ order: Detail; nextStatuses: OrderStatus[] } | null>(null);
  const [note, setNote] = useState("");
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = (d: { order: Detail; nextStatuses: OrderStatus[] }) => {
    setDetail(d);
    setCourier(d.order.courier);
    setTracking(d.order.trackingNumber);
    setAdminNote(d.order.adminNote);
  };

  useEffect(() => {
    api<{ order: Detail; nextStatuses: OrderStatus[] }>(`/admin/orders/${id}`)
      .then(apply)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const d = await api<{ order: Detail; nextStatuses: OrderStatus[] }>(`/admin/orders/${id}`, { method: "PATCH", body });
      apply(d);
      setNote("");
      onChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function confirmPatch(body: Record<string, unknown>, action: string) {
    if (window.confirm(`${action}? Order status and payment changes are retained in the audit history and cannot be moved backwards.`)) {
      void patch(body);
    }
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center">
        {error ? <p className="text-sm text-red-600">{error}</p> : <Spinner />}
      </div>
    );
  }
  const o = detail.order;
  const a = o.address;
  const shipping = detail.nextStatuses.includes("shipped") || detail.nextStatuses.includes("out_for_delivery");

  return (
    <aside className="rounded-2xl border border-line bg-surface xl:sticky xl:top-[5.5rem] xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <p className="font-mono text-sm font-semibold">{o.id}</p>
          <p className="text-xs text-text-muted">{formatDate(o.createdAt, true)}</p>
          <div className="mt-2"><StatusPill status={o.status} label={o.statusLabel} /></div>
        </div>
        <button type="button" onClick={onClose} className="text-sm text-text-muted hover:text-text" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="space-y-5 p-5 text-sm">
        {detail.nextStatuses.length > 0 && (
          <section className="rounded-xl bg-canvas p-4">
            <p className="font-semibold">Move order</p>
            {shipping && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Courier">
                  <input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Delhivery" className={inputClass} />
                </Field>
                <Field label="Tracking number">
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputClass} />
                </Field>
              </div>
            )}
            <Field label="Note for the order history (internal)" className="mt-3">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivery on Friday afternoon" className={inputClass} />
            </Field>
            <div className="mt-3 flex flex-wrap gap-2">
              {detail.nextStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    confirmPatch(
                      { status: s, note, courier, trackingNumber: tracking },
                      `${NEXT_LABEL[s] ?? s} for ${o.id}`,
                    )
                  }
                  className={
                    s === "cancelled"
                      ? "h-10 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      : "h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                  }
                >
                  {NEXT_LABEL[s] ?? s}
                </button>
              ))}
            </div>
          </section>
        )}
        {error && <p role="alert" className="text-red-600">{error}</p>}

        <section>
          <p className="font-semibold">Customer</p>
          <p className="mt-1">{a.name}</p>
          <p className="flex flex-wrap gap-3">
            <a href={`tel:+91${o.phone}`} className="text-accent">+91 {o.phone}</a>
            <a href={`https://wa.me/91${o.phone}?text=${encodeURIComponent(`Hi ${a.name}, this is Galvio Enterprises about your order ${o.id}.`)}`} target="_blank" rel="noopener noreferrer" className="text-accent">WhatsApp</a>
            {/* Guest and mobile-only accounts have a placeholder address; hide it. */}
            {o.email && !o.email.endsWith(".invalid") && (
              <a href={`mailto:${o.email}?subject=${encodeURIComponent(`Your order ${o.id}`)}`} className="text-accent">{o.email}</a>
            )}
          </p>
          <p className="mt-2 leading-relaxed text-text-muted">
            {a.line1}
            {a.line2 && `, ${a.line2}`}
            {a.landmark && `, near ${a.landmark}`}
            <br />
            {a.city}, {a.state} - {a.pincode}
          </p>
        </section>

        <section>
          <p className="font-semibold">Items</p>
          <ul className="mt-2 space-y-2">
            {o.items.map((i) => (
              <li key={i.slug} className="flex items-center gap-3">
                <OrderThumb src={i.image} className="size-12" />
                <span className="min-w-0 flex-1">
                  <ItemTitle slug={i.slug} title={i.title} className="line-clamp-2 font-medium" />
                  <span className="text-xs text-text-muted">{i.sku} · Qty {i.qty}</span>
                </span>
                <span className="font-medium">{formatPrice(i.unitPrice * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-line pt-3">
            {o.couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-700"><dt>Coupon {o.couponCode}</dt><dd>− {formatPrice(o.couponDiscount)}</dd></div>
            )}
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatPrice(o.total)}</dd></div>
          </dl>
        </section>

        <ExchangeNote order={o} />

        <section>
          <p className="font-semibold">Payment</p>
          <p className="mt-1">
            {o.paymentMethod === "cod" ? "Cash on Delivery" : `Online${o.paymentMode ? ` (${o.paymentMode})` : ""}`} · {PAYMENT_LABEL[o.paymentStatus]}
          </p>
          {o.paymentRef && <p className="font-mono text-xs text-text-muted">Txn {o.paymentRef}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {o.paymentStatus === "cod_due" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => confirmPatch({ paymentStatus: "paid" }, `Record cash as collected for ${o.id}`)}
                className={secondaryButtonClass}
              >
                Cash collected
              </button>
            )}
            {o.paymentStatus === "paid" && o.status === "cancelled" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => confirmPatch({ paymentStatus: "refunded" }, `Mark ${o.id} as refunded`)}
                className={secondaryButtonClass}
              >
                Mark refunded
              </button>
            )}
          </div>
          {o.paymentStatus === "paid" && o.status === "cancelled" && o.paymentMethod === "online" && (
            <p className="mt-2 text-xs text-scarcity-text">Refund this payment from the Cashfree dashboard, then mark it refunded here.</p>
          )}
        </section>

        <section>
          <p className="font-semibold">Internal note</p>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            rows={3}
            placeholder="Only visible to admins"
            className="mt-2 w-full rounded-lg border border-line-strong p-3 text-sm outline-none focus:border-accent"
          />
          <button type="button" disabled={busy} onClick={() => patch({ adminNote, courier, trackingNumber: tracking })} className="mt-2 text-sm font-semibold text-accent">
            Save note and shipment details
          </button>
        </section>

        <section>
          <p className="font-semibold">History</p>
          <ol className="mt-2 space-y-2 border-l border-line pl-4">
            {o.events.map((e, i) => (
              <li key={i}>
                <p className="font-medium capitalize">{e.status.replace(/_/g, " ")}</p>
                <p className="text-xs text-text-muted">
                  {formatDate(e.at, true)} · {e.actor}
                  {e.note && ` · ${e.note}`}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </aside>
  );
}

const AVAILABILITY_OPTIONS: { value: InventoryAvailability; label: string }[] = [
  { value: "in_stock", label: "In stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "unknown", label: "Confirm before dispatch" },
  { value: "preorder", label: "Pre-order" },
  { value: "backorder", label: "Back-order" },
];

function Inventory() {
  const [products, setProducts] = useState<InventoryProduct[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, InventoryValues>>({});
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const applyProducts = useCallback((next: InventoryProduct[]) => {
    setProducts(next);
    setDrafts(Object.fromEntries(next.map((product) => [product.slug, { ...product.effective }])));
  }, []);

  useEffect(() => {
    api<{ products: InventoryProduct[] }>("/admin/inventory")
      .then((data) => applyProducts(data.products))
      .catch((e: Error) => setError(e.message));
  }, [applyProducts]);

  function replaceProduct(product: InventoryProduct) {
    setProducts((current) => current?.map((item) => (item.slug === product.slug ? product : item)) ?? null);
    setDrafts((current) => ({ ...current, [product.slug]: { ...product.effective } }));
  }

  function update(slug: string, patch: Partial<InventoryValues>) {
    setDrafts((current) => {
      const next = { ...current[slug], ...patch };
      if (patch.availability === "out_of_stock") next.stockCount = 0;
      if (patch.availability === "in_stock" && next.stockCount === 0) next.stockCount = null;
      return { ...current, [slug]: next };
    });
  }

  async function save(product: InventoryProduct) {
    const draft = drafts[product.slug];
    if (!draft) return;
    const priceChanged =
      draft.sellingPrice !== product.effective.sellingPrice || draft.mrp !== product.effective.mrp;
    const stockChanged =
      draft.availability !== product.effective.availability || draft.stockCount !== product.effective.stockCount;
    if (!priceChanged && !stockChanged) return;
    const summary = [
      priceChanged ? `price to ${formatPrice(draft.sellingPrice)}${draft.mrp ? ` (MRP ${formatPrice(draft.mrp)})` : ""}` : "",
      stockChanged
        ? `${AVAILABILITY_OPTIONS.find((option) => option.value === draft.availability)?.label}${draft.stockCount === null ? "" : `, quantity ${draft.stockCount}`}`
        : "",
    ].filter(Boolean).join(" and ");
    if (!window.confirm(`Save ${summary} for ${product.title}? This immediately affects checkout validation.`)) return;

    setBusy(product.slug);
    setError(null);
    setMessage(null);
    try {
      const result = await api<{ product: InventoryProduct }>(`/admin/inventory/${product.slug}`, {
        method: "PATCH",
        body: { ...draft, expectedUpdatedAt: product.updatedAt },
      });
      replaceProduct(result.product);
      setMessage(`${product.title} was updated.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reset(product: InventoryProduct) {
    if (!window.confirm(`Remove the runtime override for ${product.title} and restore its deployed catalogue values?`)) return;
    setBusy(product.slug);
    setError(null);
    setMessage(null);
    try {
      const updatedAt = encodeURIComponent(product.updatedAt);
      const result = await api<{ product: InventoryProduct }>(
        `/admin/inventory/${product.slug}?updatedAt=${updatedAt}`,
        { method: "DELETE" },
      );
      replaceProduct(result.product);
      setMessage(`${product.title} now uses its deployed catalogue values.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const visible = (products ?? []).filter((product) =>
    `${product.title} ${product.sku} ${product.category}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const overrideCount = products?.filter((product) => product.overridden).length ?? 0;
  const outOfStock = products?.filter((product) => product.effective.availability === "out_of_stock").length ?? 0;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Products", value: products?.length ?? "—" },
          { label: "Runtime overrides", value: products ? overrideCount : "—" },
          { label: "Out of stock", value: products ? outOfStock : "—" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-text-muted">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Changes here are stored in the production database. Customer-facing catalogue prices and availability,
        and checkout validation, update within about a minute. Search metadata and JSON-LD update on the next
        deployment. Every change keeps an audit history.
      </div>

      <label className="relative mt-5 block">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search product, SKU or category"
          aria-label="Search inventory"
          className={`${inputClass} pl-10`}
        />
      </label>

      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm text-emerald-700">{message}</p>}
      {!products ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : visible.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-text-muted">No products match that search.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((product) => {
            const draft = drafts[product.slug] ?? product.effective;
            const changed = JSON.stringify(draft) !== JSON.stringify(product.effective);
            return (
              <li key={product.slug} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <OrderThumb src={product.image} className="size-16 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold leading-snug">{product.title}</p>
                        <p className="mt-1 text-xs text-text-muted">{product.sku} · {product.category}</p>
                      </div>
                      {product.overridden && (
                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-accent">
                          Runtime override
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <Field label="Availability">
                        <select
                          value={draft.availability}
                          onChange={(event) => update(product.slug, { availability: event.target.value as InventoryAvailability })}
                          className={inputClass}
                        >
                          {AVAILABILITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Stock quantity" hint="Blank = not counted">
                        <input
                          type="number"
                          min={0}
                          value={draft.stockCount ?? ""}
                          onChange={(event) => update(product.slug, { stockCount: event.target.value === "" ? null : Number(event.target.value) })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Selling price (₹)">
                        <input
                          type="number"
                          min={1}
                          value={draft.sellingPrice}
                          onChange={(event) => update(product.slug, { sellingPrice: Number(event.target.value) || 0 })}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="MRP (₹)" hint="Blank if not supplied">
                        <input
                          type="number"
                          min={1}
                          value={draft.mrp ?? ""}
                          onChange={(event) => update(product.slug, { mrp: event.target.value === "" ? null : Number(event.target.value) })}
                          className={inputClass}
                        />
                      </Field>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-text-muted">
                        {product.updatedAt
                          ? `Last changed ${formatDate(product.updatedAt, true)} by ${product.updatedBy.replace(/^admin:/, "")}`
                          : "Using the deployed catalogue values"}
                      </p>
                      <div className="flex gap-2">
                        {product.overridden && (
                          <button
                            type="button"
                            disabled={busy === product.slug}
                            onClick={() => void reset(product)}
                            className={secondaryButtonClass}
                          >
                            Reset
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!changed || busy === product.slug || draft.sellingPrice <= 0}
                          onClick={() => void save(product)}
                          className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busy === product.slug ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const EMPTY_COUPON = { code: "", description: "", kind: "flat" as const, value: 0, minOrder: 0, maxDiscount: 0, usageLimit: 0, expiresAt: "", active: true };

function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [draft, setDraft] = useState<Omit<Coupon, "usedCount">>(EMPTY_COUPON);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ coupons: Coupon[] }>("/admin/coupons").then((d) => setCoupons(d.coupons)).catch((e: Error) => setError(e.message));
  }, []);

  async function save(c: Omit<Coupon, "usedCount">) {
    setError(null);
    try {
      const d = await api<{ coupons: Coupon[] }>("/admin/coupons", {
        body: { ...c, expiresAt: c.expiresAt ? new Date(`${c.expiresAt.slice(0, 10)}T23:59:59+05:30`).toISOString() : "" },
      });
      setCoupons(d.coupons);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }

  const num = (k: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: Number(e.target.value) || 0 }));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <form
        className="space-y-3 rounded-2xl border border-line bg-surface p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await save(draft)) setDraft(EMPTY_COUPON);
        }}
      >
        <p className="font-semibold">Create a coupon</p>
        <Field label="Code">
          <input required value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="DIWALI2000" className={`${inputClass} uppercase`} />
        </Field>
        <Field label="Description (shown to customers)">
          <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="₹2,000 off on orders above ₹30,000" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as "flat" | "percent" })} className={inputClass}>
              <option value="flat">₹ off</option>
              <option value="percent">% off</option>
            </select>
          </Field>
          <Field label={draft.kind === "flat" ? "Amount (₹)" : "Percent"}>
            <input required type="number" min={1} value={draft.value || ""} onChange={num("value")} className={inputClass} />
          </Field>
          <Field label="Minimum order (₹)">
            <input type="number" min={0} value={draft.minOrder || ""} onChange={num("minOrder")} className={inputClass} />
          </Field>
          <Field label="Max discount (₹)" hint="0 = no cap">
            <input type="number" min={0} value={draft.maxDiscount || ""} onChange={num("maxDiscount")} className={inputClass} />
          </Field>
          <Field label="Usage limit" hint="0 = unlimited">
            <input type="number" min={0} value={draft.usageLimit || ""} onChange={num("usageLimit")} className={inputClass} />
          </Field>
          <Field label="Expires on">
            <input type="date" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} className={inputClass} />
          </Field>
        </div>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover">Save coupon</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        {!coupons ? (
          <div className="p-10 text-center"><Spinner /></div>
        ) : coupons.length === 0 ? (
          <p className="p-10 text-center text-sm text-text-muted">No coupons yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left text-xs text-text-muted">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Min order</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((c) => (
                <tr key={c.code}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold">{c.code}</span>
                    {c.description && <span className="block text-xs text-text-muted">{c.description}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.kind === "flat" ? formatPrice(c.value) : `${c.value}%`}
                    {c.maxDiscount > 0 && <span className="block text-xs text-text-muted">up to {formatPrice(c.maxDiscount)}</span>}
                  </td>
                  <td className="px-4 py-3">{c.minOrder ? formatPrice(c.minOrder) : "—"}</td>
                  <td className="px-4 py-3">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                  <td className="px-4 py-3">{c.expiresAt ? formatDate(c.expiresAt) : "—"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={c.active}
                      onChange={(e) => {
                        const active = e.target.checked;
                        if (window.confirm(`${active ? "Activate" : "Deactivate"} coupon ${c.code}?`)) {
                          void save({ ...c, active });
                        }
                      }}
                      aria-label={`${c.code} active`}
                      className="size-4 accent-accent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

type PendingReview = { id: string; slug: string; product: string; rating: number; title: string; body: string; name: string; created_at: string };

/** Reviews wait here until approved; only approved ones show on the site. */
function Reviews() {
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [reviews, setReviews] = useState<PendingReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ reviews: PendingReview[] }>(`/admin/reviews?status=${status}`)
      .then((d) => setReviews(d.reviews))
      .catch((e: Error) => setError(e.message));
  }, [status]);

  async function decide(id: string, next: "approved" | "rejected") {
    if (!window.confirm(`${next === "approved" ? "Publish" : "Reject"} this customer review?`)) return;
    const d = await api<{ reviews: PendingReview[] }>(`/admin/reviews?status=${status}`, { method: "PATCH", body: { id, status: next } });
    setReviews(d.reviews);
  }

  return (
    <div>
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize ${status === s ? "border-accent bg-accent text-white" : "border-line-strong bg-surface"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {!reviews ? (
        <div className="py-10"><Spinner /></div>
      ) : reviews.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-line bg-surface p-10 text-center text-sm text-text-muted">No {status} reviews.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-xs text-text-muted">{r.product} · {formatDate(r.created_at, true)}</p>
              <p className="mt-1 font-semibold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} {r.title}</p>
              <p className="mt-1 whitespace-pre-line text-sm">{r.body}</p>
              <p className="mt-2 text-xs text-text-muted">{r.name}</p>
              {status === "pending" && (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => void decide(r.id, "approved")} className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white">Approve</button>
                  <button type="button" onClick={() => void decide(r.id, "rejected")} className="h-9 rounded-lg border border-line-strong px-4 text-sm font-semibold">Reject</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
