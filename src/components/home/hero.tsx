import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, TagIcon } from "../icons";
import { FigmaIcon, type FigmaIconName } from "../figma-icon";
import { Container } from "../container";

const TRUST: { icon: FigmaIconName; title: string; subtitle: string }[] = [
  {
    icon: "trust-warranty-light",
    title: "Official Warranty",
    subtitle: "Brand warranty assured",
  },
  {
    icon: "trust-genuine-light",
    title: "100% Genuine Products",
    subtitle: "Authorised & trusted",
  },
  {
    icon: "trust-delivery-light",
    title: "Fast Delivery",
    subtitle: "Quick & safe shipping",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-text-invert">
      {/*
        On large screens the product image runs off the right edge of the
        frame, as it does in the design, so it is positioned against the
        section rather than placed in the content column. Below that
        breakpoint it returns to the normal flow above the copy.
      */}
      <div
        aria-hidden
        // Stops short of the bottom so it cannot sit over the trust row.
        className="pointer-events-none absolute right-0 top-0 hidden h-[68%] w-[54%] items-center lg:flex"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,rgba(80,110,190,0.20),transparent_62%)]" />
        <Image
          src="/images/hero-placeholder.svg"
          alt=""
          width={900}
          height={560}
          priority
          className="relative w-full translate-x-[6%]"
        />
      </div>

      {/* The generous bottom padding is where the category strip overlaps
          the seam between the hero and the page below it. */}
      <Container className="relative pb-44 pt-16 sm:pb-52 lg:pt-24">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="eyebrow flex items-center gap-2 text-accent">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              Premium electronics. Trusted brands.
            </p>

            {/* The design breaks this after "Better"; the size is set so it
                does that on its own rather than with a hard line break,
                which would strand "Living" on narrow screens. */}
            <h1 className="mt-5 text-[2.75rem] font-semibold leading-[1.06] tracking-[-0.02em] sm:text-[3.25rem] lg:text-[3.75rem]">
              Upgrade to Better Living
            </h1>

            <p className="mt-6 max-w-[44ch] text-[0.9375rem] leading-[1.8] text-text-invert-muted">
              Explore Voltas ACs, refrigerators, washing machines, air coolers
              and more — unbeatable prices, reliable service, complete peace of
              mind.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/products/"
                className="inline-flex h-14 items-center gap-2.5 rounded-xl bg-accent px-7 text-[0.9375rem] font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Explore Products
                <ArrowRightIcon className="size-[18px]" />
              </Link>
              <Link
                href="#top-deals"
                className="inline-flex h-14 items-center gap-2.5 rounded-xl border border-ink-line bg-ink-soft px-7 text-[0.9375rem] font-medium text-white transition-colors hover:border-white/25"
              >
                View Offers
                <TagIcon className="size-[18px]" />
              </Link>
            </div>
          </div>

          {/* Replace hero-placeholder.svg with the product render from the
              design once the photography lands. */}
          <div className="relative lg:hidden">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(80,110,190,0.20),transparent_65%)]"
            />
            <Image
              src="/images/hero-placeholder.svg"
              alt=""
              width={900}
              height={560}
              priority
              className="relative w-full"
            />
          </div>
        </div>

        <ul className="mt-20 grid gap-8 sm:grid-cols-3 lg:mt-28">
          {TRUST.map(({ icon, title, subtitle }) => (
            <li key={title} className="flex items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                <FigmaIcon name={icon} size={22} priority />
              </span>
              <span>
                <span className="block text-[0.9375rem] font-medium text-white">
                  {title}
                </span>
                <span className="mt-0.5 block text-[0.8125rem] text-text-invert-muted">
                  {subtitle}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
