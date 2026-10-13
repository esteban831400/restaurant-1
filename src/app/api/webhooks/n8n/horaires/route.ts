import { NextResponse } from "next/server";
import { aujourdhuiParis } from "@/lib/dates";
import { HORAIRES_PAR_DEFAUT, POLES_CLES, SAISONS_PAR_DEFAUT, fermeturesSchema, horairesDuJour, horairesSchema, saisonsSchema } from "@/lib/parametres/horaires";
import { lireComplexe } from "@/lib/parametres/complexe";
import { createAdminClient } from "@/lib/supabase/admin";
import { erreurJson, verifierSignature } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";

/** Horaires, saisons et fermetures pour le standard téléphonique IA. `?date=AAAA-MM-JJ` (défaut : aujourd'hui à Paris). GET signé, corps vide. */
export async function GET(request: Request) {
  const refus = verifierSignature(request, "");
  if (refus) return refus;
  const date = new URL(request.url).searchParams.get("date") ?? aujourdhuiParis();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return erreurJson(400, "donnees_invalides", "Date invalide (AAAA-MM-JJ).");

  const { data, error } = await createAdminClient().from("parametres").select("cle, valeur").in("cle", ["horaires", "saisons", "fermetures", "complexe"]);
  if (error) return erreurJson(500, "erreur_interne", "Lecture impossible.");
  const m = new Map((data ?? []).map((p) => [p.cle as string, p.valeur as unknown]));
  const horaires = horairesSchema.safeParse(m.get("horaires"));
  const saisons = saisonsSchema.safeParse(m.get("saisons"));
  const fermetures = fermeturesSchema.safeParse(m.get("fermetures"));
  const h = horaires.success ? horaires.data : HORAIRES_PAR_DEFAUT;
  const s = saisons.success ? saisons.data : SAISONS_PAR_DEFAUT;
  const f = fermetures.success ? fermetures.data : [];

  return NextResponse.json({
    complexe: { nom: lireComplexe(m.get("complexe")).nom },
    date,
    saisons: s,
    horaires: h,
    fermetures: f,
    du_jour: Object.fromEntries(POLES_CLES.map((p) => [p, horairesDuJour(h, s, f, p, date)])),
  });
}
