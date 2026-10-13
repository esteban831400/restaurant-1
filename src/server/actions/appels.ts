"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/stock";

const retentionSchema = z.number({ message: "Saisissez un nombre de jours" }).int("Nombre entier attendu").min(7, "7 jours minimum").max(3650, "10 ans maximum");

export async function modifierRetention(jours: unknown): Promise<ActionResult> {
  await requireSession(["gerant"]);
  const parsed = retentionSchema.safeParse(jours);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Valeur invalide" };
  const { error } = await createClient().from("parametres").upsert({ cle: "retention_appels_jours", valeur: parsed.data });
  if (error) return { ok: false, error: "Une erreur est survenue. Réessayez." };
  revalidatePath("/appels");
  return { ok: true };
}
