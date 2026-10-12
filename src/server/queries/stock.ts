import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FournisseurOption, Pole, ProduitStock } from "@/types/stock";

export const PAGE_SIZE = 25;

export type FiltresProduits = { q?: string; pole?: string; niveau?: string; page?: number };

/** Retire les caractères qui casseraient le filtre PostgREST. */
function nettoyer(q: string) {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

export async function listPoles(): Promise<Pole[]> {
  const { data } = await createClient().from("poles").select("id, cle, nom, couleur").order("nom");
  return (data ?? []) as Pole[];
}

export async function listFournisseursOptions(): Promise<FournisseurOption[]> {
  const { data } = await createClient().from("fournisseurs").select("id, nom").order("nom");
  return data ?? [];
}

export async function listProduits(f: FiltresProduits) {
  const page = Math.max(1, f.page ?? 1);
  let query = createClient()
    .from("v_produits_stock")
    .select("*", { count: "exact" })
    .eq("actif", true)
    .order("nom")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const q = f.q ? nettoyer(f.q) : "";
  if (q) query = query.or(`nom.ilike.%${q}%,categorie.ilike.%${q}%`);
  if (f.pole) query = query.eq("pole_id", f.pole);
  if (f.niveau === "alerte") query = query.in("niveau", ["rouge", "orange"]);
  else if (f.niveau === "rouge" || f.niveau === "orange") query = query.eq("niveau", f.niveau);
  else if (f.niveau === "dlc") query = query.eq("dlc_proche", true);

  const { data, count, error } = await query;
  return { produits: (data ?? []) as ProduitStock[], total: count ?? 0, page, error: error?.message ?? null };
}

export async function getProduit(id: string): Promise<ProduitStock | null> {
  const { data } = await createClient().from("v_produits_stock").select("*").eq("id", id).maybeSingle();
  return (data as ProduitStock | null) ?? null;
}

export async function listMouvements(produitId: string, page = 1) {
  const { data, count } = await createClient()
    .from("mouvements_stock")
    .select("id, type, quantite, motif, created_at, profiles(nom_complet)", { count: "exact" })
    .eq("produit_id", produitId)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  return { mouvements: data ?? [], total: count ?? 0 };
}
