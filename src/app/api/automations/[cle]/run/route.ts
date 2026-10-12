import { NextResponse } from "next/server";
import { estCle, urlWebhook, type AdressesWebhooks } from "@/lib/automatisations/definitions";
import { getSessionOrNull } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { callN8n } from "@/lib/webhooks/n8n-client";
import { erreurJson } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";

/** « Lancer maintenant » : réservé au gérant. L'adresse du webhook et le secret ne quittent jamais le serveur. */
export async function POST(_request: Request, { params }: { params: { cle: string } }) {
  const session = await getSessionOrNull();
  if (!session) return erreurJson(401, "non_connecte", "Connectez-vous pour continuer.");
  if (session.role !== "gerant") return erreurJson(403, "acces_refuse", "Réservé au gérant.");
  if (!estCle(params.cle)) return erreurJson(404, "automatisation_inconnue", "Automatisation inconnue.");

  const db = createAdminClient();
  const { data: auto } = await db.from("automatisations").select("cle, nom, actif").eq("cle", params.cle).maybeSingle();
  if (!auto) return erreurJson(404, "automatisation_inconnue", "Automatisation inconnue.");
  if (!auto.actif) return erreurJson(409, "desactivee", "Cette automatisation est désactivée : activez-la avant de la lancer.");

  const env = serverEnv();
  const { data: reglage } = await db.from("parametres").select("valeur").eq("cle", "webhooks_n8n").maybeSingle();
  const url = urlWebhook(params.cle, (reglage?.valeur ?? {}) as AdressesWebhooks, { orderSend: env.N8N_WEBHOOK_ORDER_SEND, assistant: env.N8N_WEBHOOK_ASSISTANT });
  if (!url) return erreurJson(409, "non_branchee", "Cette automatisation n'est pas encore branchée : renseignez son adresse dans Paramètres.");

  const recent = await db.from("executions_automatisations").select("id").eq("automatisation_cle", params.cle).eq("statut", "en_cours").gte("debut", new Date(Date.now() - 2 * 60_000).toISOString()).limit(1);
  if (recent.data?.length) return erreurJson(409, "deja_en_cours", "Une exécution est déjà en cours.");

  const { data: exec, error } = await db.from("executions_automatisations").insert({ automatisation_cle: params.cle, statut: "en_cours", declenche_par: "manuel" }).select("id").single();
  if (error || !exec) return erreurJson(500, "erreur_interne", "Lancement impossible.");

  const res = await callN8n(url, { automation: params.cle, execution_id: exec.id, declenche_par: "manuel", demande_par: session.id });
  if (!res.ok) {
    const fin = new Date().toISOString();
    const message = res.status ? `Le service d'automatisation a répondu avec une erreur (${res.status}).` : "Le service d'automatisation est injoignable.";
    await db.from("executions_automatisations").update({ statut: "echec", fin, erreur: message }).eq("id", exec.id);
    await db.from("automatisations").update({ derniere_execution: fin, dernier_statut: "echec" }).eq("cle", params.cle);
    await db.from("notifications").insert({ type: "echec_automatisation", titre: `Échec : ${auto.nom}`, corps: message, lien: `/automatisations/${params.cle}/historique` });
    return erreurJson(502, "service_injoignable", message);
  }
  await db.from("automatisations").update({ derniere_execution: new Date().toISOString(), dernier_statut: "en_cours" }).eq("cle", params.cle);
  return NextResponse.json({ execution_id: exec.id, statut: "en_cours" }, { status: 202 });
}
