"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { peutEtreRecue, type StatutCommande } from "@/lib/commandes/statuts";
import { createClient } from "@/lib/supabase/server";
import { produitsPourCommande } from "@/server/queries/commandes";
import { listFournisseursOptions, listPoles } from "@/server/queries/stock";
import type { CommandeAReceptionner, DonneesFormulaires, LigneReception, ProduitMouvement, ResultatRecherche } from "@/types/ajout-rapide";

/** Données des formulaires de création, chargées à l'ouverture du panneau (la RLS limite déjà au pôle de l'utilisateur). */
export async function chargerDonneesAjout(avecProduits: boolean): Promise<DonneesFormulaires> {
  const session = await requireSession(["gerant", "responsable"]);
  const [poles, fournisseurs, produits] = await Promise.all([listPoles(), listFournisseursOptions(), avecProduits ? produitsPourCommande() : Promise.resolve([])]);
  const defaut = session.poleId ?? poles.find((p) => p.cle === "restaurant")?.id ?? poles[0]?.id ?? "";
  return { poles, fournisseurs, produits, poleParDefaut: defaut, poleFixe: session.role !== "gerant" };
}

export async function chargerProduitsMouvement(): Promise<ProduitMouvement[]> {
  await requireSession();
  const { data } = await createClient().from("produits").select("id, nom, unite, dlc_suivie").eq("actif", true).order("nom").limit(1000);
  return data ?? [];
}

export async function chargerCommandesAReceptionner(): Promise<CommandeAReceptionner[]> {
  await requireSession(["gerant", "responsable"]);
  const { data } = await createClient().from("commandes").select("id, numero, date_livraison_prevue, fournisseurs(nom)").in("statut", ["envoyee", "confirmee", "en_retard"]).order("date_livraison_prevue", { ascending: true, nullsFirst: false }).limit(100);
  return ((data ?? []) as unknown as { id: string; numero: number; date_livraison_prevue: string | null; fournisseurs: { nom: string } | null }[]).map((c) => ({ id: c.id, numero: c.numero, fournisseur: c.fournisseurs?.nom ?? "—", date_livraison_prevue: c.date_livraison_prevue }));
}

export async function chargerLignesReception(commandeId: string): Promise<LigneReception[] | null> {
  await requireSession(["gerant", "responsable"]);
  if (!z.string().uuid().safeParse(commandeId).success) return null;
  const { data } = await createClient().from("commandes").select("statut, commande_lignes(produit_id, quantite, produits(nom, unite))").eq("id", commandeId).maybeSingle();
  if (!data || !peutEtreRecue(data.statut as StatutCommande)) return null;
  return (data.commande_lignes as unknown as { produit_id: string; quantite: number; produits: { nom: string; unite: string } | null }[]).map((l) => ({
    produit_id: l.produit_id, nom: l.produits?.nom ?? "—", unite: l.produits?.unite ?? "", quantite: Number(l.quantite),
  }));
}

/** Recherche globale (palette Ctrl/⌘ + K) : produits, fournisseurs et commandes visibles par l'utilisateur. */
export async function rechercheGlobale(q: string): Promise<ResultatRecherche[]> {
  const session = await requireSession();
  const terme = String(q ?? "").replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
  if (terme.length < 2) return [];
  const supabase = createClient();
  const peutGerer = session.role !== "salarie";

  const [produits, fournisseurs, commandes] = await Promise.all([
    supabase.from("v_produits_stock").select("id, nom, categorie, stock_actuel, unite, niveau").eq("actif", true).or(`nom.ilike.%${terme}%,categorie.ilike.%${terme}%`).order("nom").limit(6),
    peutGerer ? supabase.from("fournisseurs").select("id, nom, contact").or(`nom.ilike.%${terme}%,contact.ilike.%${terme}%`).order("nom").limit(5) : Promise.resolve({ data: [] }),
    peutGerer
      ? (/^\d{1,9}$/.test(terme)
          ? supabase.from("commandes").select("id, numero, statut, fournisseurs(nom)").eq("numero", Number(terme)).limit(5)
          : supabase.from("commandes").select("id, numero, statut, fournisseurs!inner(nom)").ilike("fournisseurs.nom", `%${terme}%`).order("created_at", { ascending: false }).limit(5))
      : Promise.resolve({ data: [] }),
  ]);

  return [
    ...(produits.data ?? []).map<ResultatRecherche>((p) => ({ id: `p-${p.id}`, groupe: "Produits", libelle: p.nom, detail: `${Number(p.stock_actuel)} ${p.unite} en stock${p.niveau === "rouge" ? " · sous le seuil" : ""}`, href: `/stocks/produits/${p.id}` })),
    ...((fournisseurs.data ?? []) as { id: string; nom: string; contact: string | null }[]).map<ResultatRecherche>((f) => ({ id: `f-${f.id}`, groupe: "Fournisseurs", libelle: f.nom, detail: f.contact ?? undefined, href: `/fournisseurs/${f.id}` })),
    ...((commandes.data ?? []) as unknown as { id: string; numero: number; statut: string; fournisseurs: { nom: string } | null }[]).map<ResultatRecherche>((c) => ({ id: `c-${c.id}`, groupe: "Commandes", libelle: `Commande n°${c.numero}`, detail: c.fournisseurs?.nom, href: `/commandes/${c.id}` })),
  ];
}
