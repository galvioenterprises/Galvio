"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { ChevronLeftIcon } from "../icons";

export function CartHeading() {
  const { count } = useCart();
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em]">Your Cart</h1>
        <p className="mt-2 text-sm text-text-muted">
          {count} item{count === 1 ? "" : "s"} in your cart
        </p>
      </div>
      <Link href="/products/" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
        <ChevronLeftIcon className="size-4" /> Continue Shopping
      </Link>
    </div>
  );
}
