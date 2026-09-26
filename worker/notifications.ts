import type { EmailMessage } from "./email";
import { sendEmail } from "./email";
import type { Env } from "./env";
import { now, randomId, sha256 } from "./http";

type OutboxRow = {
  id: string;
  dedupe_key: string;
  recipient: string;
  subject: string;
  body: string;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  next_attempt_at: string;
};

function nextAttempt(attempts: number): string {
  // 5m, 15m, 45m, then at most every six hours.
  const exponent = Math.min(Math.max(attempts - 1, 0), 4);
  const minutes = Math.min(360, 5 * 3 ** exponent);
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

async function deliver(env: Env, row: OutboxRow): Promise<boolean> {
  const claimed = await env.DB.prepare(
    `UPDATE notification_outbox
        SET status = 'sending', attempts = attempts + 1, updated_at = ?2, next_attempt_at = ?3
      WHERE id = ?1 AND status != 'sent' AND next_attempt_at <= ?2`,
  )
    .bind(row.id, now(), new Date(Date.now() + 10 * 60_000).toISOString())
    .run();
  if (claimed.meta.changes !== 1) return row.status === "sent";

  // Resend retains idempotency keys for provider-side replay protection.
  // Hash the logical key because cart keys can be long and can contain data.
  const providerKey = `galvio/${await sha256(`${env.SITE_URL}:${row.dedupe_key}`)}`;
  const sent = await sendEmail(env, {
    to: row.recipient,
    subject: row.subject,
    text: row.body,
    idempotencyKey: providerKey,
  });
  const timestamp = now();
  await env.DB.prepare(
    `UPDATE notification_outbox
        SET status = ?2, last_error = ?3, next_attempt_at = ?4, updated_at = ?5,
            sent_at = CASE WHEN ?2 = 'sent' THEN ?5 ELSE sent_at END
      WHERE id = ?1`,
  )
    .bind(
      row.id,
      sent ? "sent" : "failed",
      sent ? "" : "Provider did not accept the message",
      sent ? timestamp : nextAttempt(row.attempts + 1),
      timestamp,
    )
    .run();
  return sent;
}

/** Store every transactional email before attempting delivery. */
export async function sendTrackedEmail(env: Env, message: EmailMessage, dedupeKey: string): Promise<boolean> {
  // Reserved mobile/guest placeholders are deliberately not mail targets.
  if (message.to.endsWith(".invalid")) return true;
  const timestamp = now();
  await env.DB.prepare(
    `INSERT INTO notification_outbox
       (id, dedupe_key, channel, recipient, subject, body, status, attempts, next_attempt_at, created_at, updated_at)
     VALUES (?1, ?2, 'email', ?3, ?4, ?5, 'pending', 0, ?6, ?6, ?6)
     ON CONFLICT (dedupe_key) DO NOTHING`,
  )
    .bind(randomId(), dedupeKey, message.to, message.subject, message.text, timestamp)
    .run();

  const row = await env.DB.prepare(
    `SELECT id, dedupe_key, recipient, subject, body, status, attempts, next_attempt_at
       FROM notification_outbox WHERE dedupe_key = ?1`,
  )
    .bind(dedupeKey)
    .first<OutboxRow>();
  return row ? deliver(env, row) : false;
}

/** Retry due failures within Resend's 24-hour idempotency window. */
export async function retryNotifications(env: Env): Promise<void> {
  const { results } = await env.DB.prepare(
    `SELECT id, dedupe_key, recipient, subject, body, status, attempts, next_attempt_at
       FROM notification_outbox
      WHERE status != 'sent' AND next_attempt_at <= ?1 AND attempts < 8
      ORDER BY next_attempt_at LIMIT 50`,
  )
    .bind(now())
    .all<OutboxRow>();
  for (const row of results) await deliver(env, row);
}
