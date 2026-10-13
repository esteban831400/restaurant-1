import { NextResponse } from "next/server";
import { diagnosticEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Diagnostic de déploiement, sans connexion requise : variables d'environnement présentes/valides (jamais leurs valeurs)
 * et accessibilité de la base. Utile quand une page affiche « erreur serveur » (le détail est masqué en production).
 */
export async function GET() {
  const variables = diagnosticEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let base: { etat: string; code?: number } = { etat: "non testée (URL ou clé publique manquante)" };

  if (url && cle && variables.filter((v) => v.nom.startsWith("NEXT_PUBLIC_")).every((v) => v.etat === "ok")) {
    try {
      const res = await fetch(`${url}/rest/v1/poles?select=cle&limit=1`, { headers: { apikey: cle, Authorization: `Bearer ${cle}` }, signal: AbortSignal.timeout(8_000), cache: "no-store" });
      base = { etat: res.ok ? "joignable" : res.status === 401 ? "clé publique refusée (mauvaise clé ?)" : "erreur", code: res.status };
    } catch {
      base = { etat: "injoignable (URL incorrecte ?)" };
    }
  }
  const manquantes = variables.filter((v) => v.etat !== "ok").map((v) => `${v.nom} (${v.etat})`);
  return NextResponse.json({ ok: manquantes.length === 0 && base.etat === "joignable", a_corriger: manquantes, base, variables }, { headers: { "Cache-Control": "no-store" } });
}
