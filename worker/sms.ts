import { isDev, type Env } from "./env";

/**
 * Sends a sign-in code by SMS through MSG91's OTP API.
 *
 * Indian SMS needs a DLT-registered sender and template, so this only
 * works once MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are set (the template
 * must contain the ##OTP## variable). In development the code is logged
 * and returned to the page instead.
 */
export function smsConfigured(env: Env): boolean {
  return Boolean(env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID) || isDev(env);
}

export async function sendOtpSms(env: Env, phone: string, code: string): Promise<boolean> {
  if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
    if (isDev(env)) {
      console.log(`[sms] to=+91${phone} code=${code}`);
      return true;
    }
    return false;
  }
  try {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", env.MSG91_TEMPLATE_ID);
    url.searchParams.set("mobile", `91${phone}`);
    url.searchParams.set("otp", code);
    const response = await fetch(url, { method: "POST", headers: { authkey: env.MSG91_AUTH_KEY, "content-type": "application/json" }, body: "{}" });
    const body = (await response.json().catch(() => ({}))) as { type?: string; message?: string };
    if (!response.ok || body.type === "error") {
      console.error(`[sms] MSG91 ${response.status}: ${body.message ?? "unknown"}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[sms] send failed", error);
    return false;
  }
}
