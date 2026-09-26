import { z } from "zod";
import { phoneSchema, requireUser } from "./auth";
import type { Env } from "./env";
import { HttpError, json, now, randomId, readBody } from "./http";
import { INDIAN_STATES } from "../src/config/states";

export const addressSchema = z.object({
  label: z.enum(["Home", "Work", "Other"]).default("Home"),
  name: z.string().trim().min(1, "Enter the recipient's name.").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(3, "Enter the house number and street.").max(160),
  line2: z.string().trim().max(160).default(""),
  landmark: z.string().trim().max(100).default(""),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  state: z.enum(INDIAN_STATES, { message: "Choose a state." }),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code."),
  isDefault: z.boolean().default(false),
});

export type Address = z.infer<typeof addressSchema> & { id: string };

type Row = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  is_default: number;
};

function toAddress(row: Row): Address {
  const { is_default, ...rest } = row;
  return {
    ...rest,
    label: rest.label as Address["label"],
    state: rest.state as Address["state"],
    isDefault: is_default === 1,
  };
}

export async function listAddresses(userId: string, env: Env): Promise<Address[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, label, name, phone, line1, line2, landmark, city, state, pincode, is_default
       FROM addresses WHERE user_id = ?1 ORDER BY is_default DESC, created_at DESC`,
  )
    .bind(userId)
    .all<Row>();
  return results.map(toAddress);
}

export async function getAddress(userId: string, id: string, env: Env): Promise<Address | null> {
  const row = await env.DB.prepare(
    `SELECT id, label, name, phone, line1, line2, landmark, city, state, pincode, is_default
       FROM addresses WHERE user_id = ?1 AND id = ?2`,
  )
    .bind(userId, id)
    .first<Row>();
  return row ? toAddress(row) : null;
}

export async function handleAddresses(
  request: Request,
  env: Env,
  id: string | undefined,
): Promise<Response> {
  const user = await requireUser(request, env);

  if (request.method === "GET" && !id) {
    return json({ addresses: await listAddresses(user.id, env) });
  }

  if (request.method === "DELETE" && id) {
    await env.DB.prepare(`DELETE FROM addresses WHERE id = ?1 AND user_id = ?2`)
      .bind(id, user.id)
      .run();
    return json({ addresses: await listAddresses(user.id, env) });
  }

  if ((request.method === "POST" && !id) || (request.method === "PUT" && id)) {
    const body = await readBody(request, addressSchema);
    const existing = await listAddresses(user.id, env);
    if (!id && existing.length >= 10) throw new HttpError(400, "You can save up to 10 addresses.");
    if (id && !existing.some((a) => a.id === id)) throw new HttpError(404, "Address not found.");

    // The first address is the default whether or not the box was ticked.
    const makeDefault = body.isDefault || existing.length === 0;
    const addressId = id ?? randomId();
    const statements = [];
    if (makeDefault) {
      statements.push(
        env.DB.prepare(`UPDATE addresses SET is_default = 0 WHERE user_id = ?1`).bind(user.id),
      );
    }
    statements.push(
      id
        ? env.DB.prepare(
            `UPDATE addresses SET name = ?3, phone = ?4, line1 = ?5, line2 = ?6, landmark = ?7,
               city = ?8, state = ?9, pincode = ?10, is_default = MAX(is_default, ?11), label = ?12
             WHERE id = ?1 AND user_id = ?2`,
          ).bind(
            addressId, user.id, body.name, body.phone, body.line1, body.line2, body.landmark,
            body.city, body.state, body.pincode, makeDefault ? 1 : 0, body.label,
          )
        : env.DB.prepare(
            `INSERT INTO addresses (id, user_id, name, phone, line1, line2, landmark, city, state,
               pincode, is_default, created_at, label)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
          ).bind(
            addressId, user.id, body.name, body.phone, body.line1, body.line2, body.landmark,
            body.city, body.state, body.pincode, makeDefault ? 1 : 0, now(), body.label,
          ),
    );
    await env.DB.batch(statements);
    return json({ id: addressId, addresses: await listAddresses(user.id, env) });
  }

  throw new HttpError(405, "Method not allowed.");
}
