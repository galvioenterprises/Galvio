import Link from "next/link";
import { ArrowRightIcon } from "../icons";
import { ProductImage } from "../product-image";
import { Container } from "../container";
import type { HomeCollection } from "./types";

/** Soft tints per card, so four white cards do not read as one block. */
const TINTS = [
  "from-[#eef4ff] to-[#dbe7ff]",
  "from-[#ecfbf8] to-[#d3f3ec]",
  "from-[#fff7ea] to-[#fde9c8]",
  "from-[#eef7fd] to-[#d6ecfa]",
] as const;

export function BuyingAssistant({ collections }: { collections: HomeCollection[] }) {
  if (collections.length === 0) return null;

  return (
    <section aria-labelledby="buying-assistant-title" className="pt-20 sm:pt-24">
      <Container size="listing">
        <div className="flex items-end justify-between gap-5">
          <div>
            <h2 id="buying-assistant-title" className="text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2rem]">
              Find the right appliance for your space
            </h2>
            <p className="mt-1.5 text-sm text-text-muted">Start with a category, then compare models side by side.</p>
          </div>
          <Link
            href="/products/"
            className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-accent hover:underline sm:inline-flex"
          >
            View all products
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {collections.slice(0, 4).map((collection, i) => (
            <Link
              key={collection.slug}
              href={`/products/${collection.slug}/`}
              className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(17,19,24,0.25)]"
            >
              <div className={`relative flex h-52 items-center justify-center bg-gradient-to-br p-6 ${TINTS[i % TINTS.length]} [&>picture]:contents`}>
                <ProductImage
                  src={collection.image}
                  alt=""
                  sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 90vw"
                  className="relative max-h-full w-auto max-w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.06]"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-semibold tracking-[-0.015em]">{collection.title}</h3>
                <p className="mt-1 text-sm text-text-muted">
                  {collection.productCount} {collection.productCount === 1 ? "model" : "models"} to compare
                </p>
                {collection.tags.length > 0 && (
                  <p className="mt-2 text-xs text-text-muted">{collection.tags.slice(0, 3).join(" · ")}</p>
                )}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-accent">
                  Explore
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
