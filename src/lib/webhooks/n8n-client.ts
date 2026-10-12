import "server-only";
import { serverEnv } from "@/lib/env";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, sign } from "@/lib/webhooks/hmac";

export type N8nResult = { ok: true; status: number; body: unknown } | { ok: false; status: number | null; error: string };

/** Appelle un webhook n8n (app → n8n) avec signature HMAC. L'URL et le secret ne quittent jamais le serveur. */
export async function callN8n(url: string, payload: unknown, timeoutMs = 15_000): Promise<N8nResult> {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [TIMESTAMP_HEADER]: timestamp,
        [SIGNATURE_HEADER]: sign(serverEnv().N8N_OUTBOUND_SECRET, timestamp, body),
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    const text = await res.text();
    let parsed: unknown = text;
    try { parsed = JSON.parse(text); } catch { /* réponse non JSON : conservée telle quelle */ }
    return res.ok ? { ok: true, status: res.status, body: parsed } : { ok: false, status: res.status, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, status: null, error: e instanceof Error ? e.message : "Erreur réseau" };
  }
}
