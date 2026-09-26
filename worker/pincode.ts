import { json } from "./http";

/**
 * City and state for an Indian PIN code, from India Post's public API
 * (api.postalpincode.in), cached at Cloudflare's edge for a week. Used to
 * fill the address form as soon as the customer types six digits.
 */
export async function pincodeLookup(pin: string): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(`https://pincode.galvio.internal/${pin}`);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let result: { found: boolean; city?: string; state?: string; areas?: string[] } = { found: false };
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      headers: { "user-agent": "galvioenterprises.com address lookup" },
    });
    const body = (await response.json()) as {
      Status?: string;
      PostOffice?: { Name: string; District: string; State: string }[] | null;
    }[];
    const offices = body[0]?.Status === "Success" ? (body[0].PostOffice ?? []) : [];
    if (offices.length) {
      result = {
        found: true,
        city: offices[0].District,
        state: offices[0].State,
        areas: [...new Set(offices.map((o) => o.Name))].slice(0, 12),
      };
    }
  } catch {
    // Lookup is a convenience; the customer can still type the address.
  }

  const response = json(result);
  const cached = new Response(response.body, response);
  cached.headers.set("cache-control", `public, max-age=${result.found ? 604800 : 3600}`);
  await cache.put(cacheKey, cached.clone());
  return cached;
}
