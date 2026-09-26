"use client";

import { useEffect } from "react";
import { business } from "@/config/business";
import { planFor } from "@/config/addons";
import { canAddToCart, requiresAssistedOrder } from "@/lib/availability";
import { trackCommerceEvent } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { discountPercent } from "@/lib/pricing";
import type { Product } from "@/lib/product-schema";
import { productEnquiryLink } from "@/lib/whatsapp";
import { AddToCartButton } from "../add-to-cart-button";
import { BuyNowButton } from "../buy-now-button";
import { WrenchIcon } from "../icons";
import { useRuntimeProduct } from "../runtime-catalogue";
import { EmiPlans } from "./emi-plans";
import { StickyBuyBar } from "./sticky-buy-bar";

const AVAILABILITY_LABEL: Record<Product["availability"], string> = {
  unknown: "Stock is confirmed before dispatch",
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  preorder: "Available to pre-order",
  backorder: "On backorder",
};

/**
 * The visible price and purchase decision are client-side so an inventory
 * update from the distributor changes the PDP without waiting for a rebuild.
 * Metadata and structured data remain the build-time catalogue snapshot.
 */
export function ProductPurchasePanel({
  product: initialProduct,
  phone,
}: {
  product: Product;
  phone?: string;
}) {
  const product = useRuntimeProduct(initialProduct);
  const assisted = requiresAssistedOrder(product.sellingPrice);
  const cartEligible = canAddToCart(product.availability) && !assisted;
  const off = discountPercent(product);
  const savings = product.mrp - product.sellingPrice;
  const plan = planFor(product);
  const enquiryHref = productEnquiryLink(product);

  useEffect(() => {
    trackCommerceEvent("view_item", {
      slug: product.slug,
      value: product.sellingPrice,
      item_category: product.category,
    });
  }, [product.category, product.sellingPrice, product.slug]);

  return (
    <>
      <div className="mt-6 rounded-xl border border-line bg-canvas/55 p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[2rem] font-semibold tracking-tight">
            {formatPrice(product.sellingPrice)}
          </p>
          {off > 0 && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              {off}% off
            </span>
          )}
        </div>

        {off > 0 && (
          <p className="mt-1.5 text-[0.8125rem] text-text-muted">
            MRP <s>{formatPrice(product.mrp)}</s>
            <span className="ml-2 font-semibold text-emerald-700">
              You save {formatPrice(savings)}
            </span>
          </p>
        )}
        {business.onlinePayments && <EmiPlans price={product.sellingPrice} />}
        {plan && (
          <ul className="mt-2 space-y-1 text-[0.8125rem] text-text-muted">
            <li>
              <span className="font-medium text-text">{plan.title}</span> available at
              checkout for {formatPrice(plan.price)}
            </li>
          </ul>
        )}
        {product.category === "Air Conditioner" && (
          <p className="mt-2 flex items-center gap-1.5 text-[0.8125rem]">
            <WrenchIcon className="size-4 text-text-muted" />
            Installation by Voltas-authorised technicians ·{" "}
            <a href="#delivery" className="font-medium text-accent hover:underline">
              What&rsquo;s included
            </a>
          </p>
        )}
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-text-muted">
          {AVAILABILITY_LABEL[product.availability]}.
          {assisted
            ? ` Online Cash on Delivery checkout is available up to ${formatPrice(business.codLimit)}. Contact us to arrange this order.`
            : business.cashOnDelivery
              ? " Cash on Delivery is available."
              : ""}
        </p>
      </div>

      <div id="product-cta" className="mt-4 flex gap-3">
        {cartEligible ? (
          <>
            <AddToCartButton
              slug={product.slug}
              title={product.title}
              availability={product.availability}
              price={product.sellingPrice}
              image={product.images[0].src}
              enquiryHref={enquiryHref}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover sm:flex-none sm:px-7"
            />
            <BuyNowButton
              slug={product.slug}
              price={product.sellingPrice}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-5 text-sm font-semibold text-text transition-colors hover:border-text sm:flex-none sm:px-7"
            />
          </>
        ) : (
          <a
            href={enquiryHref}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-5 text-sm font-semibold text-text transition-colors hover:border-text sm:flex-none sm:px-7"
          >
            {assisted ? "Contact to order" : "Contact us"}
          </a>
        )}
      </div>

      <StickyBuyBar
        anchorId="product-cta"
        title={product.title}
        price={formatPrice(product.sellingPrice)}
        priceValue={product.sellingPrice}
        image={product.images[0].src}
        slug={product.slug}
        availability={product.availability}
        enquiryHref={enquiryHref}
        phone={phone}
      />
    </>
  );
}
