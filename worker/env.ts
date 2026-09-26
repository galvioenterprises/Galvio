export type Env = {
  ASSETS: Fetcher;
  DB: D1Database;

  SITE_URL: string;
  /** "sandbox" or "production". */
  CASHFREE_ENV: string;
  EMAIL_FROM: string;
  /** "true" only in .dev.vars. Shows sign-in codes in the API response and
   *  enables the simulated payment page, so it must never be set in
   *  production. */
  DEV_MODE: string;
  /** Launch gate for abandoned-cart and price/stock marketing email. */
  ENGAGEMENT_EMAILS?: string;

  // Secrets
  CASHFREE_APP_ID?: string;
  CASHFREE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  /** Comma-separated emails that may use /admin/. */
  ADMIN_EMAILS?: string;
  /** Lets the local inventory console (`pnpm admin`) manage orders. */
  ADMIN_API_TOKEN?: string;
  /** MSG91 OTP API, for mobile sign-in (needs a DLT-approved template). */
  MSG91_AUTH_KEY?: string;
  MSG91_TEMPLATE_ID?: string;
  /** Mixed into sign-in code hashes. */
  CODE_PEPPER?: string;
};

export function isDev(env: Env): boolean {
  return env.DEV_MODE === "true";
}

export function adminEmails(env: Env): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
