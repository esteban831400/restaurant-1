import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-palmeraie-signature";
export const TIMESTAMP_HEADER = "x-palmeraie-timestamp";
export const MAX_SKEW_SECONDS = 300;

export function sign(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export type VerifyResult = { ok: true } | { ok: false; reason: "missing" | "expired" | "invalid" };

export function verify(
  secret: string,
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): VerifyResult {
  if (!signature || !timestamp) return { ok: false, reason: "missing" };
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: "expired" };
  }
  const expected = Buffer.from(sign(secret, timestamp, rawBody), "hex");
  const received = Buffer.from(signature, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true };
}
