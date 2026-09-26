"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, refreshSession, signOut, useSession, type Address, type Order, type OrderStatus, type User } from "@/lib/api";
import { useCart } from "@/lib/cart";
import type { CartProduct } from "@/lib/cart-products";
import { formatPrice } from "@/lib/format";
import { requiresAssistedOrder } from "@/lib/availability";
import { site } from "@/config/site";
import { ProductImage } from "../product-image";
import { ArrowRightIcon, BoxIcon, HeartIcon, MailIcon, PinIcon, SearchIcon, TruckIcon, UserIcon } from "../icons";
import { SpecChips } from "../checkout/parts";
import { AddressForm, AddressLines } from "./address-form";
import { Field, Spinner, inputClass, primaryButtonClass } from "./form";
import { OrderThumb, PAYMENT_LABEL, STATUS_DESCRIPTION, StatusPill, formatDate } from "./order-status";
import { SignInForm } from "./sign-in-form";
import { useRuntimeProductRecord } from "../runtime-catalogue";

type Tab = "orders" | "saved" | "addresses" | "profile";
const TABS: { id: Tab; label: string; Icon: typeof BoxIcon }[] = [
  { id: "orders", label: "My Orders", Icon: BoxIcon },
  { id: "saved", label: "Saved Items", Icon: HeartIcon },
  { id: "addresses", label: "Addresses", Icon: PinIcon },
  { id: "profile", label: "Profile", Icon: UserIcon },
];

export function AccountView({ products }: { products: Record<string, CartProduct> }) {
  const session = useSession();
  const [tab, setTab] = useState<Tab>("orders");
  const liveProducts = useRuntimeProductRecord(products);

  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as Tab;
    // Deep links (#addresses) from emails and the header.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
  }, []);

  if (session.status === "loading") {
    return (
      <div className="flex justify-center py-24 text-text-muted">
        <Spinner />
      </div>
    );
  }

  if (session.status === "signed-out") {
    return (
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface md:grid-cols-2">
        <div className="p-8 sm:p-10">
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em]">Sign in or create an account</h1>
          <div className="mt-6">
            <SignInForm />
          </div>
        </div>
        <div className="bg-ink p-8 text-text-invert sm:p-10">
          <p className="eyebrow text-text-invert-muted">Your Galvio account</p>
          <ul className="mt-6 space-y-5 text-sm">
            {[
              { Icon: TruckIcon, title: "Track every order", body: "Follow each order from placed to delivered." },
              { Icon: PinIcon, title: "Faster checkout", body: "Saved addresses, filled in for you next time." },
              { Icon: BoxIcon, title: "Order history", body: "Items, totals and delivery details in one place." },
            ].map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-accent" />
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="text-text-invert-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-text-invert-muted">No password to remember. We email you a code each time.</p>
        </div>
      </div>
    );
  }

  const { user } = session;
  const select = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-[5.5rem]">
        <div className="flex items-center gap-3 border-b border-line px-2 pb-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-lg font-semibold">
            {(user.name || user.email || "G").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name || "Your account"}</p>
            <p className="truncate text-xs text-text-muted">{user.email || (user.phone ? `+91 ${user.phone}` : "Guest")}</p>
            <button type="button" onClick={() => select("profile")} className="text-xs font-medium text-accent">
              View Profile
            </button>
          </div>
        </div>
        <p className="eyebrow mt-4 px-2 text-text-muted">My account</p>
        <nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Account">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => select(id)}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                tab === id ? "bg-accent/10 font-medium text-accent" : "hover:bg-canvas"
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
          {session.isAdmin && (
            <Link href="/admin/" className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-offer hover:bg-canvas">
              <BoxIcon className="size-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="mt-4 hidden border-t border-line px-2 pt-4 text-xs lg:block">
          <p className="font-semibold">Need help?</p>
          <a href={`mailto:${site.contact.email}`} className="mt-1 block break-all text-accent">{site.contact.email}</a>
          <button type="button" onClick={() => void signOut()} className="mt-4 text-text-muted hover:text-text">
            Sign out
          </button>
        </div>
      </aside>

      <div>
        {user.guest && (
          <details className="mb-6 rounded-2xl border border-accent/20 bg-accent/5 p-5 text-sm">
            <summary className="cursor-pointer font-semibold">
              You&rsquo;re using a guest account. Verify your mobile or email to keep your orders on any device.
            </summary>
            <div className="mt-4 max-w-sm">
              <SignInForm compact onDone={() => window.location.reload()} />
            </div>
          </details>
        )}
        {tab === "orders" && <OrdersTab user={user} products={liveProducts} />}
        {tab === "saved" && <SavedTab products={liveProducts} />}
        {tab === "addresses" && <AddressesTab />}
        {tab === "profile" && <ProfileTab user={user} />}
      </div>
    </div>
  );
}

const FILTERS: { id: string; label: string; match: (s: OrderStatus) => boolean }[] = [
  { id: "all", label: "All Orders", match: () => true },
  { id: "processing", label: "Processing", match: (s) => s === "placed" || s === "confirmed" || s === "packed" },
  { id: "shipped", label: "Shipped", match: (s) => s === "shipped" || s === "out_for_delivery" },
  { id: "delivered", label: "Delivered", match: (s) => s === "delivered" },
  { id: "cancelled", label: "Cancelled", match: (s) => s === "cancelled" },
];

function OrdersTab({ user, products }: { user: User; products: Record<string, CartProduct> }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const cart = useCart();
  const router = useRouter();

  useEffect(() => {
    api<{ orders: Order[] }>("/orders")
      .then((d) => setOrders(d.orders))
      .catch((e: Error) => setError(e.message));
  }, []);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];
    const q = query.trim().toLowerCase();
    return (orders ?? []).filter(
      (o) => f.match(o.status) && (!q || o.id.toLowerCase().includes(q) || o.items.some((i) => i.title.toLowerCase().includes(q))),
    );
  }, [orders, filter, query]);

  function buyAgain(order: Order) {
    for (const item of order.items) {
      const p = products[item.slug];
      if (p?.orderable && !requiresAssistedOrder(p.price)) cart.add(item.slug, item.qty, p.price);
    }
    router.push("/cart/");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em]">My Orders</h1>
          <p className="mt-1 text-sm text-text-muted">Track your COD orders from placement through confirmation and delivery.</p>
          {orders && <p className="mt-1 text-sm font-semibold">{orders.length} order{orders.length === 1 ? "" : "s"}</p>}
        </div>
        <div className="flex max-w-sm gap-3 rounded-2xl border border-accent/15 bg-accent/5 p-4">
          <MailIcon className="size-6 shrink-0 text-accent" />
          <p className="text-xs text-text-muted">
            <strong className="block text-sm text-text">We&rsquo;ll keep you updated</strong>
            {user.email ? `Email updates go to ${user.email}` : "We'll use your mobile number for confirmation"}
            {user.phone && `, including calls to +91 ${user.phone}`}.
          </p>
        </div>
      </div>

      <label className="relative mt-6 block">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by order ID or product name…"
          aria-label="Search orders"
          className={`${inputClass} h-12 pl-10`}
        />
      </label>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const n = (orders ?? []).filter((o) => f.match(o.status)).length;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                filter === f.id ? "border-accent bg-accent text-white" : "border-line-strong bg-surface hover:border-text"
              }`}
            >
              {f.label} ({n})
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !orders ? (
          <div className="flex justify-center py-12 text-text-muted"><Spinner /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
            <BoxIcon className="mx-auto size-10 text-text-faint" />
            <p className="mt-4 font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-text-muted">When you place a COD order, you can track its confirmation and delivery here.</p>
            <Link href="/products/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
              Start shopping <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface px-6 py-10 text-center text-sm text-text-muted">No orders match.</p>
        ) : (
          <ul className="space-y-4">
            {visible.map((o) => {
              const first = o.items[0];
              const product = products[first.slug];
              const itemCount = o.items.reduce((n, i) => n + i.qty, 0);
              const done = o.status === "delivered" || o.status === "cancelled";
              const canBuyAgain = done && o.items.some((item) => {
                const listed = products[item.slug];
                return listed?.orderable && !requiresAssistedOrder(listed.price);
              });
              const deliveredAt = o.events.findLast((e) => e.status === "delivered")?.at;
              return (
                <li
                  key={o.id}
                  className={`overflow-hidden rounded-2xl border bg-surface ${o.status === "cancelled" ? "border-line" : "border-accent/20"}`}
                >
                  <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm ${o.status === "cancelled" ? "bg-canvas" : "bg-accent/5"}`}>
                    <span className="text-text-muted">
                      Order ID: <span className="font-mono font-semibold text-accent">{o.id}</span>
                    </span>
                    <span className="hidden text-line-strong sm:inline">|</span>
                    <span className="text-text-muted">Ordered on: {formatDate(o.createdAt)}</span>
                  </div>
                  <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_14rem_11rem] md:divide-x md:divide-line">
                    <div className="flex gap-4">
                      <OrderThumb src={first.image} className="size-24" />
                      <div className="min-w-0">
                        <p className="eyebrow text-text-muted">{product?.brand ?? "Voltas"}</p>
                        <p className="font-semibold leading-snug">{first.title}</p>
                        {product?.variant && <p className="text-xs text-text-muted">{product.variant}</p>}
                        <SpecChips chips={product?.chips ?? []} />
                        <p className="mt-2 text-xs text-text-muted">
                          Qty: {first.qty}
                          {o.items.length > 1 && ` · + ${o.items.length - 1} more item${o.items.length > 2 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                    <div className="md:pl-5">
                      <StatusPill status={o.status} label={o.statusLabel} />
                      {o.status === "delivered" && deliveredAt ? (
                        <>
                          <p className="mt-3 text-xs text-text-muted">Delivered on</p>
                          <p className="font-semibold">{formatDate(deliveredAt)}</p>
                        </>
                      ) : (
                        <p className="mt-3 text-sm text-text-muted">{STATUS_DESCRIPTION[o.status]}</p>
                      )}
                      <p className="mt-2 text-xs text-text-muted">
                        {o.paymentMethod === "cod" ? "Cash on Delivery" : "Paid online"} · {PAYMENT_LABEL[o.paymentStatus]}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 md:pl-5">
                      <p className="text-right text-xl font-semibold">{formatPrice(o.total)}</p>
                      <p className="-mt-2 text-right text-xs text-text-muted">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
                      {!done && (
                        <Link href={`/account/order/?id=${o.id}`} className="inline-flex h-10 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-hover">
                          Track Order
                        </Link>
                      )}
                      <Link href={`/account/order/?id=${o.id}`} className="inline-flex h-10 items-center justify-center rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/5">
                        View Details
                      </Link>
                      {canBuyAgain && (
                        <button type="button" onClick={() => buyAgain(o)} className="inline-flex h-10 items-center justify-center rounded-lg border border-accent text-sm font-semibold text-accent hover:bg-accent/5">
                          Buy Again
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {orders && orders.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
            <p className="text-text-muted">Showing {visible.length} of {orders.length} orders</p>
            <Link href="/contact/" className="font-medium text-accent hover:underline">Need help with an order? Contact Support</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SavedTab({ products }: { products: Record<string, CartProduct> }) {
  const cart = useCart();
  const saved = cart.saved.flatMap((slug) => (products[slug] ? [products[slug]] : []));
  return (
    <div>
      <h1 className="text-[2rem] font-semibold tracking-[-0.02em]">Saved Items</h1>
      <p className="mt-1 text-sm text-text-muted">Products you saved for later on this device.</p>
      {saved.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center text-sm text-text-muted">
          Nothing saved yet. Use &ldquo;Save for later&rdquo; in your cart.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map((p) => (
            <li key={p.slug} className="flex flex-col rounded-2xl border border-line bg-surface p-4">
              <span className="flex h-36 items-center justify-center rounded-xl bg-canvas p-3 [&>picture]:contents">
                <ProductImage src={p.image} alt="" sizes="240px" className="max-h-full w-auto object-contain" />
              </span>
              <Link href={`/product/${p.slug}/`} className="mt-3 line-clamp-2 text-sm font-semibold hover:text-accent">{p.title}</Link>
              <p className="mt-1 font-semibold">{formatPrice(p.price)}</p>
              <div className="mt-auto flex gap-3 pt-3 text-sm">
                {p.orderable && !requiresAssistedOrder(p.price) && (
                  <button type="button" onClick={() => cart.add(p.slug, 1, p.price)} className="font-semibold text-accent">Move to cart</button>
                )}
                {p.orderable && requiresAssistedOrder(p.price) && (
                  <Link href={`/product/${p.slug}/`} className="font-semibold text-accent hover:underline">Contact to order</Link>
                )}
                <button type="button" onClick={() => cart.unsave(p.slug)} className="text-text-muted hover:text-red-600">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddressesTab() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  useEffect(() => {
    api<{ addresses: Address[] }>("/addresses").then((d) => setAddresses(d.addresses));
  }, []);

  return (
    <div>
      <h1 className="text-[2rem] font-semibold tracking-[-0.02em]">Addresses</h1>
      <p className="mt-1 text-sm text-text-muted">Saved delivery addresses for faster checkout.</p>
      <div className="mt-6">
        {!addresses ? (
          <Spinner />
        ) : editing ? (
          <div className="max-w-2xl rounded-2xl border border-line bg-surface p-6">
            <h2 className="mb-5 font-semibold">{editing === "new" ? "Add an address" : "Edit address"}</h2>
            <AddressForm
              initial={editing === "new" ? undefined : editing}
              onSaved={(list) => {
                setAddresses(list);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {addresses.map((a) => (
              <div key={a.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                <p className="mb-2 flex gap-2">
                  <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-medium">{a.label}</span>
                  {a.isDefault && <span className="eyebrow self-center text-accent">Default</span>}
                </p>
                <AddressLines address={a} />
                <div className="mt-auto flex gap-4 pt-4 text-sm">
                  <button type="button" onClick={() => setEditing(a)} className="font-medium text-accent hover:underline">Edit</button>
                  <button
                    type="button"
                    onClick={async () => {
                      const d = await api<{ addresses: Address[] }>(`/addresses/${a.id}`, { method: "DELETE" });
                      setAddresses(d.addresses);
                    }}
                    className="text-text-muted hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <span className="text-2xl leading-none">+</span>
              Add an address
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <h1 className="text-[2rem] font-semibold tracking-[-0.02em]">Profile</h1>
      <form
        className="mt-6 max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setState("saving");
          setError(null);
          try {
            await api("/me", { method: "PUT", body: { name, phone } });
            await refreshSession();
            setState("saved");
          } catch (err) {
            setError((err as Error).message);
            setState("idle");
          }
        }}
      >
        <Field label="Email">
          <input value={user.email || "Not added"} disabled className={`${inputClass} bg-canvas text-text-muted`} />
        </Field>
        <Field label="Full name">
          <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Mobile number" error={error}>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className={inputClass}
          />
        </Field>
        <button type="submit" disabled={state === "saving"} className={`${primaryButtonClass} sm:w-auto`}>
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save changes"}
        </button>
      </form>
      <button type="button" onClick={() => void signOut()} className="mt-6 text-sm text-text-muted hover:text-text lg:hidden">
        Sign out
      </button>
    </div>
  );
}
