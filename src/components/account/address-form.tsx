"use client";

import { useState } from "react";
import { api, type Address } from "@/lib/api";
import { INDIAN_STATES } from "@/config/states";
import { Field, inputClass, primaryButtonClass, secondaryButtonClass } from "./form";

type Draft = Omit<Address, "id">;

const EMPTY: Draft = {
  label: "Home",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

/** Adds or edits a saved address. Returns the saved list to the parent. */
export function AddressForm({
  initial,
  defaults,
  onSaved,
  onCancel,
  submitLabel = "Save address",
}: {
  initial?: Address;
  defaults?: Partial<Draft>;
  onSaved: (addresses: Address[], id: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY, ...defaults, ...initial }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [areas, setAreas] = useState<string[]>([]);
  const [pinNote, setPinNote] = useState<string | null>(null);

  /** Fill city and state from the PIN code, and suggest localities. */
  async function lookup(pin: string) {
    try {
      const result = await api<{ found: boolean; city?: string; state?: string; areas?: string[] }>(`/pincode/${pin}`);
      if (!result.found) {
        setPinNote("We couldn't find that PIN code. Please check it.");
        return;
      }
      const norm = (v: string) => v.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ").trim();
      const state = INDIAN_STATES.find((st) => norm(st) === norm(result.state ?? "")) ?? "";
      setDraft((d) => ({ ...d, city: d.city || result.city || "", state: state || d.state }));
      setAreas(result.areas ?? []);
      setPinNote(`${result.city}, ${result.state}`);
    } catch {
      // Lookup is a convenience; the customer can type the rest.
    }
  }

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ id: string; addresses: Address[] }>(
        initial ? `/addresses/${initial.id}` : "/addresses",
        { method: initial ? "PUT" : "POST", body: draft },
      );
      onSaved(data.addresses, data.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name">
        <input required autoComplete="name" value={draft.name} onChange={set("name")} className={inputClass} />
      </Field>
      <Field label="Mobile number" hint="We call this number to confirm delivery.">
        <div className="flex">
          <span className="flex h-11 items-center rounded-l-lg border border-r-0 border-line-strong bg-canvas px-3 text-sm text-text-muted">
            +91
          </span>
          <input
            required
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            maxLength={10}
            value={draft.phone}
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            className={`${inputClass} rounded-l-none`}
          />
        </div>
      </Field>
      <Field label="PIN code">
        <input
          required
          autoComplete="postal-code"
          inputMode="numeric"
          pattern="[1-9][0-9]{5}"
          maxLength={6}
          value={draft.pincode}
          onChange={(e) => {
            const pin = e.target.value.replace(/\D/g, "").slice(0, 6);
            setDraft((d) => ({ ...d, pincode: pin }));
            setPinNote(null);
            if (pin.length === 6) void lookup(pin);
          }}
          className={inputClass}
        />
        {pinNote && <span className="mt-1 block text-xs text-emerald-700">{pinNote}</span>}
      </Field>
      <Field label="City">
        <input required autoComplete="address-level2" value={draft.city} onChange={set("city")} className={inputClass} />
      </Field>
      <Field label="House no., building, street" className="sm:col-span-2">
        <input required autoComplete="address-line1" value={draft.line1} onChange={set("line1")} className={inputClass} />
      </Field>
      <Field label="Area, locality (optional)">
        <input autoComplete="address-line2" list="pin-areas" value={draft.line2} onChange={set("line2")} className={inputClass} />
        <datalist id="pin-areas">
          {areas.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </Field>
      <Field label="Landmark (optional)">
        <input value={draft.landmark} onChange={set("landmark")} className={inputClass} />
      </Field>
      <Field label="State" className="sm:col-span-2">
        <select required autoComplete="address-level1" value={draft.state} onChange={set("state")} className={inputClass}>
          <option value="" disabled>
            Choose a state
          </option>
          {INDIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1.5 text-[0.8125rem] font-medium">Save as</legend>
        <div className="flex gap-2">
          {(["Home", "Work", "Other"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={draft.label === l}
              onClick={() => setDraft((d) => ({ ...d, label: l }))}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                draft.label === l ? "border-accent bg-accent/5 font-medium text-accent" : "border-line-strong hover:border-text"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={draft.isDefault} onChange={set("isDefault")} className="size-4 accent-accent" />
        Make this my default address
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className={`${primaryButtonClass} sm:w-auto`}>
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={secondaryButtonClass}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function AddressLines({ address }: { address: Omit<Address, "id" | "isDefault" | "label"> }) {
  return (
    <span className="block text-sm leading-relaxed text-text-muted">
      <span className="block font-medium text-text">{address.name}</span>
      {address.line1}
      {address.line2 && `, ${address.line2}`}
      {address.landmark && `, near ${address.landmark}`}
      <br />
      {address.city}, {address.state} {address.pincode}
      <br />
      +91 {address.phone}
    </span>
  );
}
