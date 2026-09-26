"use client";

import { useSyncExternalStore } from "react";

/**
 * What the customer chose on /checkout/, carried to /checkout/payment/:
 * the address and protection plans. sessionStorage,
 * because it belongs to this tab's checkout and nothing else.
 */
const KEY = "galvio.checkout.v1";
const EVENT = "galvio:checkout-changed";

export type CheckoutState = {
  addressId?: string;
  ordered?: string[];
  /** Slugs whose protection plan the customer ticked. */
  plans?: string[];
  /** For accounts without an email (mobile or guest). */
  contactEmail?: string;
};

let cachedRaw: string | null | undefined;
let cached: CheckoutState = {};
const EMPTY: CheckoutState = {};

function raw(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function readCheckout(): CheckoutState {
  const r = raw();
  if (r !== cachedRaw) {
    cachedRaw = r;
    try {
      cached = JSON.parse(r ?? "{}") as CheckoutState;
    } catch {
      cached = {};
    }
  }
  return cached;
}

export function writeCheckout(patch: CheckoutState) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...readCheckout(), ...patch }));
  } catch {
    // Without storage the payment page sends the customer back a step.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** Live checkout choices for components that show plan state. */
export function useCheckoutState(): CheckoutState {
  return useSyncExternalStore(subscribe, readCheckout, () => EMPTY);
}
