import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BulkEnquiryForm } from "@/components/bulk-enquiry-form";
import { Container } from "@/components/container";
import { categories } from "@/config/categories";

export const metadata: Metadata = {
  title: "Bulk appliance orders",
  description:
    "Request a model-by-model quote for bulk Voltas and Voltas Beko appliance supply from Galvio Enterprises.",
  alternates: { canonical: "/bulk-orders/" },
};

export default function BulkOrdersPage() {
  return (
    <>
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Bulk Orders" }]} />
      <Container className="pb-24 pt-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(560px,1.2fr)] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <p className="eyebrow text-accent">For businesses &amp; projects</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              A quote built around the actual requirement
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-text-muted">
              Share the quantity, delivery pincode and the capacities you need.
              We will confirm current models, stock and commercial terms before
              issuing a quote—nothing is substituted without your approval.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              {[
                "Model-by-model pricing after stock confirmation",
                "One enquiry for phased or multi-location delivery",
                "Every quoted specification is checked against manufacturer material",
              ].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                    {index + 1}
                  </span>
                  <span className="pt-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <BulkEnquiryForm categories={categories.map((category) => category.title)} />
        </div>
      </Container>
    </>
  );
}
