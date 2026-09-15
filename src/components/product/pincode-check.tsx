"use client";

import { useState } from "react";
import { site } from "@/config/site";
import { CheckIcon } from "../icons";

type Result = { ok: boolean; pincode: string } | { error: string } | null;

/**
 * Delivery availability check.
 *
 * Phase 1 has no logistics API, so this answers from the serviceable
 * pincode list in site config. That is a real answer from real data. The
 * alternative — a box that congratulates every pincode — is worse than
 * having no box at all, because the customer plans around it.
 */
export function PincodeCheck() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<Result>(null);

  const configured = site.serviceablePincodes.length > 0;

  function check(event: React.FormEvent) {
    event.preventDefault();
    const value = pincode.trim();

    if (!/^\d{6}$/.test(value)) {
      setResult({ error: "Enter a 6-digit pincode." });
      return;
    }
    setResult({ ok: site.serviceablePincodes.includes(value), pincode: value });
  }

  if (!configured) {
    // Until the delivery area is configured, say so plainly and route the
    // question to a human rather than render a control that cannot work.
    return (
      <p className="text-xs leading-relaxed text-text-muted">
        Delivery and installation are available across the city and surrounding
        areas. Message us with your pincode and we will confirm the timeline for
        your address.
      </p>
    );
  }

  return (
    <div>
      <form onSubmit={check} className="flex gap-2">
        <label className="sr-only" htmlFor="pincode">
          Pincode
        </label>
        <input
          id="pincode"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, ""));
            setResult(null);
          }}
          placeholder="Enter pincode"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Check
        </button>
      </form>

      {result && "error" in result && (
        <p className="mt-2 text-xs text-text-muted">{result.error}</p>
      )}

      {result && "ok" in result && (
        <div
          className={`mt-3 rounded-lg px-3 py-2.5 text-xs leading-relaxed ${
            result.ok ? "bg-emerald-50 text-emerald-900" : "bg-canvas text-text-muted"
          }`}
        >
          {result.ok ? (
            <>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckIcon className="size-3.5" />
                Delivery available in {result.pincode}
              </span>
              <span className="mt-1 block">
                Installation support available. We will confirm the exact date
                when you enquire.
              </span>
            </>
          ) : (
            <>
              We do not deliver to {result.pincode} yet. Message us — we can
              often arrange it, and the showroom is open for collection.
            </>
          )}
        </div>
      )}
    </div>
  );
}
