"use client";

import { useId, useRef, useState } from "react";
import { site } from "@/config/site";
import { business } from "@/config/business";
import { api } from "@/lib/api";
import { trackCommerceEvent } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { CheckIcon } from "../icons";

type Lookup = { found: boolean; city?: string; state?: string; areas?: string[] };
type Result =
  | { kind: "available"; pincode: string; city?: string; state?: string }
  | { kind: "unverified"; pincode: string; message: string }
  | { kind: "error"; message: string }
  | null;

/**
 * Delivery availability check.
 *
 * Nationwide delivery is a confirmed operating fact. The pincode input still
 * validates the destination so the resulting message can be specific without
 * inventing a timeline or shipping charge.
 */
export function PincodeCheck() {
  const inputId = useId();
  const resultId = useId();
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [checking, setChecking] = useState(false);
  const requestIdRef = useRef(0);

  const configured = site.serviceablePincodes.length > 0;

  async function check(event: React.FormEvent) {
    event.preventDefault();
    const value = pincode.trim();

    if (!/^[1-9]\d{5}$/.test(value)) {
      trackCommerceEvent("pincode_check", { status: "invalid" });
      setResult({ kind: "error", message: "Enter a valid 6-digit Indian pincode." });
      return;
    }

    const requestId = ++requestIdRef.current;
    setChecking(true);
    setResult(null);
    try {
      const lookup = await api<Lookup>(`/pincode/${value}`);
      if (requestId !== requestIdRef.current) return;
      if (!lookup.found) {
        trackCommerceEvent("pincode_check", { status: "not_recognized" });
        setResult({
          kind: "unverified",
          pincode: value,
          message: "We could not verify this PIN code. Our team will confirm delivery before dispatch.",
        });
        return;
      }

      const serviceable =
        business.nationwideDelivery || site.serviceablePincodes.includes(value);
      if (!serviceable) {
        trackCommerceEvent("pincode_check", { status: "needs_confirmation" });
        setResult({
          kind: "unverified",
          pincode: value,
          message: "This destination is not in the published delivery list. Our team will confirm available options.",
        });
        return;
      }

      try {
        window.localStorage.setItem("galvio.delivery-pincode.v1", value);
      } catch {
        // Storage can be unavailable in private or restricted browsers. The
        // successful delivery result should still be shown for this visit.
      }
      trackCommerceEvent("pincode_check", { status: "available" });
      setResult({
        kind: "available",
        pincode: value,
        city: lookup.city,
        state: lookup.state,
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      trackCommerceEvent("pincode_check", { status: "lookup_error" });
      setResult({
        kind: "unverified",
        pincode: value,
        message: "We could not check this PIN code right now. Our team will confirm delivery before dispatch.",
      });
    } finally {
      if (requestId === requestIdRef.current) setChecking(false);
    }
  }

  if (!configured && !business.nationwideDelivery) {
    // Until the delivery area is configured, say so plainly and route the
    // question to a human rather than render a control that cannot work.
    return (
      <p className="text-xs leading-relaxed text-text-muted">
        Delivery coverage has not been published yet. Share your pincode with
        Galvio support and the distributor will confirm whether delivery is
        available.
      </p>
    );
  }

  return (
    <div>
      <form onSubmit={check} className="flex gap-2">
        <label className="sr-only" htmlFor={inputId}>
          Pincode
        </label>
        <input
          id={inputId}
          aria-invalid={result?.kind === "error"}
          aria-describedby={result ? resultId : undefined}
          inputMode="numeric"
          autoComplete="postal-code"
          name="postal-code"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            requestIdRef.current += 1;
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setChecking(false);
            setResult(null);
          }}
          placeholder="Enter pincode"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={checking}
          className="h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-65"
        >
          {checking ? "Checking…" : "Check"}
        </button>
      </form>

      {result?.kind === "error" && (
        <p id={resultId} role="alert" className="mt-2 text-xs text-red-600">
          {result.message}
        </p>
      )}

      {result && result.kind !== "error" && (
        <div
          id={resultId}
          role="status"
          className={`mt-3 rounded-lg px-3 py-2.5 text-xs leading-relaxed ${
            result.kind === "available"
              ? "bg-emerald-50 text-emerald-900"
              : "bg-canvas text-text-muted"
          }`}
        >
          {result.kind === "available" ? (
            <>
              <span className="flex items-center gap-1.5 font-medium">
                <CheckIcon className="size-3.5" />
                Delivery available to {[result.city, result.state].filter(Boolean).join(", ") || result.pincode}
              </span>
              <span className="mt-1 block">
                Usually delivered in {business.deliveryDaysMin}–{business.deliveryDaysMax} days
                after order confirmation.{" "}
                {business.deliveryFee === 0
                  ? "Free delivery."
                  : `Delivery charge: ${formatPrice(business.deliveryFee)}.`}
              </span>
            </>
          ) : (
            result.message
          )}
        </div>
      )}
    </div>
  );
}
