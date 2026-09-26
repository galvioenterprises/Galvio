export type CommerceEvent =
  | "view_item_list"
  | "select_item"
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "add_shipping_info"
  | "place_cod_request"
  | "cod_request_received"
  | "search"
  | "search_no_results"
  | "pincode_check"
  | "whatsapp_click";

type EventValues = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * One typed funnel vocabulary for GA4 and local QA. Calls are safe before
 * GA4 is configured: QA can still observe the galvio:analytics event.
 */
export function trackCommerceEvent(name: CommerceEvent, values: EventValues = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, values);
  window.dispatchEvent(new CustomEvent("galvio:analytics", { detail: { name, values } }));
}
