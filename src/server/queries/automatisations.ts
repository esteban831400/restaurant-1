import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CleAutomatisation } from "@/lib/automatisations/definitions";

export const PAGE_SIZE = 20;

export type Automatisation = {
  cle: CleAutomatisation; nom: string; description: string; actif: boolean;
  parametres: Record<string, unknown>; derniere_execution: string | null; dernier_statut: "succes" | "echec" | "en_cours" | null;
};
export type Execution = {
  id: string; automatisation_cle: string; debut: string; fin: string | null;
  statut: "succes" | "echec" | "en_cours"; resume: string | null; erreur: string | null; declenche_par: "planifie" | "manuel";
};

export async function listAutomatisations(): Promise<Automatisation[]> {
  const { data } = await createClient().from("automatisations").select("cle, nom, description, actif, parametres, derniere_execution, dernier_statut");
  const ordre = ["alerte_seuil", "envoi_commandes", "relances", "lecture_factures", "standard_ia", "alertes_dlc", "rapport_hebdo", "assistant_ia"];
  return ((data ?? []) as Automatisation[]).sort((a, b) => ordre.indexOf(a.cle) - ordre.indexOf(b.cle));
}

export async function getAutomatisation(cle: string) {
  const { data } = await createClient().from("automatisations").select("cle, nom, description").eq("cle", cle).maybeSingle();
  return data;
}

export async function listExecutions(cle: string, page: number) {
  const { data, count } = await createClient()
    .from("executions_automatisations")
    .select("id, automatisation_cle, debut, fin, statut, resume, erreur, declenche_par", { count: "exact" })
    .eq("automatisation_cle", cle)
    .order("debut", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  return { executions: (data ?? []) as Execution[], total: count ?? 0 };
}

export async function centreValidation() {
  const supabase = createClient();
  const [commandes, livraisons, relances] = await Promise.all([
    supabase.from("commandes").select("id, numero, statut, source, total_estime, date_livraison_prevue, created_at, fournisseurs(nom), commande_lignes(id)").in("statut", ["brouillon", "a_valider"]).order("created_at", { ascending: false }).limit(50),
    supabase.from("livraisons").select("id, fournisseur_nom, donnees_extraites, fichier_url, commande_id, created_at, livraison_lignes(qte_recue, produits(nom, unite))").eq("statut", "a_verifier").order("created_at", { ascending: false }).limit(50),
    supabase.from("relances").select("id, message, created_at, commandes(id, numero, fournisseurs(nom))").eq("statut", "a_confirmer").order("created_at", { ascending: false }).limit(50),
  ]);
  return {
    commandes: (commandes.data ?? []) as unknown as { id: string; numero: number; statut: "brouillon" | "a_valider"; source: string; total_estime: number; date_livraison_prevue: string | null; created_at: string; fournisseurs: { nom: string } | null; commande_lignes: { id: string }[] }[],
    livraisons: (livraisons.data ?? []) as unknown as { id: string; fournisseur_nom: string | null; donnees_extraites: Record<string, unknown> | null; fichier_url: string | null; commande_id: string | null; created_at: string; livraison_lignes: { qte_recue: number; produits: { nom: string; unite: string } | null }[] }[],
    relances: (relances.data ?? []) as unknown as { id: string; message: string; created_at: string; commandes: { id: string; numero: number; fournisseurs: { nom: string } | null } | null }[],
  };
}
