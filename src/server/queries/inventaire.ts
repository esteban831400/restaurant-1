import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Inventaire = { id: string; pole_id: string; statut: "en_cours" | "a_valider" | "valide"; created_at: string; poles: { nom: string } | null };

export const STATUT_INVENTAIRE = { en_cours: "En cours de comptage", a_valider: "À valider", valide: "Validé" } as const;

export async function listInventaires(): Promise<Inventaire[]> {
  const { data } = await createClient()
    .from("inventaires")
    .select("id, pole_id, statut, created_at, poles(nom)")
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as unknown as Inventaire[];
}

export async function getInventaire(id: string) {
  const supabase = createClient();
  const { data: inv } = await supabase.from("inventaires").select("id, pole_id, statut, created_at, poles(nom)").eq("id", id).maybeSingle();
  if (!inv) return null;
  const [{ data: produits }, { data: lignes }] = await Promise.all([
    supabase.from("produits").select("id, nom, unite, categorie").eq("pole_id", inv.pole_id).eq("actif", true).order("categorie").order("nom").limit(500),
    supabase.from("inventaire_lignes").select("produit_id, qte_theorique, qte_comptee, ecart").eq("inventaire_id", id),
  ]);
  return { inventaire: inv as unknown as Inventaire, produits: produits ?? [], lignes: lignes ?? [] };
}
