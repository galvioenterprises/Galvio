"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { CartIcon } from "./icons";

export function CartButton() {
  const { count } = useCart();

  return (
    <Link
      href="/cart/"
      className="relative flex size-10 items-center justify-center rounded-lg text-text-invert-muted transition-colors hover:text-white"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
    >
      <CartIcon className="size-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[0.625rem] font-medium text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
