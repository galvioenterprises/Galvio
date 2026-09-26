import Link from "next/link";
import type { Product } from "@/lib/product-schema";
import { business } from "@/config/business";
import { formatPrice } from "@/lib/format";
import { formatMonths, highlightsFor } from "@/lib/highlights";
import {
  BadgeIcon,
  CheckIcon,
  BoltIcon,
  BoxIcon,
  CreditCardIcon,
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

        <div className="relative min-h-[220px] overflow-hidden rounded-card bg-ink p-7 text-text-invert">
          <div
            aria-hidden
            className="absolute -right-12 -top-12 size-56 rounded-full bg-white/[0.05] blur-2xl"
          />
          <p className="relative eyebrow text-[#8eb2ff]">Order with confidence</p>
          <p className="relative mt-3 text-xl font-semibold leading-tight text-white">
            Supplied through an authorised distributor
          </p>
          <ul className="relative mt-6 space-y-3 text-xs text-text-invert-muted">
            {[
              { Icon: BadgeIcon, label: "Genuine manufacturer product" },
              { Icon: TruckIcon, label: "Distributor-managed pan-India delivery" },
              { Icon: CreditCardIcon, label: "Cash on Delivery available" },
            ].map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-[#8eb2ff]">
                  <Icon className="size-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
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
  const isAc = product.category === "Air Conditioner";
  return (
    <section id="delivery" className="scroll-mt-20 pt-12">
      <SectionHeading>Delivery{isAc || product.installationIncluded !== undefined ? " & Installation" : ""}</SectionHeading>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-6">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent/8 text-accent">
            <TruckIcon className="size-[18px]" />
          </span>
          <p className="mt-3 text-sm font-medium">Delivery</p>
          <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
            Delivered across India by the distributor. We call to confirm stock and the delivery date before dispatch.
          </p>
          <div className="mt-4">
            <PincodeCheck />
          </div>
        </div>

        {!isAc && product.installationIncluded !== undefined && (
          <div className="rounded-card border border-line bg-surface p-6">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent/8 text-accent">
              <WrenchIcon className="size-[18px]" />
            </span>
            <p className="mt-3 text-sm font-medium">Installation {product.installationIncluded ? "included" : "not included"}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
              {product.installationIncluded
                ? "Standard installation is included for this product."
                : "Installation is not included in the listed price. Contact support about available options."}
            </p>
          </div>
        )}

        {isAc && <AcInstallation />}
      </div>
    </section>
  );
}

/**
 * What AC installation covers and what costs extra, in Voltas's terms,
 * before the customer asks. Croma and Voltas publish this; leaving it out
 * is one of the commonest reasons AC carts are abandoned.
 */
function AcInstallation() {
  const { standardCharge, includes, extras } = business.installation;
  return (
    <div className="rounded-card border border-line bg-surface p-6 lg:row-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent/8 text-accent">
            <WrenchIcon className="size-[18px]" />
          </span>
          <p className="mt-3 text-sm font-medium">Installation by Voltas-authorised technicians</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {standardCharge === null ? "Charge confirmed on call" : standardCharge === 0 ? "Standard installation free" : `Standard ${formatPrice(standardCharge)}`}
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
        We book installation for the day of delivery or the next working day. The technician tells you about any extra work and
        its charge before starting; nothing extra is done without your OK.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Standard installation includes</p>
          <ul className="mt-2 space-y-1.5 text-xs text-text">
            {includes.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">May cost extra</p>
          <ul className="mt-2 space-y-1.5 text-xs text-text-muted">
            {extras.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-text-faint" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Not sure which size you need?{" "}
        <Link href="/ac-size-calculator/" className="font-medium text-accent hover:underline">
          Use the AC size calculator
        </Link>
      </p>
    </div>
  );
}
