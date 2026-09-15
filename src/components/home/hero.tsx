import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";
import { ArrowRightIcon, BadgeIcon, ShieldCheckIcon, TruckIcon, TagIcon } from "../icons";

const TRUST = [
  { Icon: ShieldCheckIcon, title: "Official Warranty", subtitle: "Brand warranty assured" },
  { Icon: BadgeIcon, title: "100% Genuine Products", subtitle: "Authorised & trusted" },
  { Icon: TruckIcon, title: "Fast Delivery", subtitle: "Quick & safe shipping" },
];

export function Hero() {
  return (
    <section className="relative bg-ink text-text-invert">
      {/* Bottom padding leaves room for the category strip, which overlaps
          the seam between the hero and the page below it. */}
      <div className="mx-auto max-w-[1200px] px-5 pb-32 pt-16 sm:pb-36 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <p className="eyebrow flex items-center gap-2 text-accent">
              <span aria-hidden className="size-1.5 rounded-full bg-accent" />
              Premium electronics. Trusted brands.
            </p>

            <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Upgrade to Better Living
            </h1>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-text-invert-muted">
              Explore ACs, refrigerators, washing machines, air coolers and more
              — unbeatable prices, reliable service, complete peace of mind.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products/"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Explore Products
                <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="#top-deals"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-line bg-ink-soft px-6 text-sm font-medium text-white transition-colors hover:border-white/25"
              >
                View Offers
                <TagIcon className="size-4" />
              </Link>
            </div>
          </div>

          {/* Replace hero-placeholder.svg with the product render from the
              design once the photography lands. */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_center,rgba(80,110,190,0.22),transparent_65%)]"
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

        <ul className="mt-12 grid gap-6 border-t border-ink-line pt-8 sm:grid-cols-3">
          {TRUST.map(({ Icon, title, subtitle }) => (
            <li key={title} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-soft text-text-invert-muted">
                <Icon className="size-[18px]" />
              </span>
              <span>
                <span className="block text-sm font-medium text-white">{title}</span>
                <span className="block text-xs text-text-invert-muted">{subtitle}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <span className="sr-only">{site.name}</span>
    </section>
  );
}
