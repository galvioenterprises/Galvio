import { isDev, type Env } from "./env";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /** Stable across retries so the provider cannot deliver the same mail twice. */
  idempotencyKey?: string;
};

/**
 * Sends a transactional email through Resend.
 *
 * Without an API key (local dev) the message is written to the log
 * instead, so the whole flow can be exercised without sending anything.
 * A failed send is logged and swallowed: an order must not fail because a
 * confirmation email did.
 */
export async function sendEmail(env: Env, message: EmailMessage): Promise<boolean> {
  // Mobile and guest accounts carry a reserved placeholder address.
  if (message.to.endsWith(".invalid")) return true;
  if (!env.RESEND_API_KEY) {
    if (isDev(env)) {
      console.log(`[email] to=${message.to} subject=${message.subject}\n${message.text}`);
      return true;
    }
    console.error("[email] RESEND_API_KEY is not set; email not sent");
    return false;
  }

  try {
    const headers = new Headers({
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    });
    if (message.idempotencyKey) headers.set("idempotency-key", message.idempotencyKey);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      console.error(`[email] Resend ${response.status}: ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}
