import { NextResponse } from "next/server";
import { estCle, reglagesEffectifs } from "@/lib/automatisations/definitions";
import { createAdminClient } from "@/lib/supabase/admin";
import { erreurJson, verifierSignature } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";

/**
 * n8n lit ici, au début de chaque exécution, si l'automatisation est activée et avec quels réglages.
 * Requête GET signée : la signature porte sur `timestamp + "." + ""` (corps vide).
 */
export async function GET(request: Request, { params }: { params: { cle: string } }) {
  const refus = verifierSignature(request, "");
  if (refus) return refus;
  if (!estCle(params.cle)) return erreurJson(404, "automatisation_inconnue", "Automatisation inconnue.");

  const db = createAdminClient();
  const [{ data: auto }, { data: dlc }] = await Promise.all([
    db.from("automatisations").select("cle, actif, parametres").eq("cle", params.cle).maybeSingle(),
    db.from("parametres").select("valeur").eq("cle", "seuil_dlc_jours").maybeSingle(),
  ]);
  if (!auto) return erreurJson(404, "automatisation_inconnue", "Automatisation inconnue.");
  return NextResponse.json({
    cle: auto.cle,
    actif: auto.actif,
    parametres: reglagesEffectifs(params.cle, auto.parametres as Record<string, unknown>),
    ...(params.cle === "alertes_dlc" ? { seuil_dlc_jours_global: Number(dlc?.valeur) || 3 } : {}),
  });
}
