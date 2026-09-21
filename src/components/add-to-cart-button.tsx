"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/product-schema";
import { CheckIcon } from "./icons";

export function AddToCartButton({
  slug,
  title,
  availability,
  enquiryHref,
  className = "",
  label = "Add to cart",
}: {
  slug: string;
  title: string;
  availability: Product["availability"];
  enquiryHref?: string;
  className?: string;
  label?: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  if (availability !== "in_stock") {
    const content = (
      <>
        {enquiryHref ? "Enquire" : "Not in stock"}
        <span className="sr-only"> — {title}</span>
      </>
    );

    return enquiryHref ? (
      <a href={enquiryHref} className={className}>
        {content}
      </a>
    ) : (
      <button
        type="button"
        disabled
        className={`${className} cursor-not-allowed opacity-60`}
      >
        {content}
      </button>
    );
  }

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
