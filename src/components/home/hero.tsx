"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { heroSlides } from "@/config/hero";
import { Container } from "../container";
import { ProductImage } from "../product-image";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon, TagIcon } from "../icons";

const AUTOPLAY_MS = 7000;

/**
 * Hero carousel.
 *
 * Measured against frame 347:146 at a 1920 viewport: the hero runs from
 * the header at 64 to the trust band at 621, the eyebrow sits at 189 and
 * the headline at 228 on a 54px line.
 *
 * Autoplay stops on hover, on focus, and for anyone who has asked for
 * reduced motion — a carousel that keeps moving while you are reading it
 * is worse than one that does not move at all.
 */
export function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const region = useRef<HTMLDivElement>(null);

  const count = heroSlides.length;
  const go = useCallback((next: number) => setIndex((next + count) % count), [count]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  const slide = heroSlides[index];

  return (
    <section
      ref={region}
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="relative overflow-hidden bg-hero text-text-invert"
    >
      {/* Blue spill behind the product, which is what lifts the frame's
          background off black on the right-hand side. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-[62%] bg-[radial-gradient(ellipse_at_58%_45%,var(--color-hero-glow)_0%,transparent_62%)] opacity-70"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 hidden h-[86%] w-[52%] items-center justify-center lg:flex"
      >
        <ProductImage
          src={slide.image}
          alt=""
          sizes="720px"
          priority
          className="max-h-full w-auto max-w-none scale-125 object-contain"
        />
      </div>

      <Container className="relative pb-[4.5rem] pt-16 lg:pb-36 lg:pt-[7.8rem]">
        <div
          aria-live="polite"
          aria-atomic="true"
          className="grid items-center gap-12 lg:grid-cols-2"
        >
          <div>
            <p className="eyebrow flex items-center gap-2 text-accent">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              {slide.eyebrow}
            </p>

            <h1 className="mt-6 text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[2.75rem] lg:text-[3.125rem]">
              {slide.title}
            </h1>

            <p className="mt-6 max-w-[44ch] text-base leading-[1.7] text-text-invert-muted">
              {slide.body}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={slide.primary.href}
                className="inline-flex h-14 items-center gap-2.5 rounded-xl bg-accent px-7 text-[0.9375rem] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                {slide.primary.label}
                <ArrowRightIcon className="size-[18px]" />
              </Link>
              <Link
                href={slide.secondary.href}
                className="inline-flex h-14 items-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.04] px-7 text-[0.9375rem] font-medium text-white transition-colors hover:border-white/30"
              >
                {slide.secondary.label}
                <TagIcon className="size-[18px]" />
              </Link>
            </div>
          </div>

          {/* The product sits behind the copy on large screens; on small
              ones it returns to the flow so it is not simply lost. */}
          <div className="relative h-72 overflow-hidden lg:hidden">
            <ProductImage
              src={slide.image}
              alt=""
              sizes="100vw"
              priority
              className="absolute left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 scale-125 object-contain"
            />
          </div>
        </div>
      </Container>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition-colors hover:bg-white/15 lg:flex"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur transition-colors hover:bg-white/15 lg:flex"
          >
            <ChevronRightIcon className="size-5" />
          </button>

          <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center gap-2">
            {heroSlides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}: ${s.title}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-accent" : "w-2 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
