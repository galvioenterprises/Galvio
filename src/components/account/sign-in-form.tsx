"use client";

import { useEffect, useRef, useState } from "react";
import { api, setSignedIn, type StoreConfig, type User } from "@/lib/api";
import { ArrowRightIcon, MailIcon, PhoneIcon } from "../icons";
import { Field, inputClass, primaryButtonClass } from "./form";

type Method = "phone" | "email";

/**
 * Passwordless sign-in by mobile or email. The first code for a number or
 * address creates the account, so there is no separate "sign up".
 */
export function SignInForm({
  onDone,
  compact = false,
  emailOnly = false,
}: {
  onDone?: () => void;
  compact?: boolean;
  /** Admin access is granted by email (ADMIN_EMAILS), so admin sign-in skips the mobile tab. */
  emailOnly?: boolean;
}) {
  const [method, setMethod] = useState<Method>(emailOnly ? "email" : "phone");
  const [step, setStep] = useState<"id" | "code">("id");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const [phoneAvailable, setPhoneAvailable] = useState(true);

  // Mobile codes need an SMS provider; until it is set up, email only.
  useEffect(() => {
    api<StoreConfig>("/config")
      .then((c) => {
        if (!c.phoneSignIn) {
          setPhoneAvailable(false);
          setMethod("email");
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const identity = method === "email" ? { email } : { phone };
  const shown = method === "email" ? email : `+91 ${phone}`;

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ devCode?: string }>("/auth/start", { body: identity });
      setDevCode(data.devCode ?? null);
      setStep("code");
      setCode("");
      setResendIn(30);
      window.setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code) {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: User; isAdmin: boolean }>("/auth/verify", { body: { ...identity, code: value } });
      setSignedIn(data.user, data.isAdmin);
      onDone?.();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (step === "id") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendCode();
        }}
        className="space-y-4"
      >
        {!compact && (
          <p className="text-sm leading-relaxed text-text-muted">
            We&rsquo;ll send you a 6-digit code. New here? The same step creates your account.
          </p>
        )}
        {phoneAvailable && !emailOnly && (
        <div role="tablist" aria-label="Sign in with" className="inline-flex rounded-lg bg-canvas p-1 text-sm">
          {(["phone", "email"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={method === m}
              onClick={() => {
                setMethod(m);
                setError(null);
              }}
              className={`rounded-md px-4 py-1.5 font-medium ${method === m ? "bg-surface shadow-sm" : "text-text-muted"}`}
            >
              {m === "phone" ? "Mobile" : "Email"}
            </button>
          ))}
        </div>
        )}
        {method === "phone" ? (
          <Field label="Mobile number" error={error}>
            <div className="flex">
              <span className="flex h-11 items-center rounded-l-lg border border-r-0 border-line-strong bg-canvas px-3 text-sm text-text-muted">+91</span>
              <input
                type="tel"
                required
                autoComplete="tel-national"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="98765 43210"
                className={`${inputClass} rounded-l-none`}
              />
            </div>
          </Field>
        ) : (
          <Field label="Email address" error={error}>
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>
        )}
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Sending code…" : "Get code"}
          {!busy && <ArrowRightIcon className="size-4" />}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verify();
      }}
      className="space-y-4"
    >
      <p className="flex items-start gap-2 text-sm leading-relaxed text-text-muted">
        {method === "email" ? <MailIcon className="mt-0.5 size-4 shrink-0" /> : <PhoneIcon className="mt-0.5 size-4 shrink-0" />}
        <span>
          We sent a code to <strong className="font-medium text-text">{shown}</strong>.{" "}
          <button type="button" onClick={() => setStep("id")} className="text-accent hover:underline">
            Change
          </button>
        </span>
      </p>
      {devCode && (
        <p className="rounded-lg bg-scarcity px-3 py-2 text-xs text-scarcity-text">
          Development mode: your code is <strong>{devCode}</strong>
        </p>
      )}
      <Field label="6-digit code" error={error}>
        <input
          ref={codeRef}
          required
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(next);
            // Submit as soon as the sixth digit lands, as OTP screens do.
            if (next.length === 6 && !busy) void verify(next);
          }}
          className={`${inputClass} text-center font-mono text-lg tracking-[0.5em]`}
        />
      </Field>
      <button type="submit" disabled={busy || code.length !== 6} className={primaryButtonClass}>
        {busy ? "Checking…" : "Verify and continue"}
      </button>
      <p className="text-center text-xs text-text-muted">
        Didn&rsquo;t get it?{" "}
        {resendIn > 0 ? (
          <span>Resend in {resendIn}s</span>
        ) : (
          <button type="button" onClick={() => void sendCode()} className="text-accent hover:underline">
            Send a new code
          </button>
        )}
      </p>
    </form>
  );
}

/** "Continue as guest": name and mobile, no code. */
export function GuestForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const data = await api<{ user: User; isAdmin: boolean }>("/auth/guest", { body: { name, phone } });
          setSignedIn(data.user, data.isAdmin);
          onDone?.();
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <Field label="Full name">
        <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Mobile number" error={error} hint="We call this number to confirm your order.">
        <div className="flex">
          <span className="flex h-11 items-center rounded-l-lg border border-r-0 border-line-strong bg-canvas px-3 text-sm text-text-muted">+91</span>
          <input
            type="tel"
            required
            autoComplete="tel-national"
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            className={`${inputClass} rounded-l-none`}
          />
        </div>
      </Field>
      <button type="submit" disabled={busy} className={primaryButtonClass}>
        {busy ? "Continuing…" : "Continue as guest"}
      </button>
    </form>
  );
}
