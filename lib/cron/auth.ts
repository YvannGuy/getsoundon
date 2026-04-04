import crypto from "crypto";

const MAX_SKEW_MS = 5 * 60 * 1000; // 5 minutes

export async function verifyCronRequest(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Fallback bearer for compat
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader === `Bearer ${secret}`) return true;

  const timestamp = request.headers.get("x-timestamp");
  const signature = request.headers.get("x-signature");
  if (!timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Date.now();
  if (Math.abs(now - ts) > MAX_SKEW_MS) return false;

  const body = await request.clone().text();
  const payload = `${timestamp}.${body}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
