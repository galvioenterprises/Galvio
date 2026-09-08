"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/product-schema";

export function ProductGallery({ images }: { images: Product["images"] }) {
  const [active, setActive] = useState(0);
  const image = images[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center rounded-card border border-line bg-surface p-8">
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          priority
          className="h-[320px] w-auto object-contain sm:h-[400px]"
        />
      </div>

      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((thumb, index) => (
            <button
              key={thumb.src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
              aria-pressed={index === active}
              className={`rounded-lg border bg-surface p-2 transition-colors ${
                index === active ? "border-accent" : "border-line hover:border-line-strong"
              }`}
            >
              <Image
                src={thumb.src}
                alt=""
                width={thumb.width}
                height={thumb.height}
                className="size-16 object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
