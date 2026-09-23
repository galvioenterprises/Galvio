"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/product-schema";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { ProductImage } from "./product-image";

/**
 * Product gallery modelled on the manufacturer's product pages: a vertical
 * thumbnail rail beside the hero image on larger screens and a horizontal rail
 * below it on mobile. Every image comes from the product record; this component
 * never reaches out to a remote image source at runtime.
 */
export function ProductGallery({ images }: { images: Product["images"] }) {
  const [active, setActive] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasMounted = useRef(false);
  const image = images[active];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    thumbnailRefs.current[active]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [active]);

  const selectPrevious = () => {
    setActive((current) => (current - 1 + images.length) % images.length);
  };

  const selectNext = () => {
    setActive((current) => (current + 1) % images.length);
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Product images"
      onKeyDown={(event) => {
        if (!hasMultipleImages) return;

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          selectPrevious();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          selectNext();
        } else if (event.key === "Home") {
          event.preventDefault();
          setActive(0);
        } else if (event.key === "End") {
          event.preventDefault();
          setActive(images.length - 1);
        }
      }}
      className="flex min-w-0 flex-col-reverse gap-3 md:flex-row"
    >
      {hasMultipleImages && (
        <div
          role="group"
          aria-label="Choose a product image"
          className="flex min-w-0 shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:max-h-[460px] md:w-[72px] md:flex-col md:overflow-x-hidden md:overflow-y-auto md:pb-0 md:pr-1 md:[scrollbar-width:thin] lg:max-h-[500px] 2xl:max-h-[540px]"
        >
          {images.map((thumb, index) => (
            <button
              key={`${thumb.src}-${index}`}
              ref={(node) => {
                thumbnailRefs.current[index] = node;
              }}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1} of ${images.length}`}
              aria-current={index === active ? "true" : undefined}
              className={`flex size-[68px] shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-canvas p-2 transition-[border-color,box-shadow] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                index === active
                  ? "border-accent ring-1 ring-accent"
                  : "border-line hover:border-line-strong"
              }`}
            >
              <span className="flex size-full items-center justify-center [&>picture]:contents">
                <ProductImage
                  src={thumb.src}
                  alt=""
                  sizes="64px"
                  className="max-h-full max-w-full object-contain"
                />
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") pointerStartX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (pointerStartX.current === null || event.pointerType === "mouse") return;

          const distance = event.clientX - pointerStartX.current;
          pointerStartX.current = null;
          if (Math.abs(distance) < 40) return;
          if (distance > 0) selectPrevious();
          else selectNext();
        }}
        onPointerCancel={() => {
          pointerStartX.current = null;
        }}
        className="group relative flex h-[240px] w-full min-w-0 shrink-0 touch-pan-y items-center justify-center overflow-hidden bg-surface px-1 py-3 sm:h-[420px] sm:p-2 md:h-[460px] md:flex-1 lg:h-[500px] 2xl:h-[540px]"
      >
        <div className="flex size-full items-center justify-center [&>picture]:contents">
          <ProductImage
            src={image.src}
            alt={image.alt}
            sizes="(min-width: 1536px) 600px, (min-width: 1280px) 640px, (min-width: 1024px) 420px, (min-width: 768px) 560px, calc(100vw - 80px)"
            priority={active === 0}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        {hasMultipleImages && (
          <>
            <button
              type="button"
              onClick={selectPrevious}
              aria-label="Show previous product image"
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-text shadow-sm transition-[background-color,opacity] hover:bg-white focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={selectNext}
              aria-label="Show next product image"
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/95 text-text shadow-sm transition-[background-color,opacity] hover:bg-white focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <ChevronRightIcon className="size-5" />
            </button>

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Image {active + 1} of {images.length}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
