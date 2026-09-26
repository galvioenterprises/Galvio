import { business } from "../src/config/business";
import { handleAddresses } from "./addresses";
import {
  adminCoupons,
  adminGetOrder,
  adminInventory,
  adminListOrders,
  adminUpdateOrder,
  catalogueOverrides,
} from "./admin";
import { guestSignIn, me, signOut, startSignIn, updateProfile, verifySignIn } from "./auth";
import { pincodeLookup } from "./pincode";
import { isDev, type Env } from "./env";
import { HttpError, json } from "./http";
import {
  cancelOrder,
  createOrder,
  getOrder,
  listOrders,
  markPaid,
  markPaymentFailed,
  retryPayment,
  simulatePayment,
  switchToCod,
} from "./orders";
import { checkoutMode, onlinePaymentsEnabled, verifyWebhook } from "./payments";
import { quoteHandler } from "./pricing";
import { smsConfigured } from "./sms";
import { adminReviews, createAlert, createReview, listReviews, reviewEligibility, runScheduled, saveCart } from "./engagement";
import { retryNotifications } from "./notifications";

/**
 * The storefront API. wrangler.jsonc routes only /api/* here; every other
 * path is a static file served without running this code.
 */

type Handler = (request: Request, env: Env, param: string) => Promise<Response>;
type Route = [method: string, pattern: RegExp, handler: Handler];

const ORDER_ID = "(GLV-\\d{6}-[A-Z0-9]{5})";

const routes: Route[] = [
  ["GET", /^\/api\/config$/, async (_r, env) =>
    json({
      cashOnDelivery: business.cashOnDelivery,
      codLimit: business.codLimit,
      deliveryFee: business.deliveryFee,
      onlinePayments: business.onlinePayments && onlinePaymentsEnabled(env),
      phoneSignIn: smsConfigured(env),
      paymentMode: checkoutMode(env),
    })],

  ["POST", /^\/api\/auth\/start$/, (r, env) => startSignIn(r, env)],
  ["POST", /^\/api\/auth\/verify$/, (r, env) => verifySignIn(r, env)],
  ["POST", /^\/api\/auth\/logout$/, (r, env) => signOut(r, env)],
  ["POST", /^\/api\/auth\/guest$/, (r, env) => guestSignIn(r, env)],
  ["GET", /^\/api\/pincode\/(\d{6})$/, (_r, _env, pin) => pincodeLookup(pin)],
  ["GET", /^\/api\/me$/, (r, env) => me(r, env)],
  ["PUT", /^\/api\/me$/, (r, env) => updateProfile(r, env)],

  ["GET", /^\/api\/addresses$/, (r, env) => handleAddresses(r, env, undefined)],
  ["POST", /^\/api\/addresses$/, (r, env) => handleAddresses(r, env, undefined)],
  ["PUT", /^\/api\/addresses\/([\w-]+)$/, (r, env, id) => handleAddresses(r, env, id)],
  ["DELETE", /^\/api\/addresses\/([\w-]+)$/, (r, env, id) => handleAddresses(r, env, id)],

  ["POST", /^\/api\/quote$/, (r, env) => quoteHandler(r, env)],
  ["GET", /^\/api\/catalogue\/overrides$/, (_r, env) => catalogueOverrides(env)],
  ["GET", /^\/api\/orders$/, (r, env) => listOrders(r, env)],
  ["POST", /^\/api\/orders$/, (r, env) => createOrder(r, env)],
  ["GET", new RegExp(`^/api/orders/${ORDER_ID}$`), (r, env, id) => getOrder(r, env, id)],
  ["POST", new RegExp(`^/api/orders/${ORDER_ID}/pay$`), (r, env, id) => retryPayment(r, env, id)],
  ["POST", new RegExp(`^/api/orders/${ORDER_ID}/cod$`), (r, env, id) => switchToCod(r, env, id)],
  ["POST", new RegExp(`^/api/orders/${ORDER_ID}/cancel$`), (r, env, id) => cancelOrder(r, env, id)],
  ["POST", /^\/api\/dev\/simulate-payment$/, (r, env) => simulatePayment(r, env)],
  // Development only: run the 30-minute job now.
  ["POST", /^\/api\/dev\/run-scheduled$/, async (_r, env) => {
    if (!isDev(env)) throw new HttpError(404, "Not found.");
    await runScheduled(env);
    return json({ ok: true });
  }],

  ["POST", /^\/api\/payments\/webhook$/, async (r, env) => {
    const event = await verifyWebhook(env, r);
    if (!event) return json({ error: "Invalid signature." }, { status: 401 });
    if (event.state === "paid") await markPaid(env, event.orderId, "webhook");
    if (event.state === "failed") await markPaymentFailed(env, event.orderId);
    return json({ ok: true });
  }],

  ["GET", /^\/api\/reviews\/([\w-]+)$/, (_r, env, slug) => listReviews(env, slug)],
  ["GET", /^\/api\/reviews\/([\w-]+)\/eligibility$/, (r, env, slug) => reviewEligibility(r, env, slug)],
  ["POST", /^\/api\/reviews$/, (r, env) => createReview(r, env)],
  ["PUT", /^\/api\/cart$/, (r, env) => saveCart(r, env)],
  ["POST", /^\/api\/alerts$/, (r, env) => createAlert(r, env)],
  ["GET", /^\/api\/admin\/reviews$/, (r, env) => adminReviews(r, env)],
  ["PATCH", /^\/api\/admin\/reviews$/, (r, env) => adminReviews(r, env)],
  ["GET", /^\/api\/admin\/orders$/, (r, env) => adminListOrders(r, env)],
  ["GET", /^\/api\/admin\/coupons$/, (r, env) => adminCoupons(r, env)],
  ["POST", /^\/api\/admin\/coupons$/, (r, env) => adminCoupons(r, env)],
  ["GET", /^\/api\/admin\/inventory$/, (r, env) => adminInventory(r, env)],
  ["GET", /^\/api\/admin\/inventory\/([\w-]+)$/, (r, env, slug) => adminInventory(r, env, slug)],
  ["PATCH", /^\/api\/admin\/inventory\/([\w-]+)$/, (r, env, slug) => adminInventory(r, env, slug)],
  ["DELETE", /^\/api\/admin\/inventory\/([\w-]+)$/, (r, env, slug) => adminInventory(r, env, slug)],
  ["GET", new RegExp(`^/api/admin/orders/${ORDER_ID}$`), (r, env, id) => adminGetOrder(r, env, id)],
  ["PATCH", new RegExp(`^/api/admin/orders/${ORDER_ID}$`), (r, env, id) => adminUpdateOrder(r, env, id)],
];

/**
 * Browsers always send Origin on cross-site POST/PUT/PATCH/DELETE. Anything
 * that changes state must come from this site. The payment webhook is
 * server-to-server and is authenticated by its signature instead.
 */
function sameOrigin(request: Request, url: URL, env: Env): boolean {
  if (request.method === "GET" || url.pathname.replace(/\/+$/, "") === "/api/payments/webhook") return true;
  // Token-authenticated calls (the inventory console) carry no cookie, so
  // there is nothing for a cross-site request to borrow.
  if (request.headers.get("authorization")?.startsWith("Bearer ")) return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (origin === url.origin || origin === new URL(env.SITE_URL).origin) return true;
  // `pnpm dev` serves pages from Next on another localhost port and proxies
  // /api here, so the page's origin differs from the Worker's.
  return isDev(env) && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      if (!sameOrigin(request, url, env)) throw new HttpError(403, "Cross-site request refused.");

      // `next dev` (trailingSlash: true) redirects /api/x to /api/x/ before
      // proxying here, so both spellings route the same.
      const path = url.pathname.replace(/\/+$/, "");
      for (const [method, pattern, handler] of routes) {
        if (method !== request.method) continue;
        const match = pattern.exec(path);
        if (match) return await handler(request, env, match[1] ?? "");
      }
      throw new HttpError(404, "Not found.");
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, { status: error.status });
      }
      console.error("[api] unhandled", error);
      return json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  },

  // Abandoned-cart reminders and price/stock alerts (see wrangler.jsonc).
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(Promise.all([runScheduled(env), retryNotifications(env)]));
  },
} satisfies ExportedHandler<Env>;
