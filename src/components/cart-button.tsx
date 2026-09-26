"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { CartIcon } from "./icons";

export function CartButton() {
  const { count } = useCart();

  return (
    <Link
      id="header-cart"
      href="/cart/"
      className="relative flex size-10 items-center justify-center rounded-lg text-text-invert-muted transition-colors hover:text-white"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
    >
      <CartIcon className="size-5" />
      {count > 0 && (
        <span
          key={count}
          className="absolute -right-0.5 -top-0.5 flex size-4 animate-[pop_400ms_cubic-bezier(.2,1.6,.4,1)] items-center justify-center rounded-full bg-accent text-[0.625rem] font-medium text-white motion-reduce:animate-none"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
