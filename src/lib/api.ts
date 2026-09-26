"use client";

import { useSyncExternalStore } from "react";

/**
 * Client for the storefront Worker (worker/index.ts).
 *
 * Pages are static; anything per-customer — account, checkout, orders —
 * is fetched from /api/* after the page loads. The session is an HttpOnly
 * cookie, so this code never sees or stores a token.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      credentials: "same-origin",
      headers: init.body === undefined ? undefined : { "content-type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, "You appear to be offline. Check your connection and try again.");
  }
  const isJson = response.headers.get("content-type")?.includes("application/json");
  if (!isJson) {
    // An HTML error page instead of the API: nothing is serving /api here.
    console.warn(`[api] ${path}: HTTP ${response.status}, not the Galvio API. Is the Worker running? (pnpm dev starts it)`);
    throw new ApiError(response.status, "We couldn't reach our servers. Please try again in a moment.");
  }
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? "Something went wrong. Please try again.");
  }
  return data;
}

/** email is "" for mobile-only and guest accounts. */
export type User = { id: string; email: string; name: string; phone: string; guest?: boolean };

export type Address = {
  id: string;
  label: "Home" | "Work" | "Other";
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export type OrderStatus =
  | "pending_payment"
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "cod_due" | "pending" | "paid" | "failed" | "refunded";

export type Order = {
  id: string;
  status: OrderStatus;
  statusLabel: string;
  paymentMethod: "cod" | "online";
  paymentStatus: PaymentStatus;
  paymentRef: string;
  paymentMode: string;
  paidAt: string;
  mrpTotal: number;
  subtotal: number;
  couponCode: string;
  couponDiscount: number;
  deliveryFee: number;
  total: number;
  email: string;
  phone: string;
  address: Omit<Address, "id" | "isDefault" | "label"> & { label?: string };
  courier: string;
  trackingNumber: string;
  exchange: { appliance: string; brand?: string; ageYears?: number; working?: boolean; notes?: string } | null;
  createdAt: string;
  updatedAt: string;
  items: { slug: string; sku: string; title: string; image: string; unitPrice: number; mrp: number | null; qty: number }[];
  events: { status: string; note: string; at: string; actor?: string }[];
};

export type Quote = {
  mrpTotal: number;
  subtotal: number;
  couponCode: string;
  couponDiscount: number;
  couponDescription: string;
  addonTotal: number;
  deliveryFee: number;
  total: number;
  codAllowed: boolean;
};

export type PaymentChoice = "upi" | "card" | "emi" | "netbanking" | "wallet" | "cod";

export type StoreConfig = {
  cashOnDelivery: boolean;
  codLimit: number;
  deliveryFee: number;
  onlinePayments: boolean;
  phoneSignIn?: boolean;
  paymentMode: "sandbox" | "production" | "simulated";
};

export type PaymentHandoff = { sessionId: string; mode: StoreConfig["paymentMode"] };

/* ------------------------------------------------------------------ */
/* Session store                                                        */
/* ------------------------------------------------------------------ */

type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: User; isAdmin: boolean };

let session: SessionState = { status: "loading" };
let requested = false;
const listeners = new Set<() => void>();
const LOADING: SessionState = { status: "loading" };

function emit(next: SessionState) {
  session = next;
  listeners.forEach((l) => l());
}

export async function refreshSession(): Promise<SessionState> {
  try {
    const data = await api<{ user: User | null; isAdmin: boolean }>("/me");
    emit(data.user ? { status: "signed-in", user: data.user, isAdmin: data.isAdmin } : { status: "signed-out" });
  } catch {
    emit({ status: "signed-out" });
  }
  return session;
}

export function setSignedIn(user: User, isAdmin: boolean) {
  emit({ status: "signed-in", user, isAdmin });
}

export async function signOut() {
  await api("/auth/logout", { body: {} }).catch(() => undefined);
  emit({ status: "signed-out" });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!requested) {
    requested = true;
    void refreshSession();
  }
  return () => listeners.delete(listener);
}

/** One /api/me request per page view, shared by every component. */
export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => session, () => LOADING);
}

/* ------------------------------------------------------------------ */
/* Cashfree checkout                                                    */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<unknown>;
    };
  }
}

function loadCashfree(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new ApiError(0, "The payment page could not be loaded. Check your connection and try again."));
    document.head.appendChild(script);
  });
}

/**
 * Sends the customer to pay. Cashfree redirects back to
 * /checkout/complete/?order=… whatever happens; that page asks the Worker,
 * which asks Cashfree, whether the payment succeeded.
 */
export async function startPayment(orderId: string, payment: PaymentHandoff): Promise<void> {
  if (payment.mode === "simulated") {
    window.location.assign(new URL(`/checkout/simulate/?order=${encodeURIComponent(orderId)}`, window.location.origin).href);
    return;
  }
  await loadCashfree();
  const cashfree = window.Cashfree!({ mode: payment.mode });
  await cashfree.checkout({ paymentSessionId: payment.sessionId, redirectTarget: "_self" });
}
