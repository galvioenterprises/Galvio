import type { ReactNode } from "react";

export const inputClass =
  "h-11 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] outline-none transition-colors placeholder:text-text-faint focus:border-accent focus:ring-2 focus:ring-accent/15";

export const primaryButtonClass =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-5 text-sm font-semibold text-text transition-colors hover:border-text disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[0.8125rem] font-medium">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}
