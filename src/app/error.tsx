"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Keep the digest in browser logs so it can be matched with Cloudflare
    // logs now and an error-reporting service once its DSN is supplied.
    console.error("[storefront]", error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-5 py-20 text-center">
      <p className="eyebrow text-accent">Something went wrong</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        We couldn&rsquo;t load this page
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
        Your cart is still stored on this device. Try the page again, or return
        to the catalogue and continue shopping.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-11 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Try again
        </button>
        <Link
          href="/products/"
          className="inline-flex min-h-11 items-center rounded-xl border border-line-strong bg-surface px-6 text-sm font-semibold hover:border-accent hover:text-accent"
        >
          Browse products
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-xs text-text-faint">
          Reference {error.digest}
        </p>
      )}
    </section>
  );
}
