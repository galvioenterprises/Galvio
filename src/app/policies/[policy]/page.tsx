import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { policies, getPolicyBySlug } from "@/config/policies";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Container } from "@/components/container";
import { PageHeader, Prose } from "@/components/page-header";

type Params = { policy: string };

export function generateStaticParams(): Params[] {
  return policies.map((p) => ({ policy: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { policy: slug } = await params;
  const policy = getPolicyBySlug(slug);
  if (!policy) return {};

  return {
    title: policy.metaTitle,
    description: policy.summary,
    alternates: { canonical: `/policies/${policy.slug}/` },
  };
}

export default async function PolicyPage({ params }: { params: Promise<Params> }) {
  const { policy: slug } = await params;
  const policy = getPolicyBySlug(slug);
  if (!policy) notFound();

  const others = policies.filter((p) => p.slug !== policy.slug);

  return (
    <>
      <Breadcrumbs
        trail={[{ label: "Home", href: "/" }, { label: policy.title }]}
      />

      <PageHeader
        eyebrow="Customer service"
        title={policy.title}
        intro={policy.summary}
      />

      <Container className="pb-24">
        <p className="mb-10 text-xs text-text-faint">
          Last updated {business.policiesUpdated}
        </p>

        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
          <Prose>
            {policy.blocks.map((block, index) => {
              if (block.type === "heading") {
                return <h2 key={index}>{block.body}</h2>;
              }
              if (block.type === "list") {
                return (
                  <ul key={index}>
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={index}>{block.body}</p>;
            })}
          </Prose>

          <nav
            aria-label="Other policies"
            className="rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-[5.5rem]"
          >
            <p className="text-sm font-semibold">Other policies</p>
            <ul className="mt-4 space-y-3 text-sm">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/policies/${other.slug}/`}
                    className="text-text-muted transition-colors hover:text-accent"
                  >
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-text-muted">
              Something here unclear? Ask us — we would rather explain it before
              you buy than argue about it afterwards.
            </p>
            <Link
              href="/contact/"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              Contact {site.shortName}
            </Link>
          </nav>
        </div>
      </Container>
    </>
  );
}
