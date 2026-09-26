"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, useSession } from "@/lib/api";
import { StarIcon } from "../icons";
import { Field, inputClass, primaryButtonClass } from "../account/form";

type Summary = {
  count: number;
  average: number | null;
  breakdown: number[];
  reviews: { id: string; rating: number; title: string; body: string; name: string; at: string }[];
};

const cache = new Map<string, Promise<Summary>>();
function loadReviews(slug: string) {
  if (!cache.has(slug)) cache.set(slug, api<Summary>(`/reviews/${slug}`).catch(() => ({ count: 0, average: null, breakdown: [0, 0, 0, 0, 0], reviews: [] })));
  return cache.get(slug)!;
}

function Stars({ value, className = "size-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} className={`${className} ${n <= Math.round(value) ? "fill-star text-star" : "text-line-strong"}`} />
      ))}
    </span>
  );
}

/** Stars and count beside the title; links down to the reviews. */
export function ReviewBadge({ slug }: { slug: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    void loadReviews(slug).then(setSummary);
  }, [slug]);
  if (!summary?.count || summary.average === null) return null;
  return (
    <a href="#reviews" className="mt-2 inline-flex items-center gap-2 text-sm">
      <Stars value={summary.average} />
      <span className="font-medium">{summary.average}</span>
      <span className="text-text-muted">({summary.count} review{summary.count === 1 ? "" : "s"})</span>
    </a>
  );
}

/**
 * Verified-buyer reviews. Only customers whose order for this product has
 * been delivered can write one, and each is checked before it appears, so
 * every review here is from someone who owns the product.
 */
export function ProductReviews({ slug }: { slug: string }) {
  const session = useSession();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [eligible, setEligible] = useState<{ canReview: boolean; reason: string | null; status?: string } | null>(null);

  useEffect(() => {
    void loadReviews(slug).then(setSummary);
  }, [slug]);
  useEffect(() => {
    if (session.status === "signed-in") void api<typeof eligible>(`/reviews/${slug}/eligibility`).then(setEligible).catch(() => undefined);
  }, [session.status, slug]);

  return (
    <section id="reviews" className="scroll-mt-20 pt-12">
      <h2 className="text-[1.375rem] font-semibold tracking-[-0.015em]">Ratings &amp; reviews</h2>
      <div className="mt-5 grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="rounded-card border border-line bg-surface p-6">
          {summary?.count ? (
            <>
              <p className="text-4xl font-semibold">{summary.average}</p>
              <Stars value={summary.average ?? 0} className="size-5" />
              <p className="mt-1 text-sm text-text-muted">{summary.count} verified review{summary.count === 1 ? "" : "s"}</p>
              <ul className="mt-4 space-y-1.5 text-xs">
                {summary.breakdown.map((n, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-6">{5 - i}★</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
                      <span className="block h-full bg-star" style={{ width: `${summary.count ? (n / summary.count) * 100 : 0}%` }} />
                    </span>
                    <span className="w-6 text-right text-text-muted">{n}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-text-muted">No reviews yet. Reviews come only from customers whose order has been delivered.</p>
          )}
          <div className="mt-5 border-t border-line pt-4 text-sm">
            {session.status !== "signed-in" ? (
              <p className="text-text-muted">
                Bought this from us?{" "}
                <Link href="/account/" className="font-medium text-accent">Sign in</Link> to review it.
              </p>
            ) : eligible?.canReview ? (
              <p className="font-medium text-emerald-700">You can review this product below.</p>
            ) : eligible?.reason === "reviewed" ? (
              <p className="text-text-muted">{eligible.status === "pending" ? "Thanks! Your review is being checked." : "You've reviewed this product."}</p>
            ) : (
              <p className="text-text-muted">You can review this once your order is delivered.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {eligible?.canReview && <ReviewForm slug={slug} onDone={() => setEligible({ canReview: false, reason: "reviewed", status: "pending" })} />}
          {summary?.reviews.map((r) => (
            <article key={r.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <Stars value={r.rating} />
                {r.title && <p className="font-semibold">{r.title}</p>}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{r.body}</p>
              <p className="mt-3 text-xs text-text-muted">
                {r.name} · <span className="text-emerald-700">Verified buyer</span> ·{" "}
                {new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4 rounded-card border border-accent/20 bg-accent/5 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!rating) return setError("Choose a star rating.");
        setBusy(true);
        setError(null);
        try {
          await api("/reviews", { body: { slug, rating, title, body } });
          onDone();
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <p className="font-semibold">Write a review</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? "" : "s"}`} onClick={() => setRating(n)}>
            <StarIcon className={`size-7 ${n <= rating ? "fill-star text-star" : "text-line-strong"}`} />
          </button>
        ))}
      </div>
      <Field label="Headline (optional)">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className={inputClass} />
      </Field>
      <Field label="Your review" error={error}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="How is the cooling, noise, installation, power use?"
          className="w-full rounded-lg border border-line-strong bg-surface p-3 text-sm outline-none focus:border-accent"
        />
      </Field>
      <button type="submit" disabled={busy} className={`${primaryButtonClass} sm:w-auto`}>
        {busy ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
