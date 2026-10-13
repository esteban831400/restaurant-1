import { z } from "zod";

export const MAX_MESSAGE = 2_000;
export const MAX_MESSAGES_CONVERSATION = 100;
export const LIMITE_MESSAGES = { fenetreMinutes: 10, maximum: 20 };

export type MessageAssistant = { role: "user" | "assistant"; contenu: string; date: string; outils?: string[] };

export const requeteAssistantSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  message: z.string().trim().min(1, "Écrivez votre question").max(MAX_MESSAGE, `${MAX_MESSAGE} caractères maximum`),
});

export const SUGGESTIONS = [
  "Qu'est-ce qui manque cette semaine ?",
  "Relance les fournisseurs en retard",
  "Quels produits ont une DLC proche ?",
  "Prépare les commandes des produits sous le seuil",
];
export const SUGGESTIONS_GERANT = ["Résume les appels d'hier"];

/** Derniers messages envoyés comme contexte au service (texte tronqué pour limiter la taille). */
export function construireHistorique(messages: MessageAssistant[], max = 10) {
  return messages.slice(-max).map((m) => ({ role: m.role, contenu: m.contenu.slice(0, 4_000) }));
}

export function titreConversation(premierMessage: string): string {
  const t = premierMessage.replace(/\s+/g, " ").trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

/** Garde les 100 derniers messages d'une conversation. */
export function limiterMessages(messages: MessageAssistant[]): MessageAssistant[] {
  return messages.slice(-MAX_MESSAGES_CONVERSATION);
}

/**
 * Le service peut répondre `{ reponse, outils_utilises }`, ou (selon la façon dont le flux est construit)
 * `{ output }`, `{ text }`, une simple chaîne, ou un tableau contenant l'un de ces objets.
 */
export function lireReponseService(corps: unknown): { reponse: string; outils: string[] } | null {
  const premier = Array.isArray(corps) ? corps[0] : corps;
  let texte: unknown;
  let outils: unknown = [];
  if (typeof premier === "string") texte = premier;
  else if (premier && typeof premier === "object") {
    const o = premier as Record<string, unknown>;
    texte = o.reponse ?? o.output ?? o.text ?? o.message;
    outils = o.outils_utilises ?? [];
  }
  if (typeof texte !== "string" || !texte.trim()) return null;
  const liste = Array.isArray(outils) ? outils.filter((x): x is string => typeof x === "string").slice(0, 20).map((x) => x.slice(0, 80)) : [];
  return { reponse: texte.trim().slice(0, 8_000), outils: liste };
}

export function limiteAtteinte(nombreRecent: number): boolean {
  return nombreRecent >= LIMITE_MESSAGES.maximum;
}
