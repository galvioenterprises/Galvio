import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { getAllProducts } from "@/lib/products";
import { getAllCategories } from "@/lib/catalog";
import { generalEnquiryLink } from "@/lib/whatsapp";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { ProductBrowser } from "@/components/product-browser";
import { ArrowRightIcon, WhatsAppIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "All Products",
  description: `Every ${business.primaryBrand} appliance ${site.name} stocks, in one list — air conditioners, refrigerators and more, with prices, specifications and availability.`,
  alternates: { canonical: "/products/" },
};

/**
 * Every product in one grid.
 *
 * This used to be an index of category cards, which made "Products" in
 * the navigation cost a page load to show what the dropdown already
 * showed — and half of those cards led to categories with no stock. The
 * dropdown is the shortcut to one category; this is the whole catalogue,
 * with category demoted to what it actually is here: a filter.
 *
 * It is also the strongest page on the site for search: every product on
 * one indexable page, linking to every product page.
 */
export default function ProductsPage() {
  const products = getAllProducts();
  const categories = getAllCategories();
  const empty = categories.filter((c) => c.productCount === 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "All Products",
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${site.url}/product/${product.slug}/`,
      name: product.title,
    })),
  };

  return (
    <>
      <Breadcrumbs
        size="listing"
        trail={[{ label: "Home", href: "/" }, { label: "Products" }]}
      />

      <Container size="listing" className="pb-20 pt-8">
        <p className="eyebrow text-text-muted">Catalogue</p>
        <h1 className="mt-1.5 text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]">
          All Products
        </h1>
        <p className="mt-5 max-w-[60ch] text-[0.9375rem] leading-[1.65] text-text-muted">
          Everything we stock, sold direct from the distributor. Prices include
          GST, and installation is handled by our own team. Filter by category,
          capacity or budget — or ask us and we will narrow it for you.
        </p>

        <div className="mt-[52px]">
          <ProductBrowser products={products} />
        </div>

        {empty.length > 0 && (
          <section className="mt-20 rounded-2xl border border-line bg-surface p-8 lg:p-10">
            <h2 className="text-lg font-semibold tracking-tight">
              Not listed online yet
            </h2>
            <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-text-muted">
              We supply these too — they are simply not in the online catalogue
              yet. Each page has our sizing guide, and we can quote from current
              distributor stock today.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2.5">
              {empty.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/products/${category.slug}/`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-line-strong"
                  >
                    {category.title}
                    <ArrowRightIcon className="size-3.5 text-text-muted" />
                  </Link>
                </li>
              ))}
            </ul>

            <a
              href={generalEnquiryLink()}
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <WhatsAppIcon className="size-4" />
              Ask about anything not listed
            </a>
          </section>
        )}
      </Container>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
