"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { CheckIcon } from "./icons";

export function AddToCartButton({
  slug,
  title,
  className = "",
  label = "Add to cart",
}: {
  slug: string;
  title: string;
  className?: string;
  label?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        add(slug);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1600);
      }}
      className={className}
    >
      {added ? (
        <>
          <CheckIcon className="size-4" />
          Added
        </>
      ) : (
        label
      )}
      <span className="sr-only"> — {title}</span>
    </button>
  );
}
