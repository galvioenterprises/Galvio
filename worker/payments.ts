import type { Env } from "./env";
import { isDev } from "./env";
import { HttpError, safeEqual } from "./http";

/**
 * Cashfree Payment Gateway (PG API version 2025-01-01).
 *
 * Everything gateway-specific lives in this file, so moving to another
 * gateway means rewriting this file and nothing else.
 *
 * The browser is never trusted about whether a payment happened. An order
 * becomes paid only when `fetchPaymentState` asks Cashfree directly, or
 * when a webhook arrives with a valid signature.
 */

const API_VERSION = "2025-01-01";

export type PaymentState = "paid" | "pending" | "failed";

export function onlinePaymentsEnabled(env: Env): boolean {
  return Boolean(env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY) || isDev(env);
}

/** Dev without keys: the checkout pretends to pay via /checkout/simulate/. */
export function simulated(env: Env): boolean {
  return isDev(env) && !(env.CASHFREE_APP_ID && env.CASHFREE_SECRET_KEY);
}

function base(env: Env): string {
  return env.CASHFREE_ENV === "sandbox"
    ? "https://sandbox.cashfree.com/pg"
    : "https://api.cashfree.com/pg";
}

function headers(env: Env): HeadersInit {
  return {
    "x-client-id": env.CASHFREE_APP_ID ?? "",
    "x-client-secret": env.CASHFREE_SECRET_KEY ?? "",
    "x-api-version": API_VERSION,
    "content-type": "application/json",
    accept: "application/json",
  };
}

/** What the customer picked on our payment page, in Cashfree's terms. */
export const METHOD_FILTER = {
  upi: "upi",
  card: "cc,dc",
  netbanking: "nb",
  wallet: "app",
  // Credit card EMI, debit card EMI and cardless EMI (bank or NBFC).
  emi: "ccemi,dcemi,cardlessemi",
} as const;
export type OnlineMethod = keyof typeof METHOD_FILTER;

type CreateInput = {
  orderId: string;
  amount: number;
  method: OnlineMethod;
  customer: { id: string; name: string; email: string; phone: string };
};

/** Returns what the browser needs to open Cashfree's checkout. */
export async function createPayment(
  env: Env,
  input: CreateInput,
): Promise<{ sessionId: string; mode: "sandbox" | "production" | "simulated" }> {
  if (simulated(env)) return { sessionId: "", mode: "simulated" };

  const response = await fetch(`${base(env)}/orders`, {
    method: "POST",
    headers: headers(env),
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: "INR",
      customer_details: {
        // Cashfree customer ids allow only alphanumerics, "_" and "-".
        customer_id: input.customer.id.replace(/[^A-Za-z0-9_-]/g, "_"),
        customer_name: input.customer.name,
        customer_email: input.customer.email,
        customer_phone: input.customer.phone,
      },
      order_meta: {
        return_url: `${env.SITE_URL}/checkout/complete/?order=${input.orderId}`,
        notify_url: `${env.SITE_URL}/api/payments/webhook`,
        // Opens Cashfree's checkout on the method chosen on our page.
        payment_methods: METHOD_FILTER[input.method],
      },
      order_note: `Galvio order ${input.orderId}`,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    payment_session_id?: string;
    message?: string;
  };
  if (!response.ok || !body.payment_session_id) {
    console.error(`[cashfree] create ${response.status}: ${body.message ?? "no message"}`);
    throw new HttpError(502, "The payment service is not responding. Try again, or choose Cash on Delivery.");
  }
  return {
    sessionId: body.payment_session_id,
    mode: env.CASHFREE_ENV === "sandbox" ? "sandbox" : "production",
  };
}

/**
 * The payment session of an order already created at Cashfree, for a
 * customer retrying after closing the payment window. Cashfree order ids
 * are single-use, so a retry reuses the session rather than creating one.
 */
export async function existingSession(env: Env, orderId: string): Promise<string | null> {
  if (simulated(env)) return "";
  const response = await fetch(`${base(env)}/orders/${encodeURIComponent(orderId)}`, {
    headers: headers(env),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { order_status?: string; payment_session_id?: string };
  return body.order_status === "ACTIVE" ? (body.payment_session_id ?? null) : null;
}

export function checkoutMode(env: Env): "sandbox" | "production" | "simulated" {
  if (simulated(env)) return "simulated";
  return env.CASHFREE_ENV === "sandbox" ? "sandbox" : "production";
}

/** The successful payment's transaction id and method, for the receipt. */
export async function fetchPaymentDetails(
  env: Env,
  orderId: string,
): Promise<{ ref: string; mode: string; at: string } | null> {
  if (simulated(env)) return { ref: `SIM-${orderId.slice(-5)}`, mode: "UPI", at: new Date().toISOString() };
  const response = await fetch(`${base(env)}/orders/${encodeURIComponent(orderId)}/payments`, {
    headers: headers(env),
  });
  if (!response.ok) return null;
  const payments = (await response.json()) as {
    cf_payment_id?: string | number;
    payment_status?: string;
    payment_group?: string;
    payment_completion_time?: string;
  }[];
  const paid = payments.find((p) => p.payment_status === "SUCCESS");
  if (!paid) return null;
  const group = (paid.payment_group ?? "").replace(/_/g, " ");
  return {
    ref: String(paid.cf_payment_id ?? ""),
    mode: /upi/i.test(group) ? "UPI" : group.replace(/\b\w/g, (c) => c.toUpperCase()),
    at: paid.payment_completion_time ? new Date(paid.payment_completion_time).toISOString() : new Date().toISOString(),
  };
}

/** Asks Cashfree for the order's state. */
export async function fetchPaymentState(env: Env, orderId: string): Promise<PaymentState> {
  if (simulated(env)) return "pending";
  const response = await fetch(`${base(env)}/orders/${encodeURIComponent(orderId)}`, {
    headers: headers(env),
  });
  if (!response.ok) return "pending";
  const body = (await response.json()) as { order_status?: string };
  switch (body.order_status) {
    case "PAID":
      return "paid";
    case "EXPIRED":
    case "TERMINATED":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Verifies a Cashfree webhook.
 *
 * Signature = base64(HMAC-SHA256(timestamp + rawBody, secret key)). Old
 * timestamps are refused, so a captured webhook cannot be replayed later.
 */
export async function verifyWebhook(
  env: Env,
  request: Request,
): Promise<{ orderId: string; state: PaymentState } | null> {
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  const raw = await request.text();
  if (!signature || !timestamp || !env.CASHFREE_SECRET_KEY) return null;

  const ageMs = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(ageMs) || ageMs > 10 * 60_000) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.CASHFREE_SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + raw));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  if (!safeEqual(expected, signature)) return null;

  const event = JSON.parse(raw) as {
    type?: string;
    data?: { order?: { order_id?: string }; payment?: { payment_status?: string } };
  };
  const orderId = event.data?.order?.order_id;
  if (!orderId) return null;

  const status = event.data?.payment?.payment_status;
  const state: PaymentState =
    status === "SUCCESS" ? "paid" : status === "FAILED" || status === "USER_DROPPED" ? "failed" : "pending";
  return { orderId, state };
}
