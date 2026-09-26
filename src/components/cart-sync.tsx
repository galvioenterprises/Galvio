"use client";

import { useEffect, useRef } from "react";
import { api, useSession } from "@/lib/api";
import { useCart } from "@/lib/cart";

/**
 * Mirrors a signed-in customer's cart to the server, a few seconds after
 * it last changed, so a reminder email can go out if they leave without
 * ordering. Guests' carts stay in the browser only.
 */
export function CartSync() {
  const session = useSession();
  const { lines } = useCart();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (session.status !== "signed-in") return;
    const items = lines.map((l) => ({ slug: l.slug, qty: l.qty }));
    const key = JSON.stringify(items);
    if (key === last.current) return;
    const timer = window.setTimeout(() => {
      last.current = key;
      void api("/cart", { method: "PUT", body: { items } }).catch(() => undefined);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [session.status, lines]);

  return null;
}
