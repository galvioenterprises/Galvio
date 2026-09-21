import Link from "next/link";
import { site } from "@/config/site";
import { serializeJsonLd } from "@/lib/json-ld";

export type Crumb = { label: string; href?: string };

/**
 * Renders the visible trail and the matching BreadcrumbList structured
 * data from one source, so the two can never drift apart — a mismatch
 * between them is a structured-data error in Search Console.
 */
export function Breadcrumbs({
  trail,
  size = "default",
}: {
  trail: Crumb[];
  size?: "default" | "listing" | "product";
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: `${site.url}${crumb.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="border-b border-line bg-[#f7f6f4]">
      <div
        className={`mx-auto flex h-[45px] items-center px-5 sm:px-8 ${
          size === "listing"
            ? "max-w-[1624px]"
            : size === "product"
              ? "max-w-[1256px]"
              : "max-w-[1304px]"
        }`}
      >
        <ol className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-text-muted">
          {trail.map((crumb, index) => (
            <li key={crumb.label} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden className="text-text-faint">›</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-accent">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-text">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
    </nav>
  );
}
