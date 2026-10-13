import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { serverEnv } from "@/lib/env";
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verify } from "@/lib/webhooks/hmac";

export type SignedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

export const erreurJson = (status: number, code: string, message: string, details?: unknown) =>
  NextResponse.json({ error: code, message, ...(details ? { details } : {}) }, { status });

/** Vérifie la signature HMAC n8n → app sur le corps brut (chaîne vide pour une requête GET). Renvoie une réponse 401 en cas d'échec. */
export function verifierSignature(request: Request, raw: string): NextResponse | null {
  const res = verify(serverEnv().N8N_WEBHOOK_SECRET, raw, request.headers.get(SIGNATURE_HEADER), request.headers.get(TIMESTAMP_HEADER));
  return res.ok ? null : erreurJson(401, `signature_${res.reason}`, "Signature absente, expirée ou invalide.");
}

/** Lit le corps brut, vérifie la signature HMAC n8n → app, puis valide le JSON avec Zod. */
export async function readSignedJson<T>(request: Request, schema: ZodType<T>): Promise<SignedBody<T>> {
  const raw = await request.text();
  const refus = verifierSignature(request, raw);
  if (refus) return { ok: false, response: refus };

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, response: erreurJson(400, "json_invalide", "Le corps de la requête n'est pas du JSON valide.") };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, response: erreurJson(400, "donnees_invalides", "Les données ne respectent pas le format attendu.", parsed.error.issues.map((i) => ({ chemin: i.path.join("."), message: i.message }))) };
  }
  return { ok: true, data: parsed.data };
}
