import { z } from "zod";
import { adminEmails, isDev, type Env } from "./env";
import { sendEmail } from "./email";
import { sendOtpSms, smsConfigured } from "./sms";
import { HttpError, json, now, randomId, readBody, safeEqual, sha256 } from "./http";
import { enforceRateLimit } from "./rate-limit";

/**
 * Passwordless sign-in: a six-digit code sent to the customer's email.
 *
 * There is no separate sign-up. The first successful code for an email
 * creates the account, which is how Shopify's customer accounts and most
 * Indian stores (with mobile OTP) work, and it means no password database
 * to leak.
 */

const COOKIE = "__Host-galvio_session";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const SENDS_PER_EMAIL_PER_HOUR = 5;
const SENDS_PER_IP_PER_HOUR = 20;

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string;
};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: "Enter a valid email address." }))
  .refine((e) => e.length <= 254, "Email is too long.");

export const phoneSchema = z
  .string()
  .trim()
  .transform((p) => p.replace(/[\s-]/g, "").replace(/^(\+91|0)/, ""))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number."));

function randomCode(): string {
  // Rejection sampling keeps every code equally likely.
  const limit = Math.floor(0xffffffff / 1_000_000) * 1_000_000;
  const buffer = new Uint32Array(1);
  do crypto.getRandomValues(buffer);
  while (buffer[0] >= limit);
  return String(buffer[0] % 1_000_000).padStart(6, "0");
}

function codeHash(env: Env, email: string, code: string) {
  const pepper =
    env.CODE_PEPPER && env.CODE_PEPPER.length >= 32
      ? env.CODE_PEPPER
      : isDev(env)
        ? "local-development-pepper"
        : null;
  if (!pepper) {
    console.error("[auth] CODE_PEPPER is missing or shorter than 32 characters");
    throw new HttpError(503, "Sign-in is temporarily unavailable.");
  }
  return sha256(`${pepper}:${email}:${code}`);
}

/** Where a code goes: an email address or a 10-digit Indian mobile. */
const identitySchema = z.union([
  z.object({ email: emailSchema }),
  z.object({ phone: phoneSchema }),
]);
type Identity = z.infer<typeof identitySchema>;
const keyOf = (id: Identity) => ("email" in id ? `email:${id.email}` : `phone:${id.phone}`);

export const PLACEHOLDER_DOMAIN = "users.galvio.invalid";
/** The customer-facing email: blank for mobile-only and guest accounts. */
export function publicEmail(email: string): string {
  return email.endsWith(`@${PLACEHOLDER_DOMAIN}`) ? "" : email;
}

export async function startSignIn(request: Request, env: Env): Promise<Response> {
  const identity = await readBody(request, identitySchema);
  const key = keyOf(identity);

  if ("phone" in identity && !smsConfigured(env)) {
    throw new HttpError(400, "Sign-in by mobile isn't available yet. Please use your email.");
  }

  // Each counter update is a single D1 UPSERT, so simultaneous requests
  // cannot both consume the final allowed send.
  await enforceRateLimit(request, env, "login-ip", SENDS_PER_IP_PER_HOUR, 3600);
  await enforceRateLimit(request, env, "login-identity", SENDS_PER_EMAIL_PER_HOUR, 3600, key);

  const code = randomCode();
  const expires = new Date(Date.now() + CODE_MINUTES * 60_000).toISOString();
  await env.DB.prepare(
    `INSERT INTO login_codes (email, code_hash, expires_at, attempts) VALUES (?1, ?2, ?3, 0)
     ON CONFLICT (email) DO UPDATE SET code_hash = ?2, expires_at = ?3, attempts = 0`,
  )
    .bind(key, await codeHash(env, key, code), expires)
    .run();

  const sent =
    "email" in identity
      ? await sendEmail(env, {
          to: identity.email,
          subject: `${code} is your Galvio sign-in code`,
          text:
            `Your Galvio Enterprises sign-in code is ${code}.\n\n` +
            `It expires in ${CODE_MINUTES} minutes. If you did not ask for it, ignore this email.`,
        })
      : await sendOtpSms(env, identity.phone, code);
  if (!sent) throw new HttpError(502, "We couldn't send the code. Please try again.");

  return json({ ok: true, ...(isDev(env) ? { devCode: code } : {}) });
}

export async function verifySignIn(request: Request, env: Env): Promise<Response> {
  const body = await readBody(
    request,
    z.intersection(identitySchema, z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.") })),
  );
  const key = keyOf(body);
  const timestamp = now();

  const row = await env.DB.prepare(`SELECT code_hash, expires_at, attempts FROM login_codes WHERE email = ?1`)
    .bind(key)
    .first<{ code_hash: string; expires_at: string; attempts: number }>();

  if (!row || row.expires_at < timestamp) {
    throw new HttpError(400, "That code has expired. Request a new one.");
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new HttpError(429, "Too many wrong attempts. Request a new code.");
  }
  const suppliedHash = await codeHash(env, key, body.code);
  if (!safeEqual(row.code_hash, suppliedHash)) {
    const attempt = await env.DB.prepare(
      `UPDATE login_codes SET attempts = attempts + 1
        WHERE email = ?1 AND code_hash = ?2 AND expires_at >= ?3 AND attempts < ?4`,
    )
      .bind(key, row.code_hash, timestamp, MAX_ATTEMPTS)
      .run();
    if (attempt.meta.changes !== 1) {
      const current = await env.DB.prepare(`SELECT attempts FROM login_codes WHERE email = ?1`)
        .bind(key)
        .first<{ attempts: number }>();
      if (current && current.attempts >= MAX_ATTEMPTS) {
        throw new HttpError(429, "Too many wrong attempts. Request a new code.");
      }
      throw new HttpError(400, "That code has expired or was replaced. Request a new one.");
    }
    throw new HttpError(400, "That code is not right. Check it and try again.");
  }

  // Delete conditionally before issuing a session. Exactly one concurrent
  // verifier can consume the code.
  const consumed = await env.DB.prepare(
    `DELETE FROM login_codes
      WHERE email = ?1 AND code_hash = ?2 AND expires_at >= ?3 AND attempts < ?4`,
  )
    .bind(key, row.code_hash, timestamp, MAX_ATTEMPTS)
    .run();
  if (consumed.meta.changes !== 1) {
    throw new HttpError(400, "That code has expired or was already used. Request a new one.");
  }

  let user =
    "email" in body
      ? await env.DB.prepare(`SELECT id, email, name, phone FROM users WHERE email = ?1`).bind(body.email).first<User>()
      : await env.DB.prepare(`SELECT id, email, name, phone FROM users WHERE login_phone = ?1`).bind(body.phone).first<User>();
  if (!user) {
    const email = "email" in body ? body.email : `phone-${body.phone}@${PLACEHOLDER_DOMAIN}`;
    const phone = "phone" in body ? body.phone : "";
    user = { id: randomId(), email, name: "", phone };
    await env.DB.prepare(
      `INSERT INTO users (id, email, name, phone, login_phone, created_at) VALUES (?1, ?2, '', ?3, ?4, ?5)`,
    )
      .bind(user.id, email, phone, "phone" in body ? body.phone : null, now())
      .run();
  }

  // Orders placed as a guest with this email or mobile now belong to the
  // verified account, so they show up in My Orders.
  await env.DB.prepare(
    `UPDATE orders SET user_id = ?1
      WHERE user_id IN (SELECT id FROM users WHERE guest = 1)
        AND ${"email" in body ? "LOWER(email) = ?2" : "phone = ?2"}`,
  )
    .bind(user.id, "email" in body ? body.email : body.phone)
    .run();

  return startSession(env, user);
}

/**
 * "Continue as guest": an account with no verified identity, so checkout
 * works without a code. Its orders move to a real account as soon as the
 * customer verifies the same email or mobile.
 */
export async function guestSignIn(request: Request, env: Env): Promise<Response> {
  const body = await readBody(
    request,
    z.object({ name: z.string().trim().min(1, "Enter your name.").max(80), phone: phoneSchema }),
  );
  await Promise.all([
    enforceRateLimit(request, env, "guest-ip", 12, 3600),
    enforceRateLimit(request, env, "guest-phone", 5, 86400, body.phone),
  ]);
  const id = randomId();
  const user: User = { id, email: `guest-${id}@${PLACEHOLDER_DOMAIN}`, name: body.name, phone: body.phone };
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, phone, guest, created_at) VALUES (?1, ?2, ?3, ?4, 1, ?5)`,
  )
    .bind(id, user.email, user.name, user.phone, now())
    .run();
  return startSession(env, user, true);
}

async function startSession(env: Env, user: User, guest = false): Promise<Response> {
  const token = randomId(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)`,
    ).bind(await sha256(token), user.id, expires.toISOString(), now()),
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at < ?1`).bind(now()),
  ]);
  return json(
    { user: { ...user, email: publicEmail(user.email), guest }, isAdmin: adminEmails(env).has(user.email) },
    {
      headers: {
        "set-cookie": `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires.toUTCString()}`,
      },
    },
  );
}

function sessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=") || null;
  }
  return null;
}

export async function currentUser(request: Request, env: Env): Promise<User | null> {
  const token = sessionToken(request);
  if (!token) return null;
  return env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.phone
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ?1 AND s.expires_at > ?2`,
  )
    .bind(await sha256(token), now())
    .first<User>();
}

export async function requireUser(request: Request, env: Env): Promise<User> {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, "Please sign in.");
  return user;
}

/**
 * Admins are signed-in users listed in ADMIN_EMAILS, or the local
 * inventory console (`pnpm admin`), which authenticates with the
 * ADMIN_API_TOKEN secret instead of a browser session.
 */
export async function requireAdmin(request: Request, env: Env): Promise<User> {
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (bearer) {
    if (env.ADMIN_API_TOKEN && env.ADMIN_API_TOKEN.length >= 24 && safeEqual(await sha256(bearer), await sha256(env.ADMIN_API_TOKEN))) {
      return { id: "console", email: "inventory-console", name: "Inventory console", phone: "" };
    }
    throw new HttpError(401, "Invalid admin token.");
  }
  const user = await requireUser(request, env);
  if (!adminEmails(env).has(user.email)) throw new HttpError(403, "Not an admin account.");
  return user;
}

export async function signOut(request: Request, env: Env): Promise<Response> {
  const token = sessionToken(request);
  if (token) {
    await env.DB.prepare(`DELETE FROM sessions WHERE id = ?1`).bind(await sha256(token)).run();
  }
  return json(
    { ok: true },
    { headers: { "set-cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } },
  );
}

export async function me(request: Request, env: Env): Promise<Response> {
  const user = await currentUser(request, env);
  if (!user) return json({ user: null, isAdmin: false });
  const guest = await env.DB.prepare(`SELECT guest FROM users WHERE id = ?1`).bind(user.id).first<{ guest: number }>();
  return json({
    user: { ...user, email: publicEmail(user.email), guest: guest?.guest === 1 },
    isAdmin: adminEmails(env).has(user.email),
  });
}

export async function updateProfile(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  const body = await readBody(
    request,
    z.object({
      name: z.string().trim().min(1, "Enter your name.").max(80),
      phone: z.union([phoneSchema, z.literal("")]),
    }),
  );
  await env.DB.prepare(`UPDATE users SET name = ?1, phone = ?2 WHERE id = ?3`)
    .bind(body.name, body.phone, user.id)
    .run();
  return json({ user: { ...user, ...body } });
}
