import Link from "next/link";
import type { Order } from "@/lib/api";

/** Order lines are products or protection plans ("plan:<id>:<product>"). */
export function ItemTitle({ slug, title, className = "" }: { slug: string; title: string; className?: string }) {
  if (slug.startsWith("plan:")) return <span className={className}>{title}</span>;
  return (
    <Link href={`/product/${slug}/`} className={`${className} hover:text-accent`}>
      {title}
    </Link>
  );
}

export function ExchangeNote({ order }: { order: Order }) {
  const x = order.exchange;
  if (!x) return null;
  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5 text-sm">
      <p className="font-semibold">Exchange request</p>
      <p className="mt-1 text-text-muted">
        {x.appliance}
        {x.brand ? `, ${x.brand}` : ""}
        {x.ageYears !== undefined ? `, about ${x.ageYears} year${x.ageYears === 1 ? "" : "s"} old` : ""}
        {x.working === false ? ", not working" : ""}
        {x.notes ? ` · ${x.notes}` : ""}
      </p>
      <p className="mt-1 text-xs text-text-muted">We quote its exchange value on our confirmation call.</p>
    </div>
  );
}
