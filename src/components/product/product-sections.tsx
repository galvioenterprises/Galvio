import type { Product } from "@/lib/product-schema";
import { formatMonths, highlightsFor } from "@/lib/highlights";
import {
  BoltIcon,
  BoxIcon,
  GaugeIcon,
  LeafIcon,
  ShieldCheckIcon,
  SnowflakeIcon,
  TruckIcon,
  VolumeLowIcon,
  WrenchIcon,
} from "../icons";
import { PincodeCheck } from "./pincode-check";

type IconComponent = (props: { className?: string }) => React.ReactElement;

const HIGHLIGHT_ICONS: Record<string, IconComponent> = {
  snowflake: SnowflakeIcon,
  box: BoxIcon,
  bolt: BoltIcon,
  gauge: GaugeIcon,
  volume: VolumeLowIcon,
  leaf: LeafIcon,
  shield: ShieldCheckIcon,
  wrench: WrenchIcon,
};

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight">{children}</h2>;
}

export function Overview({ product }: { product: Product }) {
  const highlights = highlightsFor(product);

  return (
    <section id="overview" className="scroll-mt-20 pt-12">
      <SectionHeading>Product Overview</SectionHeading>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-card border border-line bg-surface p-6">
          <p className="text-sm leading-relaxed text-text-muted">
            {product.description}
          </p>

          {highlights.length > 0 && (
            <ul className="mt-6 grid gap-5 sm:grid-cols-2">
              {highlights.map((highlight) => {
                const Icon = HIGHLIGHT_ICONS[highlight.icon ?? "box"] ?? BoxIcon;
                return (
                  <li key={highlight.title} className="flex gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/8 text-accent">
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium leading-snug">
                        {highlight.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-text-muted">
                        {highlight.subtitle}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-card bg-ink p-7 text-text-invert">
          <div
            aria-hidden
            className="absolute -right-12 -top-12 size-56 rounded-full bg-white/[0.05] blur-2xl"
          />
          <p className="relative max-w-[16ch] text-2xl font-semibold leading-tight text-white">
            Designed for a Better Tomorrow
          </p>
          <span aria-hidden className="relative mt-4 block h-0.5 w-10 bg-accent" />
        </div>
      </div>
    </section>
  );
}

export function Specifications({ rows }: { rows: [string, string][] }) {
  // Two balanced columns, filled down then across, matching the design.
  const half = Math.ceil(rows.length / 2);
  const columns = [rows.slice(0, half), rows.slice(half)];

  return (
    <section id="specifications" className="scroll-mt-20 pt-12">
      <SectionHeading>Specifications</SectionHeading>

      <div className="mt-5 rounded-card border border-line bg-surface p-6">
        <div className="grid gap-x-12 sm:grid-cols-2">
          {columns.map((column, index) => (
            <dl key={index} className="divide-y divide-line text-sm">
              {column.map(([label, value]) => (
                <div key={label} className="flex gap-4 py-2.5">
                  <dt className="w-40 shrink-0 text-text-muted">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          ))}
        </div>

        <p className="mt-5 text-[0.6875rem] leading-relaxed text-text-faint">
          Specifications are as published by the manufacturer. Please confirm
          the exact variant with us before purchase.
        </p>
      </div>
    </section>
  );
}

export function WarrantyAndSupport({ product }: { product: Product }) {
  const cards = [
    product.warrantyMonths && product.warrantyMonths > 0 && {
      headline: formatMonths(product.warrantyMonths),
      title: "Product Warranty",
      body: "Covers manufacturing defects on the appliance from the date of purchase.",
    },
    product.compressorWarrantyMonths && {
      headline: formatMonths(product.compressorWarrantyMonths),
      title: "Compressor Warranty",
      body: "Extended manufacturer coverage on the compressor unit.",
    },
    {
      headline: "Brand",
      title: "Service Network",
      body: "Service is coordinated through the manufacturer's authorised network.",
    },
  ].filter((card): card is { headline: string; title: string; body: string } =>
    Boolean(card),
  );

  return (
    <section id="warranty" className="scroll-mt-20 pt-12">
      <SectionHeading>Warranty &amp; Support</SectionHeading>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-card border border-line bg-surface p-6">
            <p className="text-xl font-semibold text-accent">{card.headline}</p>
            <p className="mt-1 text-sm font-medium">{card.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DeliveryAndInstallation({ product }: { product: Product }) {
  return (
    <section id="delivery" className="scroll-mt-20 pt-12">
      <SectionHeading>
        Delivery{product.installationIncluded !== undefined ? " & Installation" : ""}
      </SectionHeading>

      <div className={`mt-5 grid gap-4 ${product.installationIncluded !== undefined ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <div className="rounded-card border border-line bg-surface p-6">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent/8 text-accent">
            <TruckIcon className="size-[18px]" />
          </span>
          <p className="mt-3 text-sm font-medium">Delivery</p>
          <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
            Delivery coverage, charges and the date are confirmed by the
            showroom before an order is accepted.
          </p>
        </div>

        {product.installationIncluded !== undefined && (
          <div className="rounded-card border border-line bg-surface p-6">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent/8 text-accent">
              <WrenchIcon className="size-[18px]" />
            </span>
            <p className="mt-3 text-sm font-medium">
              Installation {product.installationIncluded ? "included" : "not included"}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              {product.installationIncluded
                ? "Standard installation is included for this product. Confirm the covered work before purchase."
                : "Installation is not included in the listed price. Ask the showroom about available options."}
            </p>
          </div>
        )}

        <div className="rounded-card border border-line bg-surface p-6">
          <p className="text-sm font-medium">Check your area</p>
          <p className="mb-3 mt-1.5 text-xs text-text-muted">
            See whether we deliver to your pincode.
          </p>
          <PincodeCheck />
        </div>
      </div>
    </section>
  );
}
