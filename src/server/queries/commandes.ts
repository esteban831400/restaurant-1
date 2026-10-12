import "server-only";
import { createClient } from "@/lib/supabase/server";
import { evolutionPrix, statsFournisseur, type LignePrix, type LivraisonStat } from "@/lib/commandes/stats";
import type { StatutCommande } from "@/lib/commandes/statuts";

export const PAGE_SIZE = 25;

export type CommandeListe = {
  id: string; numero: number; statut: StatutCommande; source: string; total_estime: number;
  date_envoi: string | null; date_livraison_prevue: string | null; created_at: string; pole_id: string;
  fournisseurs: { nom: string } | null;
};

export async function listCommandes(f: { statut?: string; pole?: string; fournisseur?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  let q = createClient()
    .from("commandes")
    .select("id, numero, statut, source, total_estime, date_envoi, date_livraison_prevue, created_at, pole_id, fournisseurs(nom)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (f.statut) q = q.eq("statut", f.statut);
  if (f.pole) q = q.eq("pole_id", f.pole);
  if (f.fournisseur) q = q.eq("fournisseur_id", f.fournisseur);
  const { data, count, error } = await q;
  return { commandes: (data ?? []) as unknown as CommandeListe[], total: count ?? 0, page, error: error?.message ?? null };
}

export async function getCommande(id: string) {
  const supabase = createClient();
  const { data: commande } = await supabase
    .from("commandes")
    .select("*, fournisseurs(id, nom, email, telephone, mode_commande, minimum_commande, delai_jours), commande_lignes(id, produit_id, quantite, prix_unitaire, produits(nom, unite))")
    .eq("id", id)
    .maybeSingle();
  return commande;
}

export async function listFournisseurs(f: { q?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  let q = createClient().from("fournisseurs").select("id, nom, contact, email, telephone, mode_commande, delai_jours, pole_id", { count: "exact" }).order("nom").range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const terme = f.q?.replace(/[,()%*\\]/g, " ").trim();
  if (terme) q = q.or(`nom.ilike.%${terme}%,contact.ilike.%${terme}%`);
  const { data, count } = await q;
  return { fournisseurs: data ?? [], total: count ?? 0, page };
}

export async function getFournisseur(id: string) {
  const { data } = await createClient().from("fournisseurs").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function produitsDuFournisseur(id: string) {
  const { data } = await createClient().from("v_produits_stock").select("id, nom, unite, stock_actuel, niveau, prix_achat").eq("fournisseur_id", id).eq("actif", true).order("nom").limit(200);
  return data ?? [];
}

/** Délai réel, taux de livraisons conformes et évolution des prix, calculés sur les 100 dernières lignes de données. */
export async function statistiquesFournisseur(id: string) {
  const supabase = createClient();
  const [{ data: livs }, { data: lignes }] = await Promise.all([
    supabase.from("livraisons").select("recu_le, commandes(date_envoi), livraison_lignes(qte_commandee, qte_recue)").eq("fournisseur_id", id).eq("statut", "validee").order("recu_le", { ascending: false }).limit(100),
    supabase.from("commande_lignes").select("produit_id, prix_unitaire, produits(nom), commandes!inner(fournisseur_id, created_at)").eq("commandes.fournisseur_id", id).order("id", { ascending: false }).limit(300),
  ]);
  const stats = statsFournisseur(
    ((livs ?? []) as unknown as { recu_le: string | null; commandes: { date_envoi: string | null } | null; livraison_lignes: { qte_commandee: number; qte_recue: number }[] }[]).map<LivraisonStat>((l) => ({
      recu_le: l.recu_le, date_envoi: l.commandes?.date_envoi ?? null, lignes: l.livraison_lignes,
    })),
  );
  const prix = evolutionPrix(
    ((lignes ?? []) as unknown as { produit_id: string; prix_unitaire: number; produits: { nom: string } | null; commandes: { created_at: string } }[]).map<LignePrix>((l) => ({
      produit_id: l.produit_id, nom: l.produits?.nom ?? "—", prix_unitaire: Number(l.prix_unitaire), date: l.commandes.created_at,
    })),
  );
  return { stats, prix };
}

export async function commandesDuFournisseur(id: string) {
  const { data } = await createClient().from("commandes").select("id, numero, statut, total_estime, created_at").eq("fournisseur_id", id).order("created_at", { ascending: false }).limit(10);
  return (data ?? []) as { id: string; numero: number; statut: StatutCommande; total_estime: number; created_at: string }[];
}

export async function produitsPourCommande() {
  const { data } = await createClient().from("produits").select("id, nom, unite, prix_achat, qte_reappro, fournisseur_id, pole_id").eq("actif", true).order("nom").limit(1000);
  return (data ?? []) as { id: string; nom: string; unite: string; prix_achat: number; qte_reappro: number; fournisseur_id: string | null; pole_id: string }[];
}
