import Link from "next/link";
import { ArrowRightIcon } from "../icons";
import { ProductImage } from "../product-image";
import { Container } from "../container";
import type { HomeCollection } from "./types";

const THEMES = [
  {
    card: "bg-[radial-gradient(70%_90%_at_78%_55%,#1d4ed866_0%,transparent_70%),linear-gradient(125deg,#020817_0%,#0b2552_100%)]",
    accent: "#93c5fd",
    tagline: "Stay cool, spend less",
  },
  {
    card: "bg-[radial-gradient(70%_90%_at_78%_55%,#0d948866_0%,transparent_70%),linear-gradient(125deg,#021413_0%,#0b3b3a_100%)]",
    accent: "#5eead4",
    tagline: "Big air, small bills",
  },
] as const;

/** The two large category banners under the hero. */
export function CategoryPromos({ collections }: { collections: HomeCollection[] }) {
  if (collections.length === 0) return null;

  return (
    <section aria-label="Featured product categories" className="pt-16 sm:pt-20">
      <Container size="listing">
        <div className="grid gap-5 lg:grid-cols-2">
          {collections.slice(0, 2).map((collection, index) => {
            const theme = THEMES[index % THEMES.length];
            return (
              <Link
                key={collection.slug}
                href={`/products/${collection.slug}/`}
                className={`group relative isolate flex min-h-[340px] overflow-hidden rounded-3xl p-8 text-white shadow-[0_24px_60px_-30px_rgba(2,8,23,0.8)] transition-transform duration-300 hover:-translate-y-1 sm:min-h-[380px] sm:p-10 ${theme.card}`}
              >
                <div className="relative z-10 flex max-w-[52%] flex-col">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accent }}>
                    {theme.tagline}
                  </p>
                  <h2 className="mt-3 text-[1.875rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[2.5rem]">
                    {collection.title}
                  </h2>
                  <p className="mt-3 text-sm text-white/65">
                    <strong className="text-white">{collection.productCount}</strong>{" "}
                    {collection.productCount === 1 ? "model" : "models"} to compare
                  </p>
                  {collection.tags.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {collection.tags.slice(0, 3).map((tag) => (
                        <li key={tag} className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/80">
                          {tag}
                        </li>
                      ))}
                    </ul>
                  )}
                  <span className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-transform group-hover:translate-x-1">
                    Shop {collection.title.toLowerCase()}
                    <ArrowRightIcon className="size-4" />
                  </span>
                </div>

                <span aria-hidden className="absolute bottom-8 right-[8%] h-8 w-[40%] rounded-[50%] bg-black/50 blur-2xl" />
                <div className="pointer-events-none absolute inset-y-6 right-[3%] flex w-[50%] items-center justify-center [&>picture]:contents">
                  <ProductImage
                    src={collection.image}
                    alt=""
                    sizes="(min-width: 1024px) 34vw, 55vw"
                    className="max-h-full w-full object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,0.45)] transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
