"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { heroSlides } from "@/config/hero";
import { Container } from "../container";
import { ProductImage } from "../product-image";
import { ArrowRightIcon, CheckIcon } from "../icons";

const AUTOPLAY_MS = 6500;

export type HeroStats = Record<string, { count: number }>;

/**
 * The landing carousel.
 *
 * Each slide has its own dark colour field with a spotlight behind the
 * product. Navigation is a row of small dots plus swipe; autoplay pauses
 * on hover, focus, and for anyone who prefers reduced motion.
 */
export function Hero({ stats }: { stats: HeroStats }) {
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [touchX, setTouchX] = useState<number | null>(null);
  const count = heroSlides.length;
  const slide = heroSlides[index];
  const paused = userPaused || hoverPaused || reducedMotion;

  const go = useCallback(
    (next: number) => {
      const nextIndex = (next + count) % count;
      setIndex(nextIndex);
      setAnnouncement(`Slide ${nextIndex + 1} of ${count}: ${heroSlides[nextIndex].tab}`);
    },
    [count],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [index, paused, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured categories"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setHoverPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHoverPaused(false);
      }}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        setTouchX(null);
      }}
      className="relative isolate overflow-hidden text-white"
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <div className="relative h-[760px] sm:h-[700px] lg:h-[580px]">
        {heroSlides.map((item, slideIndex) => {
          const active = slideIndex === index;
          const stat = stats[item.category];
          const at = item.title.indexOf(item.highlight);
          const before = at >= 0 ? item.title.slice(0, at) : item.title;
          const after = at >= 0 ? item.title.slice(at + item.highlight.length) : "";
          const enter = `transition-[transform,opacity] duration-700 ${active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`;
          const delay = (ms: number) => ({ transitionDelay: active ? `${ms}ms` : "0ms" });
          const Title = slideIndex === 0 ? "h1" : "p";
          return (
            <div
              key={item.tab}
              aria-hidden={!active}
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${count}: ${item.tab}`}
              className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
                active ? "z-[1] opacity-100" : "pointer-events-none opacity-0"
              }`}
              style={{
                background: `radial-gradient(55% 75% at 70% 50%, ${item.theme.spot}55 0%, transparent 70%), linear-gradient(120deg, ${item.theme.from} 0%, ${item.theme.to} 100%)`,
              }}
            >
              <Container className="grid h-full content-start gap-2 pt-10 sm:pt-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:content-center lg:items-center lg:gap-8 lg:pt-0">
                <div className="relative z-10 max-w-[540px]">
                  <p
                    className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium backdrop-blur ${enter}`}
                    style={{ color: item.theme.accent, ...delay(100) }}
                  >
                    <span aria-hidden className="size-1.5 rounded-full" style={{ background: item.theme.accent }} />
                    {item.eyebrow}
                  </p>

                  <Title
                    className={`mt-5 text-[2.25rem] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[3rem] lg:text-[3.5rem] ${enter}`}
                    style={delay(200)}
                  >
                    {before}
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: `linear-gradient(90deg, ${item.theme.gradFrom}, ${item.theme.gradTo})` }}
                    >
                      {item.highlight}
                    </span>
                    {after}
                  </Title>

                  <p className={`mt-4 max-w-[46ch] text-[0.9375rem] leading-7 text-white/70 sm:text-base ${enter}`} style={delay(300)}>
                    {item.body}
                  </p>

                  <ul className={`mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/85 ${enter}`} style={delay(400)}>
                    {item.chips.map((chip) => (
                      <li key={chip} className="flex items-center gap-2">
                        <span
                          className="flex size-5 items-center justify-center rounded-full"
                          style={{ background: `${item.theme.accent}26`, color: item.theme.accent }}
                        >
                          <CheckIcon className="size-3" />
                        </span>
                        {chip}
                      </li>
                    ))}
                  </ul>

                  <div className={`mt-8 flex flex-wrap items-center gap-3 ${enter}`} style={delay(500)}>
                    <Link
                      href={item.primary.href}
                      tabIndex={active ? 0 : -1}
                      className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5"
                      style={{ boxShadow: `0 12px 36px -10px ${item.theme.accent}` }}
                    >
                      {item.primary.label}
                      <ArrowRightIcon className="size-[18px] transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                      href={item.secondary.href}
                      tabIndex={active ? 0 : -1}
                      className="inline-flex h-12 items-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/10"
                    >
                      {item.secondary.label}
                    </Link>
                    {stat && (
                      <p className="ml-1 text-sm opacity-70">
                        Explore <strong className="text-base font-semibold opacity-100">{stat.count}</strong>{" "}
                        {stat.count === 1 ? "model" : "models"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative flex h-[320px] min-w-0 items-center justify-center sm:h-[360px] lg:h-[520px]">
                  {/* Spotlight and floor */}
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-1/2 size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl sm:size-[380px] lg:size-[480px]"
                    style={{ background: `${item.theme.spot}55` }}
                  />
                  <span aria-hidden className="absolute bottom-[5%] left-1/2 h-10 w-[60%] -translate-x-1/2 rounded-[50%] bg-black/60 blur-2xl" />
                  <div className="relative flex h-[92%] w-full items-center justify-center [&>picture]:contents">
                    <ProductImage
                      src={item.image}
                      alt=""
                      sizes="(min-width: 1304px) 720px, (min-width: 1024px) 55vw, 92vw"
                      priority={slideIndex === 0}
                      className={`max-h-full max-w-full object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)] transition-transform duration-1000 ease-[cubic-bezier(.22,1,.36,1)] ${
                        active ? "translate-x-0 scale-100" : "translate-x-8 scale-[0.97]"
                      }`}
                    />
                  </div>
                </div>
              </Container>
            </div>
          );
        })}

        {/* Dots, and a pause control for anyone who needs the slide to stay. */}
        <div className="absolute inset-x-0 bottom-6 z-10 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1">
            {heroSlides.map((item, i) => (
              <button
                key={item.tab}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show ${item.tab}`}
                aria-current={i === index}
                className="flex h-8 items-center justify-center px-1"
              >
                <span
                  aria-hidden
                  className="block h-1.5 rounded-full transition-[width,background-color] duration-500"
                  style={{
                    width: i === index ? 28 : 8,
                    background: i === index ? slide.theme.accent : "rgba(255,255,255,0.35)",
                  }}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setUserPaused((current) => {
                setAnnouncement(current ? "Carousel resumed" : "Carousel paused");
                return !current;
              })
            }
            aria-pressed={userPaused}
            aria-label={userPaused ? "Resume carousel" : "Pause carousel"}
            className="flex size-8 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
          >
            {userPaused ? (
              <span aria-hidden className="ml-0.5 block size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current" />
            ) : (
              <span aria-hidden className="flex gap-[3px]">
                <span className="block h-2.5 w-[3px] rounded-sm bg-current" />
                <span className="block h-2.5 w-[3px] rounded-sm bg-current" />
              </span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
