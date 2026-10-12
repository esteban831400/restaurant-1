import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/auth/session";
import { construireHistorique, limiteAtteinte, limiterMessages, lireReponseService, LIMITE_MESSAGES, requeteAssistantSchema, titreConversation, type MessageAssistant } from "@/lib/assistant/assistant";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { callN8n } from "@/lib/webhooks/n8n-client";
import { erreurJson } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // l'assistant peut mettre jusqu'à 30 s à répondre

/**
 * Pose une question à l'assistant. L'identité et le rôle sont lus ici, depuis la session vérifiée
 * côté serveur : rien de ce que le navigateur envoie ne peut les modifier.
 */
export async function POST(request: Request) {
  const session = await getSessionOrNull();
  if (!session) return erreurJson(401, "non_connecte", "Connectez-vous pour continuer.");
  if (session.role === "salarie") return erreurJson(403, "acces_refuse", "L'assistant est réservé au gérant et aux responsables.");

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return erreurJson(400, "json_invalide", "Requête invalide.");
  }
  const parsed = requeteAssistantSchema.safeParse(json);
  if (!parsed.success) return erreurJson(400, "donnees_invalides", parsed.error.issues[0]?.message ?? "Question invalide.");
  const { message, conversation_id } = parsed.data;

  const admin = createAdminClient();
  const { data: auto } = await admin.from("automatisations").select("actif").eq("cle", "assistant_ia").maybeSingle();
  if (!auto?.actif) return erreurJson(409, "desactivee", "L'assistant est désactivé. Le gérant peut l'activer dans Automatisations.");

  const depuis = new Date(Date.now() - LIMITE_MESSAGES.fenetreMinutes * 60_000).toISOString();
  const { count } = await admin.from("actions_agent").select("id", { count: "exact", head: true }).eq("user_id", session.id).gte("date", depuis);
  if (limiteAtteinte(count ?? 0)) return erreurJson(429, "trop_de_questions", "Trop de questions en peu de temps. Patientez quelques minutes.");

  // La conversation doit appartenir à l'utilisateur (RLS) ; un identifiant d'autrui est simplement introuvable.
  const supabase = createClient();
  let existants: MessageAssistant[] = [];
  if (conversation_id) {
    const { data: conv } = await supabase.from("conversations_assistant").select("messages").eq("id", conversation_id).maybeSingle();
    if (!conv) return erreurJson(404, "conversation_introuvable", "Conversation introuvable.");
    existants = conv.messages as MessageAssistant[];
  }
  const idConversation = conversation_id ?? randomUUID();

  const env = serverEnv();
  const res = await callN8n(env.N8N_WEBHOOK_ASSISTANT, {
    conversation_id: idConversation,
    message,
    historique: construireHistorique(existants),
    utilisateur: { id: session.id, nom: session.nomComplet, role: session.role, pole_id: session.poleId },
  }, 30_000);
  if (!res.ok) {
    return erreurJson(502, "assistant_indisponible", res.status ? "L'assistant n'a pas pu répondre. Réessayez dans un instant." : "L'assistant met trop de temps à répondre. Réessayez.");
  }
  const lue = lireReponseService(res.body);
  if (!lue) return erreurJson(502, "reponse_vide", "L'assistant n'a pas fourni de réponse. Reformulez votre question.");

  const maintenant = new Date().toISOString();
  const reponse: MessageAssistant = { role: "assistant", contenu: lue.reponse, date: maintenant, ...(lue.outils.length ? { outils: lue.outils } : {}) };
  const messages = limiterMessages([...existants, { role: "user", contenu: message, date: maintenant }, reponse]);

  const { error } = conversation_id
    ? await supabase.from("conversations_assistant").update({ messages }).eq("id", conversation_id)
    : await supabase.from("conversations_assistant").insert({ id: idConversation, user_id: session.id, titre: titreConversation(message), messages });
  if (error) return erreurJson(500, "erreur_interne", "La réponse n'a pas pu être enregistrée.");

  await admin.from("actions_agent").insert({ user_id: session.id, demande: message, reponse: lue.reponse, outils_utilises: lue.outils });
  return NextResponse.json({ conversation_id: idConversation, message: reponse });
}
