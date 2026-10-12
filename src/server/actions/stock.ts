"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { quantiteSignee } from "@/lib/stock/alertes";
import { parseCsv, parseNombre } from "@/lib/csv/csv";
import { ligneImportSchema, mouvementSchema, produitSchema } from "@/lib/validators/stock";
import type { ActionResult } from "@/types/stock";

const ERREUR_GENERIQUE = "Une erreur est survenue. Réessayez.";
const premiereErreur = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Données invalides";

export async function creerProduit(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession(["gerant", "responsable"]);
  const parsed = produitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiereErreur(parsed.error) };
  const v = parsed.data;
  if (session.role === "responsable" && v.pole_id !== session.poleId) {
    return { ok: false, error: "Vous ne pouvez créer des produits que pour votre pôle." };
  }
  const { data, error } = await createClient()
    .from("produits")
    .insert({ ...v, fournisseur_id: v.fournisseur_id || null })
    .select("id")
    .single();
  if (error) return { ok: false, error: ERREUR_GENERIQUE };
  revalidatePath("/stocks");
  return { ok: true, data: { id: data.id } };
}

export async function modifierProduit(id: string, input: unknown): Promise<ActionResult> {
  await requireSession(["gerant", "responsable"]);
  const parsed = produitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiereErreur(parsed.error) };
  const v: Partial<typeof parsed.data> = { ...parsed.data };
  delete v.pole_id; // le pôle d'un produit ne change pas
  const { error } = await createClient()
    .from("produits")
    .update({ ...v, fournisseur_id: v.fournisseur_id || null })
    .eq("id", id);
  if (error) return { ok: false, error: ERREUR_GENERIQUE };
  revalidatePath("/stocks");
  revalidatePath(`/stocks/produits/${id}`);
  return { ok: true };
}

export async function archiverProduits(ids: string[]): Promise<ActionResult> {
  await requireSession(["gerant", "responsable"]);
  if (!ids.length) return { ok: false, error: "Aucun produit sélectionné." };
  const { error } = await createClient().from("produits").update({ actif: false }).in("id", ids);
  if (error) return { ok: false, error: ERREUR_GENERIQUE };
  revalidatePath("/stocks");
  return { ok: true };
}

export async function restaurerProduits(ids: string[]): Promise<ActionResult> {
  await requireSession(["gerant", "responsable"]);
  const { error } = await createClient().from("produits").update({ actif: true }).in("id", ids);
  if (error) return { ok: false, error: ERREUR_GENERIQUE };
  revalidatePath("/stocks");
  return { ok: true };
}

export async function enregistrerMouvement(input: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = mouvementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiereErreur(parsed.error) };
  const v = parsed.data;
  const supabase = createClient();

  const { data: produit } = await supabase
    .from("v_produits_stock")
    .select("stock_actuel, dlc_suivie, nom")
    .eq("id", v.produit_id)
    .maybeSingle();
  if (!produit) return { ok: false, error: "Produit introuvable." };

  const quantite = quantiteSignee(v.type, v.quantite);
  if (Number(produit.stock_actuel) + quantite < 0) {
    return { ok: false, error: `Stock insuffisant : ${produit.stock_actuel} disponible.` };
  }

  const { data: mvt, error } = await supabase
    .from("mouvements_stock")
    .insert({ produit_id: v.produit_id, type: v.type, quantite, motif: v.motif || null, user_id: session.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: ERREUR_GENERIQUE };

  if (v.type === "entree" && produit.dlc_suivie && v.dlc) {
    await supabase.from("lots").insert({ produit_id: v.produit_id, dlc: v.dlc, quantite, mouvement_id: mvt.id });
  }
  revalidatePath("/stocks");
  revalidatePath(`/stocks/produits/${v.produit_id}`);
  return { ok: true };
}

const COLONNES_IMPORT = ["nom", "categorie", "unite", "lieu_stockage", "fournisseur", "prix_achat", "seuil_min", "qte_reappro", "dlc_suivie", "stock_initial"];

/** Import tout-ou-rien : la moindre ligne invalide annule l'ensemble et est signalée avec son numéro. */
export async function importerProduits(csv: string, poleId: string): Promise<ActionResult<{ crees: number }> & { erreurs?: string[] }> {
  const session = await requireSession(["gerant", "responsable"]);
  if (session.role === "responsable" && poleId !== session.poleId) {
    return { ok: false, error: "Vous ne pouvez importer que dans votre pôle." };
  }
  if (csv.length > 2_000_000) return { ok: false, error: "Fichier trop volumineux (2 Mo maximum)." };

  const [entete, ...lignes] = parseCsv(csv);
  if (!entete) return { ok: false, error: "Le fichier est vide." };
  const cols = entete.map((c) => c.trim().toLowerCase());
  const manquantes = ["nom", "unite"].filter((c) => !cols.includes(c));
  if (manquantes.length) return { ok: false, error: `Colonnes manquantes : ${manquantes.join(", ")}. Colonnes attendues : ${COLONNES_IMPORT.join("; ")}.` };
  if (lignes.length > 2000) return { ok: false, error: "2000 lignes maximum par import." };

  const supabase = createClient();
  const { data: fournisseurs } = await supabase.from("fournisseurs").select("id, nom");
  const parNom = new Map((fournisseurs ?? []).map((f) => [f.nom.trim().toLowerCase(), f.id]));

  const erreurs: string[] = [];
  const valides: { ligne: ReturnType<typeof ligneImportSchema.parse>; fournisseur_id: string | null }[] = [];
  lignes.forEach((cells, i) => {
    const get = (c: string) => (cells[cols.indexOf(c)] ?? "").trim();
    const fournisseurNom = get("fournisseur");
    const r = ligneImportSchema.safeParse({
      nom: get("nom"),
      categorie: get("categorie"),
      unite: get("unite") === "pièce" || get("unite") === "pc" ? "piece" : get("unite"),
      lieu_stockage: get("lieu_stockage"),
      prix_achat: parseNombre(get("prix_achat")),
      seuil_min: parseNombre(get("seuil_min")),
      qte_reappro: parseNombre(get("qte_reappro")),
      dlc_suivie: ["oui", "1", "true", "vrai"].includes(get("dlc_suivie").toLowerCase()),
      stock_initial: parseNombre(get("stock_initial")),
    });
    const numero = i + 2;
    if (!r.success) erreurs.push(`Ligne ${numero} : ${premiereErreur(r.error)}`);
    else if (fournisseurNom && !parNom.has(fournisseurNom.toLowerCase())) erreurs.push(`Ligne ${numero} : fournisseur « ${fournisseurNom} » inconnu`);
    else valides.push({ ligne: r.data, fournisseur_id: fournisseurNom ? parNom.get(fournisseurNom.toLowerCase())! : null });
  });
  if (erreurs.length) return { ok: false, error: `${erreurs.length} ligne(s) invalide(s). Aucun produit importé.`, erreurs: erreurs.slice(0, 50) };
  if (!valides.length) return { ok: false, error: "Aucune ligne à importer." };

  const { data: crees, error } = await supabase
    .from("produits")
    .insert(valides.map(({ ligne, fournisseur_id }) => ({
      nom: ligne.nom, categorie: ligne.categorie, unite: ligne.unite, lieu_stockage: ligne.lieu_stockage,
      prix_achat: ligne.prix_achat, seuil_min: ligne.seuil_min, qte_reappro: ligne.qte_reappro,
      dlc_suivie: ligne.dlc_suivie, fournisseur_id, pole_id: poleId,
    })))
    .select("id");
  if (error || !crees) return { ok: false, error: ERREUR_GENERIQUE };

  const initiaux = valides
    .map((v, i) => ({ produit_id: crees[i].id, type: "entree" as const, quantite: v.ligne.stock_initial, motif: "Stock initial (import)", user_id: session.id }))
    .filter((m) => m.quantite > 0);
  if (initiaux.length) await supabase.from("mouvements_stock").insert(initiaux);

  revalidatePath("/stocks");
  return { ok: true, data: { crees: crees.length } };
}

export async function creerInventaire(poleId: string): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (session.role !== "gerant" && poleId !== session.poleId) return { ok: false, error: "Pôle non autorisé." };
  const { data, error } = await createClient()
    .from("inventaires")
    .insert({ pole_id: poleId, cree_par: session.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: ERREUR_GENERIQUE };
  revalidatePath("/stocks/inventaire");
  return { ok: true, data: { id: data.id } };
}

/** Enregistre les produits comptés ; qte_theorique = stock calculé à cet instant. */
export async function enregistrerComptage(inventaireId: string, comptes: { produit_id: string; qte_comptee: number }[], terminer: boolean): Promise<ActionResult> {
  await requireSession();
  const supabase = createClient();
  if (comptes.some((c) => !(c.qte_comptee >= 0))) return { ok: false, error: "Les quantités comptées doivent être positives." };

  if (comptes.length) {
    const { data: stocks } = await supabase.from("v_stock_actuel").select("produit_id, stock_actuel").in("produit_id", comptes.map((c) => c.produit_id));
    const theorique = new Map((stocks ?? []).map((s) => [s.produit_id, Number(s.stock_actuel)]));
    const { error } = await supabase.from("inventaire_lignes").upsert(
      comptes.map((c) => ({ inventaire_id: inventaireId, produit_id: c.produit_id, qte_theorique: theorique.get(c.produit_id) ?? 0, qte_comptee: c.qte_comptee })),
      { onConflict: "inventaire_id,produit_id" },
    );
    if (error) return { ok: false, error: ERREUR_GENERIQUE };
  }
  if (terminer) {
    const { error } = await supabase.from("inventaires").update({ statut: "a_valider" }).eq("id", inventaireId).eq("statut", "en_cours");
    if (error) return { ok: false, error: ERREUR_GENERIQUE };
  }
  revalidatePath(`/stocks/inventaire/${inventaireId}`);
  revalidatePath("/stocks/inventaire");
  return { ok: true };
}

export async function validerInventaire(inventaireId: string): Promise<ActionResult> {
  await requireSession(["gerant", "responsable"]);
  const { error } = await createClient().rpc("valider_inventaire", { p_inventaire: inventaireId });
  if (error) return { ok: false, error: "Validation impossible : " + error.message };
  revalidatePath("/stocks");
  revalidatePath("/stocks/inventaire");
  return { ok: true };
}
