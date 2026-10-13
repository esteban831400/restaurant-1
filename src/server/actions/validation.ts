"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { urlWebhook, type AdressesWebhooks } from "@/lib/automatisations/definitions";
import { createClient } from "@/lib/supabase/server";
import { callN8n } from "@/lib/webhooks/n8n-client";
import type { ActionResult } from "@/types/stock";

const ERREUR = "Une erreur est survenue. Réessayez.";

function revalider() {
  revalidatePath("/a-valider");
  revalidatePath("/stocks");
  revalidatePath("/commandes");
}

export async function validerLivraison(id: string): Promise<ActionResult> {
  await requireSession(["gerant"]);
  const { error } = await createClient().rpc("valider_livraison", { p_livraison: id });
  if (error) return { ok: false, error: error.message.replace(/^.*?:\s*/, "") || ERREUR };
  revalider();
  return { ok: true };
}

export async function rejeterLivraison(id: string): Promise<ActionResult> {
  await requireSession(["gerant"]);
  const { error } = await createClient().from("livraisons").delete().eq("id", id).eq("statut", "a_verifier");
  if (error) return { ok: false, error: ERREUR };
  revalider();
  return { ok: true };
}

/** Confirmer une relance : elle n'est envoyée au fournisseur qu'à cet instant. */
export async function confirmerRelance(id: string): Promise<ActionResult> {
  const session = await requireSession(["gerant"]);
  const supabase = createClient();
  const { data: relance } = await supabase.from("relances").select("id, commande_id, message, statut").eq("id", id).maybeSingle();
  if (!relance || relance.statut !== "a_confirmer") return { ok: false, error: "Cette relance a déjà été traitée." };

  const [{ data: auto }, { data: reglage }] = await Promise.all([
    supabase.from("automatisations").select("actif").eq("cle", "relances").maybeSingle(),
    supabase.from("parametres").select("valeur").eq("cle", "webhooks_n8n").maybeSingle(),
  ]);
  if (!auto?.actif) return { ok: false, error: "Les relances fournisseurs sont désactivées : activez-les dans Automatisations." };
  const env = serverEnv();
  const url = urlWebhook("relances", (reglage?.valeur ?? {}) as AdressesWebhooks, { orderSend: env.N8N_WEBHOOK_ORDER_SEND, assistant: env.N8N_WEBHOOK_ASSISTANT });
  if (!url) return { ok: false, error: "Les relances ne sont pas encore branchées : renseignez leur adresse dans Paramètres." };

  const res = await callN8n(url, { type: "send_reminder", relance_id: relance.id, commande_id: relance.commande_id, message: relance.message });
  if (!res.ok) return { ok: false, error: "L'envoi de la relance a échoué. Réessayez dans un instant." };

  const maintenant = new Date().toISOString();
  await supabase.from("relances").update({ statut: "envoyee", traite_par: session.id, traite_le: maintenant }).eq("id", id).eq("statut", "a_confirmer");
  await supabase.from("commandes").update({ derniere_relance: maintenant }).eq("id", relance.commande_id);
  revalider();
  return { ok: true };
}

export async function rejeterRelance(id: string): Promise<ActionResult> {
  const session = await requireSession(["gerant"]);
  const { error } = await createClient().from("relances").update({ statut: "rejetee", traite_par: session.id, traite_le: new Date().toISOString() }).eq("id", id).eq("statut", "a_confirmer");
  if (error) return { ok: false, error: ERREUR };
  revalider();
  return { ok: true };
}
