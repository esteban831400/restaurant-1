import type { Role } from "@/lib/auth/roles";

export type StatutCommande = "brouillon" | "a_valider" | "envoyee" | "confirmee" | "livree" | "cloturee" | "annulee" | "en_retard";

export const STATUTS: StatutCommande[] = ["brouillon", "a_valider", "envoyee", "confirmee", "livree", "cloturee", "annulee", "en_retard"];

export const STATUT_LABELS: Record<StatutCommande, string> = {
  brouillon: "Brouillon",
  a_valider: "À valider",
  envoyee: "Envoyée",
  confirmee: "Confirmée",
  livree: "Livrée",
  cloturee: "Clôturée",
  annulee: "Annulée",
  en_retard: "En retard",
};

export type TransitionManuelle = { vers: StatutCommande; label: string; destructive?: boolean };

/** Transitions proposées à la main (hors « Valider et envoyer » et réception, qui ont leurs propres boutons). */
export function transitionsManuelles(statut: StatutCommande, role: Role): TransitionManuelle[] {
  if (role === "salarie") return [];
  const annuler: TransitionManuelle = { vers: "annulee", label: "Annuler la commande", destructive: true };
  switch (statut) {
    case "brouillon": return [{ vers: "a_valider", label: "Soumettre à validation" }, annuler];
    case "a_valider": return [annuler];
    case "envoyee": return [{ vers: "confirmee", label: "Marquer comme confirmée" }, annuler];
    case "en_retard": return [{ vers: "confirmee", label: "Marquer comme confirmée" }, annuler];
    case "confirmee": return [annuler];
    case "livree": return [{ vers: "cloturee", label: "Clôturer la commande" }];
    default: return [];
  }
}

export const peutEtreModifiee = (s: StatutCommande) => s === "brouillon" || s === "a_valider";
export const peutEtreValideeEtEnvoyee = (s: StatutCommande) => s === "brouillon" || s === "a_valider";
export const peutEtreRecue = (s: StatutCommande) => s === "envoyee" || s === "confirmee" || s === "en_retard";

/** Statuts que n8n peut poser, et depuis quels statuts. n8n ne peut jamais valider ni créer autre chose qu'un brouillon. */
const TRANSITIONS_N8N: Partial<Record<StatutCommande, StatutCommande[]>> = {
  envoyee: ["brouillon", "a_valider"], // seulement si le gérant a validé (valide_par renseigné), vérifié par la route
  confirmee: ["envoyee", "en_retard"],
  en_retard: ["envoyee", "confirmee"],
};

export function transitionN8nValide(de: StatutCommande, vers: StatutCommande): boolean {
  return TRANSITIONS_N8N[vers]?.includes(de) ?? false;
}
