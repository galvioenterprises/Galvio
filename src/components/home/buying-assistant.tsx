import Link from "next/link";
import { ArrowRightIcon } from "../icons";
import { ProductImage } from "../product-image";
import { Container } from "../container";
import type { HomeCollection } from "./types";

export function BuyingAssistant({ collections }: { collections: HomeCollection[] }) {
  if (collections.length === 0) return null;

  return (
    <section aria-labelledby="buying-assistant-title" className="pt-20 sm:pt-24">
      <Container size="listing">
        <div className="flex items-end justify-between gap-5">
          <div>
            <h2
              id="buying-assistant-title"
              className="text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2rem]"
            >
              Find the right appliance for your space
            </h2>
            <p className="mt-1.5 text-sm text-text-muted">
              Start with a category, then compare the details supplied for each model.
            </p>
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
          {collections.slice(0, 4).map((collection) => (
            <article
              key={collection.slug}
              className="group relative min-h-[235px] overflow-hidden rounded-2xl border border-line bg-[linear-gradient(135deg,#edf1f5_0%,#fff_62%)]"
            >
              <div className="relative z-10 max-w-[66%] p-6">
                <h3 className="text-lg font-semibold leading-snug tracking-[-0.015em]">
                  Choosing {collection.title.toLowerCase()}?
                </h3>
                <Link
                  href={`/products/${collection.slug}/`}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-medium text-accent shadow-sm transition-transform group-hover:translate-x-0.5"
                >
                  Explore {collection.title}
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </div>

              <div className="pointer-events-none absolute bottom-8 right-[-8%] top-4 flex w-[58%] items-center justify-center">
                <ProductImage
                  src={collection.image}
                  alt=""
                  sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 70vw"
                  className="max-h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>

              <ul className="absolute inset-x-0 bottom-0 z-10 flex min-h-10 items-center gap-3 overflow-hidden border-t border-line/80 bg-white/85 px-5 py-2 text-[0.6875rem] font-medium text-accent backdrop-blur-sm">
                {collection.tags.length > 0 ? (
                  collection.tags.slice(0, 3).map((tag) => (
                    <li key={tag} className="shrink-0">
                      {tag}
                    </li>
                  ))
                ) : (
                  <li>{collection.productCount} listed models</li>
                )}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
