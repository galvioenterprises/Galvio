"use client";

import { Fragment, useMemo, useState } from "react";
import type { Facet, FacetId, Selection } from "@/lib/facets";
import { formatPriceShort } from "@/lib/format";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "./icons";

type Props = {
  facets: Facet[];
  selection: Selection;
  onToggle: (id: FacetId, value: string) => void;
  price: [number, number];
  priceLimits: [number, number];
  onPriceChange: (range: [number, number]) => void;
  onClear: () => void;
  activeCount: number;
};

/** Brand lists get long enough that a search box is faster than scrolling. */
const SEARCHABLE_FACETS: FacetId[] = ["brand"];

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-line py-4 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-sm font-medium"
      >
        {title}
        <ChevronDownIcon
          className={`size-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Checkbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-line-strong bg-surface text-white peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40"
      >
        {checked && <CheckIcon className="size-3" />}
      </span>
      <span className="flex-1 text-text">{label}</span>
      <span className="text-xs text-text-faint">{count}</span>
    </label>
  );
}

function FacetSection({
  facet,
  selection,
  onToggle,
}: Pick<Props, "selection" | "onToggle"> & { facet: Facet }) {
  const [query, setQuery] = useState("");
  const searchable = SEARCHABLE_FACETS.includes(facet.id) && facet.options.length > 6;

  const options = useMemo(() => {
    if (!searchable || query.trim() === "") return facet.options;
    const q = query.trim().toLowerCase();
    return facet.options.filter((o) => o.value.toLowerCase().includes(q));
  }, [facet.options, query, searchable]);

  return (
    <Section title={facet.label}>
      {searchable && (
        <div className="relative mb-2">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${facet.label.toLowerCase()}`}
            aria-label={`Search ${facet.label}`}
            className="h-8 w-full rounded-lg border border-line bg-surface pl-8 pr-2 text-xs focus:border-accent focus:outline-none"
          />
        </div>
      )}
      <div className="max-h-56 space-y-0.5 overflow-y-auto">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.value}
            count={option.count}
            checked={selection[facet.id].includes(option.value)}
            onChange={() => onToggle(facet.id, option.value)}
          />
        ))}
        {options.length === 0 && (
          <p className="py-1 text-xs text-text-faint">No matches</p>
        )}
      </div>
    </Section>
  );
}

function PriceSection({
  price,
  priceLimits,
  onPriceChange,
}: Pick<Props, "price" | "priceLimits" | "onPriceChange">) {
  const [min, max] = price;
  const [limitMin, limitMax] = priceLimits;
  const span = Math.max(limitMax - limitMin, 1);

  const boundaries = [...new Set([limitMin, 20000, 40000, 60000, limitMax])]
    .filter((value) => value >= limitMin && value <= limitMax)
    .sort((left, right) => left - right);
  const quickRanges: [number, number][] = boundaries
    .slice(0, -1)
    .map((from, index) => [from, boundaries[index + 1]] as [number, number])
    .filter(([from, to]) => from < to);

  const left = ((min - limitMin) / span) * 100;
  const right = ((max - limitMin) / span) * 100;

  return (
    <Section title="Price Range">
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent"
          style={{ left: `${left}%`, right: `${100 - right}%` }}
        />
        <input
          type="range"
          min={limitMin}
          max={limitMax}
          step={1000}
          value={min}
          aria-label="Minimum price"
          onChange={(e) =>
            onPriceChange([Math.min(Number(e.target.value), max - 1000), max])
          }
          className="range-thumb absolute inset-x-0 top-0 h-4 w-full"
        />
        <input
          type="range"
          min={limitMin}
          max={limitMax}
          step={1000}
          value={max}
          aria-label="Maximum price"
          onChange={(e) =>
            onPriceChange([min, Math.max(Number(e.target.value), min + 1000)])
          }
          className="range-thumb absolute inset-x-0 top-0 h-4 w-full"
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-text-muted">
        <span>{formatPriceShort(min)}</span>
        <span>{formatPriceShort(max)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {quickRanges.map(([from, to]) => {
          const active = min === from && max === to;
          return (
            <button
              key={`${from}-${to}`}
              type="button"
              onClick={() => onPriceChange([from, to])}
              className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                active
                  ? "border-accent bg-accent text-white"
                  : "border-line text-text-muted hover:border-line-strong"
              }`}
            >
              {formatPriceShort(from)} – {formatPriceShort(to)}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

export function ProductFilters({
  facets,
  selection,
  onToggle,
  price,
  priceLimits,
  onPriceChange,
  onClear,
  activeCount,
}: Props) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-2">
      <div className="flex items-center justify-between border-b border-line py-3">
        <h2 className="text-sm font-semibold">Filters</h2>
        <button
          type="button"
          onClick={onClear}
          disabled={activeCount === 0}
          className="text-xs font-medium text-accent transition-colors disabled:opacity-40"
        >
          Clear All
        </button>
      </div>

      {/* The design puts Price Range second, directly under the first
          facet group, because price is the filter most people reach for. */}
      {facets.map((facet, index) => (
        <Fragment key={facet.id}>
          <FacetSection facet={facet} selection={selection} onToggle={onToggle} />
          {index === 0 && (
            <PriceSection
              price={price}
              priceLimits={priceLimits}
              onPriceChange={onPriceChange}
            />
          )}
        </Fragment>
      ))}

      {facets.length === 0 && (
        <PriceSection
          price={price}
          priceLimits={priceLimits}
          onPriceChange={onPriceChange}
        />
      )}
    </div>
  );
}
