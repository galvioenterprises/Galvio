"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export function SimulatedPayment() {
  const id = useSearchParams().get("order") ?? "";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function finish(outcome: "paid" | "failed") {
    try {
      await api("/dev/simulate-payment", { body: { id, outcome } });
      router.push(`/checkout/complete/?order=${id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border-2 border-dashed border-scarcity-text/40 bg-surface p-8 text-center">
      <p className="eyebrow text-scarcity-text">Development mode</p>
      <h1 className="mt-3 text-xl font-semibold">Simulated payment</h1>
      <p className="mt-2 text-sm text-text-muted">
        Cashfree keys are not configured, so this page stands in for the payment screen. Order <span className="font-mono">{id}</span>.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={() => finish("paid")} className="h-11 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white">
          Payment succeeds
        </button>
        <button type="button" onClick={() => finish("failed")} className="h-11 rounded-xl border border-line-strong px-6 text-sm font-semibold">
          Payment fails
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
