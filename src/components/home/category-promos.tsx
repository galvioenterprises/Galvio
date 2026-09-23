import Link from "next/link";
import { ArrowRightIcon } from "../icons";
import { ProductImage } from "../product-image";
import { Container } from "../container";
import type { HomeCollection } from "./types";

const THEMES = [
  {
    card: "border-[#cfe8f8] bg-[linear-gradient(120deg,#edf9ff_0%,#d7effa_55%,#c4e5f2_100%)] text-ink",
    eyebrow: "text-[#056692]",
    button: "bg-ink text-white hover:bg-ink-soft",
    wash: "bg-[radial-gradient(circle_at_77%_45%,rgba(255,255,255,0.9),transparent_48%)]",
  },
  {
    card: "border-ink-line bg-[linear-gradient(120deg,#07111f_0%,#0d2234_58%,#153a4d_100%)] text-white",
    eyebrow: "text-[#63c7f2]",
    button: "border border-white/25 bg-white/10 text-white hover:bg-white/15",
    wash: "bg-[radial-gradient(circle_at_80%_42%,rgba(70,167,205,0.28),transparent_50%)]",
  },
] as const;

export function CategoryPromos({ collections }: { collections: HomeCollection[] }) {
  if (collections.length === 0) return null;

  return (
    <section aria-label="Featured product categories" className="pt-16 sm:pt-20">
      <Container size="listing">
        <div className="grid gap-5 lg:grid-cols-2">
          {collections.slice(0, 2).map((collection, index) => {
            const theme = THEMES[index % THEMES.length];
            return (
              <article
                key={collection.slug}
                className={`relative min-h-[270px] overflow-hidden rounded-2xl border px-7 py-8 sm:min-h-[320px] sm:px-10 sm:py-10 ${theme.card}`}
              >
                <div aria-hidden className={`absolute inset-0 ${theme.wash}`} />

                <div className="relative z-10 max-w-[55%] sm:max-w-[52%]">
                  <p className={`eyebrow ${theme.eyebrow}`}>Voltas catalogue</p>
                  <h2 className="mt-3 text-[1.75rem] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[2.25rem]">
                    Explore {collection.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed opacity-70">
                    {collection.productCount} listed {collection.productCount === 1 ? "model" : "models"}
                  </p>
                  <Link
                    href={`/products/${collection.slug}/`}
                    className={`mt-7 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors ${theme.button}`}
                  >
                    Browse category
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </div>

                <div className="pointer-events-none absolute inset-y-3 right-[-7%] flex w-[58%] items-center justify-center sm:right-0 sm:w-[55%]">
                  <ProductImage
                    src={collection.image}
                    alt=""
                    sizes="(min-width: 1024px) 42vw, 55vw"
                    className="max-h-[260px] w-full scale-[1.15] object-contain drop-shadow-[0_20px_24px_rgba(0,0,0,0.18)] sm:max-h-[300px] sm:scale-125"
                  />
                </div>

                {collection.tags.length > 0 && (
                  <ul className="absolute inset-x-0 bottom-0 z-10 flex min-h-12 flex-wrap items-center gap-x-5 gap-y-1 border-t border-current/10 bg-white/10 px-7 py-3 text-[0.6875rem] font-medium backdrop-blur-sm sm:px-10">
                    {collection.tags.slice(0, 3).map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
