"use client";

import { useState } from "react";
import type { Product } from "@/lib/product-schema";
import { ProductImage } from "./product-image";

/** Thumbnail rail on the left, main image to its right, per the design.
 *  The rail becomes a horizontal strip below the image on narrow screens. */
export function ProductGallery({ images }: { images: Product["images"] }) {
  const [active, setActive] = useState(0);
  const image = images[active];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <div className="flex shrink-0 gap-3 sm:flex-col">
          {images.map((thumb, index) => (
            <button
              key={thumb.src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1} of ${images.length}`}
              aria-pressed={index === active}
              className={`flex size-16 items-center justify-center rounded-lg border bg-surface p-1.5 transition-colors ${
                index === active
                  ? "border-accent ring-1 ring-accent"
                  : "border-line hover:border-line-strong"
              }`}
            >
              <ProductImage
                src={thumb.src}
                alt=""
                sizes="64px"
                className="max-h-full w-auto object-contain"
              />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 items-center justify-center rounded-card border border-line bg-surface p-8">
        <ProductImage
          src={image.src}
          alt={image.alt}
          sizes="(min-width: 640px) 380px, 300px"
          priority
          className="h-[300px] w-auto object-contain sm:h-[380px]"
        />
      </div>
    </div>
  );
}
