"use client";

import { useState } from "react";
import { site } from "@/config/site";
import { ArrowRightIcon, CheckIcon, MailIcon, WhatsAppIcon } from "./icons";

export const BUYER_TYPES = [
  "Builder or developer",
  "Office or corporate",
  "Hotel or hospitality",
  "Hospital or clinic",
  "School or institution",
  "Dealer or reseller",
  "Other",
] as const;

const TIMELINES = ["Within 2 weeks", "Within a month", "1–3 months", "Just exploring"];

type Form = {
  name: string;
  phone: string;
  email: string;
  organisation: string;
  buyer: string;
  category: string;
  requirement: string;
  location: string;
  timeline: string;
};

const EMPTY: Form = {
  name: "",
  phone: "",
  email: "",
  organisation: "",
  buyer: "",
  category: "",
  requirement: "",
  location: "",
  timeline: "",
};

/**
 * Bulk enquiry.
 *
 * There is no server, so the form composes the enquiry and hands it to
 * WhatsApp when a business number is configured, and to email otherwise.
 * After sending it says exactly that — the message opened in another app —
 * rather than claiming a submission the site has no way to confirm.
 */
export function BulkEnquiryForm({
  categories,
  compact = false,
}: {
  categories: string[];
  compact?: boolean;
}) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [sent, setSent] = useState<null | "whatsapp" | "email">(null);

  const set = (key: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const message = () =>
    [
      `Bulk enquiry — ${site.name}`,
      "",
      `Name: ${form.name}`,
      `Phone: +91 ${form.phone}`,
      form.email ? `Email: ${form.email}` : null,
      form.organisation ? `Organisation: ${form.organisation}` : null,
      form.buyer ? `Buyer type: ${form.buyer}` : null,
      form.category ? `Category: ${form.category}` : null,
      `Delivery location: ${form.location}`,
      form.timeline ? `Needed: ${form.timeline}` : null,
      "",
      "Requirement:",
      form.requirement,
    ]
      .filter((l): l is string => l !== null)
      .join("\n");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = message();

    if (site.contact.whatsapp) {
      window.open(
        `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(text)}`,
        "_blank",
        "noopener",
      );
      setSent("whatsapp");
      return;
    }

    const subject = encodeURIComponent(
      `Bulk enquiry — ${form.organisation || form.name}${form.category ? ` · ${form.category}` : ""}`,
    );
    window.location.href = `mailto:${site.contact.email}?subject=${subject}&body=${encodeURIComponent(text)}`;
    setSent("email");
  }

  const field =
    "mt-1.5 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition placeholder:text-text-faint focus:border-accent focus:ring-2 focus:ring-accent/15";
  const label = "block text-[0.8125rem] font-medium text-text";

  if (sent) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_12px_40px_rgba(17,19,24,0.08)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckIcon className="size-6" />
        </span>
        <p className="mt-4 text-lg font-semibold">Your enquiry is ready to send</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-muted">
          {sent === "whatsapp"
            ? "It opened in WhatsApp with everything filled in. Press send there and we'll reply with a quote."
            : "It opened in your email app with everything filled in. Press send there and we'll reply with a quote."}
        </p>
        <p className="mt-4 text-xs text-text-faint">
          Nothing opened? Write to{" "}
          <a href={`mailto:${site.contact.email}`} className="text-accent hover:underline">
            {site.contact.email}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="mt-5 text-sm font-medium text-accent hover:underline"
        >
          Edit the enquiry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-surface p-6 shadow-[0_12px_40px_rgba(17,19,24,0.08)] sm:p-7"
    >
      <p className="text-lg font-semibold tracking-tight">Get a bulk quote</p>
      <p className="mt-1 text-[0.8125rem] text-text-muted">
        Takes a minute. We reply with model-wise pricing.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Full name
          <input required autoComplete="name" value={form.name} onChange={set("name")} className={field} />
        </label>
        <label className={label}>
          Mobile number
          <div className="mt-1.5 flex h-11 overflow-hidden rounded-lg border border-line focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15">
            <span className="flex items-center border-r border-line bg-canvas px-3 text-sm text-text-muted">
              +91
            </span>
            <input
              required
              inputMode="numeric"
              autoComplete="tel-national"
              pattern="[6-9][0-9]{9}"
              title="A 10-digit Indian mobile number"
              maxLength={10}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))}
              className="min-w-0 flex-1 bg-surface px-3 text-sm outline-none"
            />
          </div>
        </label>

        {!compact && (
          <>
            <label className={label}>
              Work email <span className="font-normal text-text-faint">(optional)</span>
              <input type="email" autoComplete="email" value={form.email} onChange={set("email")} className={field} />
            </label>
            <label className={label}>
              Organisation <span className="font-normal text-text-faint">(optional)</span>
              <input autoComplete="organization" value={form.organisation} onChange={set("organisation")} className={field} />
            </label>
          </>
        )}

        <label className={label}>
          You are a
          <select required value={form.buyer} onChange={set("buyer")} className={field}>
            <option value="" disabled>
              Select
            </option>
            {BUYER_TYPES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Product category
          <select value={form.category} onChange={set("category")} className={field}>
            <option value="">Several / not sure</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className={`${label} sm:col-span-2`}>
          What do you need?
          <textarea
            required
            rows={3}
            value={form.requirement}
            onChange={set("requirement")}
            placeholder="e.g. 24 × 1.5 ton inverter split ACs for a new office, installation included"
            className={`${field} h-auto resize-y py-2.5 leading-relaxed`}
          />
        </label>

        <label className={label}>
          Delivery city or pincode
          <input required autoComplete="postal-code" value={form.location} onChange={set("location")} className={field} />
        </label>
        <label className={label}>
          Needed by
          <select value={form.timeline} onChange={set("timeline")} className={field}>
            <option value="">Select</option>
            {TIMELINES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        {site.contact.whatsapp ? <WhatsAppIcon className="size-4" /> : <MailIcon className="size-4" />}
        Request quote
        <ArrowRightIcon className="size-4" />
      </button>
      <p className="mt-3 text-center text-[0.6875rem] text-text-faint">
        We use these details only to prepare your quote.
      </p>
    </form>
  );
}
