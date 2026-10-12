"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { estCle, schemaParametres } from "@/lib/automatisations/definitions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/stock";

const ERREUR = "Une erreur est survenue. Réessayez.";

export async function basculerAutomatisation(cle: string, actif: boolean): Promise<ActionResult> {
  await requireSession(["gerant"]);
  if (!estCle(cle) || typeof actif !== "boolean") return { ok: false, error: "Automatisation inconnue." };
  const { error } = await createClient().from("automatisations").update({ actif }).eq("cle", cle);
  if (error) return { ok: false, error: ERREUR };
  revalidatePath("/automatisations");
  return { ok: true };
}

export async function modifierReglages(cle: string, input: unknown): Promise<ActionResult> {
  await requireSession(["gerant"]);
  if (!estCle(cle)) return { ok: false, error: "Automatisation inconnue." };
  const parsed = schemaParametres(cle).safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Réglages invalides" };

  const supabase = createClient();
  const { error } = await supabase.from("automatisations").update({ parametres: parsed.data }).eq("cle", cle);
  if (error) return { ok: false, error: ERREUR };
  // Une seule source de vérité pour le seuil DLC : il pilote aussi l'alerte « DLC proche » des stocks.
  if (cle === "alertes_dlc") {
    await supabase.from("parametres").upsert({ cle: "seuil_dlc_jours", valeur: (parsed.data as { seuil_dlc_jours: number }).seuil_dlc_jours });
    revalidatePath("/stocks");
  }
  revalidatePath("/automatisations");
  return { ok: true };
}
