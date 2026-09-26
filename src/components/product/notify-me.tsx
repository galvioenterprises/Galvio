"use client";

import { useState } from "react";
import { api, useSession } from "@/lib/api";

/**
 * "Tell me when the price drops" / "Notify me when it's back". Signed-in
 * customers with an email get it in one tap; everyone else types an email.
 */
export function NotifyMe({ slug, kind, className = "" }: { slug: string; kind: "price" | "stock"; className?: string }) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const known = session.status === "signed-in" && session.user.email;
  const label = kind === "price" ? "Get a price-drop alert" : "Notify me when it's back";

  async function submit(withEmail?: string) {
    setError(null);
    try {
      const r = await api<{ email: string }>("/alerts", { body: { slug, kind, email: withEmail || undefined } });
      setDone(r.email);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (done) {
    return <p className={`text-[0.8125rem] text-emerald-700 ${className}`}>We&rsquo;ll email {done} {kind === "price" ? "if the price drops" : "when it's back"}.</p>;
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => (known ? void submit() : setOpen(true))}
        className={`text-[0.8125rem] font-medium text-accent hover:underline ${className}`}
      >
        {kind === "price" ? "🔔 " : ""}
        {label}
      </button>
    );
  }
  return (
    <form
      className={`flex flex-wrap items-center gap-2 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        void submit(email);
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Email for the alert"
        className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong px-3 text-sm outline-none focus:border-accent"
      />
      <button type="submit" className="h-9 rounded-lg bg-accent px-4 text-sm font-semibold text-white">Notify me</button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  );
}
