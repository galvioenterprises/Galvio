"use client";

import { useState } from "react";
import { site } from "@/config/site";
import { ArrowRightIcon, MailIcon, WhatsAppIcon } from "./icons";

type FormState = {
  name: string;
  business: string;
  phone: string;
  email: string;
  pincode: string;
  category: string;
  quantity: string;
  requirements: string;
};

const EMPTY: FormState = {
  name: "",
  business: "",
  phone: "",
  email: "",
  pincode: "",
  category: "",
  quantity: "",
  requirements: "",
};

export function BulkEnquiryForm({ categories }: { categories: string[] }) {
  const [form, setForm] = useState(EMPTY);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function message() {
    return [
      "Bulk product enquiry",
      "",
      `Name: ${form.name}`,
      `Business: ${form.business || "Not provided"}`,
      `Phone: ${form.phone}`,
      `Email: ${form.email || "Not provided"}`,
      `Delivery pincode: ${form.pincode}`,
      `Category: ${form.category}`,
      `Approximate quantity: ${form.quantity}`,
      "",
      "Requirements:",
      form.requirements,
    ].join("\n");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = encodeURIComponent(message());
    const subject = encodeURIComponent(`Bulk enquiry — ${form.category}`);
    window.location.href = `mailto:${site.contact.email}?subject=${subject}&body=${body}`;
  }

  const fieldClass =
    "mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition focus:border-accent";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Your name <span className="text-accent">*</span>
          <input
            required
            autoComplete="name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Business or organisation
          <input
            autoComplete="organization"
            value={form.business}
            onChange={(event) => update("business", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Phone <span className="text-accent">*</span>
          <input
            required
            inputMode="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Email
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Delivery pincode <span className="text-accent">*</span>
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="postal-code"
            value={form.pincode}
            onChange={(event) => update("pincode", event.target.value.replace(/\D/g, ""))}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium">
          Product category <span className="text-accent">*</span>
          <select
            required
            value={form.category}
            onChange={(event) => update("category", event.target.value)}
            className={fieldClass}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Approximate quantity <span className="text-accent">*</span>
          <input
            required
            type="number"
            min={2}
            step={1}
            value={form.quantity}
            onChange={(event) => update("quantity", event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Models, capacities or other requirements <span className="text-accent">*</span>
          <textarea
            required
            rows={5}
            value={form.requirements}
            onChange={(event) => update("requirements", event.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="For example: 20 split ACs for guest rooms, 1.5 Ton preferred. Delivery needed in two phases."
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <MailIcon className="size-4" />
          Prepare email enquiry
          <ArrowRightIcon className="size-4" />
        </button>
        {site.contact.whatsapp && (
          <button
            type="button"
            onClick={() => {
              window.location.href = `https://wa.me/${site.contact.whatsapp}?text=${encodeURIComponent(message())}`;
            }}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line px-5 text-sm font-medium"
          >
            <WhatsAppIcon className="size-4" />
            Send on WhatsApp
          </button>
        )}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-text-muted">
        This opens your email app with the details filled in. The website does
        not store or transmit the form itself.
      </p>
    </form>
  );
}
