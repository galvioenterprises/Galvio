"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/product-schema";
import { recommendTonnage, type RoomInput } from "@/lib/ac-size";
import { ProductCard } from "./product-card";
import { SnowflakeIcon } from "./icons";

const PRESETS = [
  { label: "Small bedroom", area: 100 },
  { label: "Bedroom", area: 140 },
  { label: "Master bedroom", area: 180 },
  { label: "Living room", area: 250 },
];

export function AcSizeCalculator({ products }: { products: Product[] }) {
  const [room, setRoom] = useState<RoomInput>({
    areaSqft: 140,
    ceiling: "standard",
    topFloor: false,
    sunny: false,
    people: 2,
    kitchen: false,
  });
  const [mode, setMode] = useState<"area" | "dims">("area");
  const [length, setLength] = useState(12);
  const [width, setWidth] = useState(12);

  const area = mode === "dims" ? Math.round(length * width) : room.areaSqft;
  const result = recommendTonnage({ ...room, areaSqft: area });
  const matches = useMemo(
    () =>
      products
        .filter((p) => p.capacity === `${result.tons} Ton`)
        .sort((a, b) => a.sellingPrice - b.sellingPrice),
    [products, result.tons],
  );

  const set = <K extends keyof RoomInput>(key: K, value: RoomInput[K]) => setRoom((r) => ({ ...r, [key]: value }));

  return (
    <div>
      <p className="eyebrow text-accent">AC size calculator</p>
      <h1 className="mt-2 text-[2rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[2.5rem]">Which AC size do I need?</h1>
      <p className="mt-2 max-w-[60ch] text-text-muted">
        Too small and the AC runs flat out without cooling the room; too big and you pay more for no benefit. Answer four
        questions and we&rsquo;ll suggest the right tonnage.
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6 rounded-2xl border border-line bg-surface p-6">
          <fieldset>
            <legend className="font-semibold">1. How big is the room?</legend>
            <div className="mt-3 flex gap-2 text-sm">
              {(["area", "dims"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`rounded-full border px-4 py-1.5 ${mode === m ? "border-accent bg-accent/5 text-accent" : "border-line-strong"}`}
                >
                  {m === "area" ? "I know the area" : "Length × width"}
                </button>
              ))}
            </div>
            {mode === "area" ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => set("areaSqft", p.area)}
                      className={`rounded-lg border px-3 py-2 text-left text-sm ${room.areaSqft === p.area ? "border-accent bg-accent/5" : "border-line"}`}
                    >
                      <span className="block font-medium">{p.label}</span>
                      <span className="text-xs text-text-muted">~{p.area} sq ft</span>
                    </button>
                  ))}
                </div>
                <label className="mt-4 block text-sm">
                  Area: <strong>{room.areaSqft} sq ft</strong>
                  <input
                    type="range"
                    min={60}
                    max={400}
                    step={10}
                    value={room.areaSqft}
                    onChange={(e) => set("areaSqft", Number(e.target.value))}
                    className="mt-2 w-full accent-accent"
                  />
                </label>
              </>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <label>
                  Length (ft)
                  <input type="number" min={4} max={40} value={length} onChange={(e) => setLength(Number(e.target.value) || 0)} className="ml-2 h-10 w-20 rounded-lg border border-line-strong px-2" />
                </label>
                <span>×</span>
                <label>
                  Width (ft)
                  <input type="number" min={4} max={40} value={width} onChange={(e) => setWidth(Number(e.target.value) || 0)} className="ml-2 h-10 w-20 rounded-lg border border-line-strong px-2" />
                </label>
                <span className="text-text-muted">= {area} sq ft</span>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="font-semibold">2. Where is it?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Toggle checked={room.topFloor} onChange={(v) => set("topFloor", v)} label="Top floor or under a roof" />
              <Toggle checked={room.sunny} onChange={(v) => set("sunny", v)} label="Gets strong afternoon sun" />
              <Toggle checked={room.ceiling === "high"} onChange={(v) => set("ceiling", v ? "high" : "standard")} label="Ceiling higher than 10 ft" />
              <Toggle checked={room.kitchen} onChange={(v) => set("kitchen", v)} label="Open kitchen in the room" />
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold">3. How many people usually use it?</legend>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={room.people === n}
                  onClick={() => set("people", n)}
                  className={`size-10 rounded-lg border text-sm ${room.people === n ? "border-accent bg-accent text-white" : "border-line-strong"}`}
                >
                  {n === 6 ? "6+" : n}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="rounded-2xl bg-ink p-6 text-white lg:sticky lg:top-[5.5rem]">
          <SnowflakeIcon className="size-7 text-sky-300" />
          <p className="mt-4 text-sm text-white/70">For {area} sq ft, we recommend</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">{result.tons} Ton</p>
          <p className="mt-2 text-xs text-white/60">About {result.btu.toLocaleString("en-IN")} BTU/h of cooling.</p>
          <p className="mt-4 text-sm text-white/80">
            Choose an <strong>inverter</strong> model if the AC runs more than 6–8 hours a day: it slows down instead of switching on and
            off, and uses noticeably less power. A higher star rating costs more up front and less every month.
          </p>
          <a href="#matches" className="mt-5 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink">
            See {matches.length} matching AC{matches.length === 1 ? "" : "s"}
          </a>
        </aside>
      </div>

      <section id="matches" className="scroll-mt-24 pt-12">
        <h2 className="text-xl font-semibold">{result.tons} Ton ACs</h2>
        {matches.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">
            We don&rsquo;t list a {result.tons} ton model right now. Message us and we&rsquo;ll source one, or see the{" "}
            <Link href="/products/air-conditioners/" className="text-accent underline">full AC range</Link>.
          </p>
        ) : (
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${checked ? "border-accent bg-accent/5" : "border-line"}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-accent" />
      {label}
    </label>
  );
}
