import type { Env } from "./env";
import { HttpError, clientIp, now, sha256 } from "./http";

/** A compact D1-backed fixed-window limiter with hashed identifiers. */
export async function enforceRateLimit(
  request: Request,
  env: Env,
  scope: string,
  limit: number,
  windowSeconds: number,
  identity = clientIp(request),
): Promise<void> {
  const timestamp = now();
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const keyHash = await sha256(`${scope}:${identity}`);
  const row = await env.DB.prepare(
    `INSERT INTO api_rate_limits (scope, key_hash, window_started, hits)
     VALUES (?1, ?2, ?3, 1)
     ON CONFLICT (scope, key_hash) DO UPDATE SET
       window_started = CASE WHEN window_started <= ?4 THEN excluded.window_started ELSE window_started END,
       hits = CASE WHEN window_started <= ?4 THEN 1 ELSE hits + 1 END
     RETURNING hits`,
  )
    .bind(scope, keyHash, timestamp, cutoff)
    .first<{ hits: number }>();

  if ((row?.hits ?? limit + 1) > limit) {
    throw new HttpError(429, "Too many requests. Please wait and try again.");
  }

  if ((row?.hits ?? 0) === 1) {
    await env.DB.prepare(`DELETE FROM api_rate_limits WHERE window_started < ?1`)
      .bind(new Date(Date.now() - 7 * 86400_000).toISOString())
      .run();
  }
}
