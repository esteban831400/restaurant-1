"use server";

import { revalidatePath } from "next/cache";
import { requireSession, type Session } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { callN8n } from "@/lib/webhooks/n8n-client";
import { peutEtreModifiee, peutEtreRecue, peutEtreValideeEtEnvoyee, transitionsManuelles, type StatutCommande } from "@/lib/commandes/statuts";
import { commandeSchema, fournisseurSchema, receptionSchema } from "@/lib/validators/commande";
import type { ActionResult } from "@/types/stock";

const ERREUR = "Une erreur est survenue. Réessayez.";
const premiere = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Données invalides";

function revalider(id?: string) {
  revalidatePath("/commandes");
  revalidatePath("/stocks");
  if (id) revalidatePath(`/commandes/${id}`);
}

/** Les prix viennent toujours de la base, jamais du navigateur. */
async function lignesAvecPrix(lignes: { produit_id: string; quantite: number }[], poleId: string) {
  const supabase = createClient();
  const { data: produits } = await supabase.from("produits").select("id, prix_achat").eq("pole_id", poleId).in("id", lignes.map((l) => l.produit_id));
  const prix = new Map((produits ?? []).map((p) => [p.id, Number(p.prix_achat)]));
  if (lignes.some((l) => !prix.has(l.produit_id))) return null;
  return lignes.map((l) => ({ ...l, prix_unitaire: prix.get(l.produit_id)! }));
}

function poleAutorise(session: Session, poleId: string) {
  return session.role === "gerant" || poleId === session.poleId;
}

export async function creerCommande(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession(["gerant", "responsable"]);
  const parsed = commandeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  const v = parsed.data;
  if (!poleAutorise(session, v.pole_id)) return { ok: false, error: "Pôle non autorisé." };
  const lignes = await lignesAvecPrix(v.lignes, v.pole_id);
  if (!lignes) return { ok: false, error: "Un produit n'appartient pas à ce pôle." };

  const supabase = createClient();
  const { data, error } = await supabase.from("commandes")
    .insert({ fournisseur_id: v.fournisseur_id, pole_id: v.pole_id, date_livraison_prevue: v.date_livraison_prevue || null, cree_par: session.id })
    .select("id").single();
  if (error || !data) return { ok: false, error: ERREUR };
  const { error: errL } = await supabase.from("commande_lignes").insert(lignes.map((l) => ({ ...l, commande_id: data.id })));
  if (errL) {
    await supabase.from("commandes").delete().eq("id", data.id);
    return { ok: false, error: ERREUR };
  }
  revalider();
  return { ok: true, data: { id: data.id } };
}

export async function modifierCommande(id: string, input: unknown): Promise<ActionResult> {
  const session = await requireSession(["gerant", "responsable"]);
  const parsed = commandeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  const v = parsed.data;
  const supabase = createClient();
  const { data: cmd } = await supabase.from("commandes").select("statut, pole_id").eq("id", id).maybeSingle();
  if (!cmd) return { ok: false, error: "Commande introuvable." };
  if (!peutEtreModifiee(cmd.statut as StatutCommande)) return { ok: false, error: "Cette commande ne peut plus être modifiée." };
  if (!poleAutorise(session, cmd.pole_id)) return { ok: false, error: "Pôle non autorisé." };
  const lignes = await lignesAvecPrix(v.lignes, cmd.pole_id);
  if (!lignes) return { ok: false, error: "Un produit n'appartient pas à ce pôle." };

  const { error } = await supabase.from("commandes").update({ fournisseur_id: v.fournisseur_id, date_livraison_prevue: v.date_livraison_prevue || null }).eq("id", id);
  if (error) return { ok: false, error: ERREUR };
  await supabase.from("commande_lignes").delete().eq("commande_id", id);
  const { error: errL } = await supabase.from("commande_lignes").insert(lignes.map((l) => ({ ...l, commande_id: id })));
  if (errL) return { ok: false, error: ERREUR };
  revalider(id);
  return { ok: true };
}

export async function changerStatut(id: string, vers: StatutCommande): Promise<ActionResult> {
  const session = await requireSession(["gerant", "responsable"]);
  const supabase = createClient();
  const { data: cmd } = await supabase.from("commandes").select("statut").eq("id", id).maybeSingle();
  if (!cmd) return { ok: false, error: "Commande introuvable." };
  if (!transitionsManuelles(cmd.statut as StatutCommande, session.role).some((t) => t.vers === vers)) {
    return { ok: false, error: "Ce changement de statut n'est pas autorisé." };
  }
  const { error } = await supabase.from("commandes").update({ statut: vers }).eq("id", id).eq("statut", cmd.statut);
  if (error) return { ok: false, error: ERREUR };
  if (vers === "a_valider") {
    await supabase.rpc("notifier_commande_a_valider", { p_commande: id });
  }
  revalider(id);
  return { ok: true };
}

/** « Valider et envoyer » : le gérant valide, puis n8n envoie. Le statut ne passe à « envoyée » que si n8n accepte. */
export async function validerEtEnvoyer(id: string): Promise<ActionResult> {
  const session = await requireSession(["gerant"]);
  const supabase = createClient();
  const { data: cmd } = await supabase.from("commandes").select("statut, commande_lignes(id)").eq("id", id).maybeSingle();
  if (!cmd) return { ok: false, error: "Commande introuvable." };
  if (!peutEtreValideeEtEnvoyee(cmd.statut as StatutCommande)) return { ok: false, error: "Cette commande a déjà été traitée." };
  if (!(cmd.commande_lignes as unknown[]).length) return { ok: false, error: "La commande ne contient aucun produit." };

  const { error: errValid } = await supabase.from("commandes").update({ valide_par: session.id, statut: "a_valider" }).eq("id", id).in("statut", ["brouillon", "a_valider"]);
  if (errValid) return { ok: false, error: ERREUR };

  const res = await callN8n(serverEnv().N8N_WEBHOOK_ORDER_SEND, { commande_id: id });
  if (!res.ok) {
    revalider(id);
    return { ok: false, error: "L'envoi n'a pas pu être lancé. La commande reste à valider : réessayez dans un instant." };
  }
  const { error } = await supabase.from("commandes").update({ statut: "envoyee", date_envoi: new Date().toISOString() }).eq("id", id).eq("statut", "a_valider");
  if (error) return { ok: false, error: ERREUR };
  revalider(id);
  return { ok: true };
}

export async function recevoirLivraison(input: unknown): Promise<ActionResult> {
  await requireSession(["gerant", "responsable"]);
  const parsed = receptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  const supabase = createClient();
  const { data: cmd } = await supabase.from("commandes").select("statut, commande_lignes(produit_id, quantite)").eq("id", parsed.data.commande_id).maybeSingle();
  if (!cmd) return { ok: false, error: "Commande introuvable." };
  if (!peutEtreRecue(cmd.statut as StatutCommande)) return { ok: false, error: "Cette commande n'est pas en attente de livraison." };

  const commandees = new Map((cmd.commande_lignes as { produit_id: string; quantite: number }[]).map((l) => [l.produit_id, Number(l.quantite)]));
  if (parsed.data.lignes.some((l) => !commandees.has(l.produit_id))) return { ok: false, error: "Une ligne ne correspond pas à la commande." };
  const lignes = parsed.data.lignes.map((l) => ({ produit_id: l.produit_id, qte_commandee: commandees.get(l.produit_id)!, qte_recue: l.qte_recue, ecart_motif: l.ecart_motif || null }));

  const { error } = await supabase.rpc("recevoir_livraison", { p_commande: parsed.data.commande_id, p_lignes: lignes });
  if (error) return { ok: false, error: "Réception impossible : " + error.message };
  revalider(parsed.data.commande_id);
  return { ok: true };
}

/** Copie la dernière commande d'un fournisseur (hors annulées) dans un nouveau brouillon, aux prix actuels. */
export async function dupliquerDerniereCommande(fournisseurId: string): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession(["gerant", "responsable"]);
  const supabase = createClient();
  const { data: derniere } = await supabase.from("commandes").select("pole_id, commande_lignes(produit_id, quantite)").eq("fournisseur_id", fournisseurId).neq("statut", "annulee").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!derniere) return { ok: false, error: "Ce fournisseur n'a pas encore de commande à dupliquer." };
  return creerCommande({
    fournisseur_id: fournisseurId,
    pole_id: poleAutorise(session, derniere.pole_id) ? derniere.pole_id : session.poleId,
    lignes: (derniere.commande_lignes as { produit_id: string; quantite: number }[]).map((l) => ({ produit_id: l.produit_id, quantite: Number(l.quantite) })),
  });
}

/**
 * « Commander » depuis les stocks : un brouillon par fournisseur (et par pôle), avec la quantité de réappro conseillée.
 * Un brouillon déjà ouvert pour le même fournisseur et pôle est complété au lieu d'être dupliqué.
 */
export async function commanderProduits(cible: { ids: string[] } | { tousLesProduitsSousLeSeuil: true; pole?: string }): Promise<ActionResult<{ commandes: string[]; sansFournisseur: number }>> {
  const session = await requireSession(["gerant", "responsable"]);
  const supabase = createClient();
  let q = supabase.from("v_produits_stock").select("id, nom, fournisseur_id, pole_id, qte_reappro, seuil_min, stock_actuel, prix_achat").eq("actif", true).limit(500);
  if ("ids" in cible) q = q.in("id", cible.ids);
  else {
    q = q.eq("niveau", "rouge");
    if (cible.pole) q = q.eq("pole_id", cible.pole);
  }
  const { data: produits } = await q;
  if (!produits?.length) return { ok: false, error: "Aucun produit à commander." };

  type Groupe = { fournisseur_id: string; pole_id: string; lignes: { produit_id: string; quantite: number }[] };
  const groupes = new Map<string, Groupe>();
  let sansFournisseur = 0;
  for (const p of produits) {
    if (!p.fournisseur_id) { sansFournisseur++; continue; }
    if (!poleAutorise(session, p.pole_id)) continue;
    const quantite = Number(p.qte_reappro) > 0 ? Number(p.qte_reappro) : Math.max(Number(p.seuil_min) * 2 - Number(p.stock_actuel), 1);
    const cle = `${p.fournisseur_id}|${p.pole_id}`;
    const g: Groupe = groupes.get(cle) ?? { fournisseur_id: p.fournisseur_id, pole_id: p.pole_id, lignes: [] };
    g.lignes.push({ produit_id: p.id, quantite });
    groupes.set(cle, g);
  }
  if (!groupes.size) return { ok: false, error: "Aucun de ces produits n'a de fournisseur principal : ajoutez-en un sur la fiche produit." };

  const commandes: string[] = [];
  for (const g of Array.from(groupes.values())) {
    const { data: existant } = await supabase.from("commandes").select("id, commande_lignes(produit_id)").eq("fournisseur_id", g.fournisseur_id).eq("pole_id", g.pole_id).eq("statut", "brouillon").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existant) {
      const presents = new Set((existant.commande_lignes as { produit_id: string }[]).map((l) => l.produit_id));
      const nouvelles = g.lignes.filter((l) => !presents.has(l.produit_id));
      const avecPrix = nouvelles.length ? await lignesAvecPrix(nouvelles, g.pole_id) : [];
      if (avecPrix?.length) await supabase.from("commande_lignes").insert(avecPrix.map((l) => ({ ...l, commande_id: existant.id })));
      commandes.push(existant.id);
    } else {
      const r = await creerCommande({ fournisseur_id: g.fournisseur_id, pole_id: g.pole_id, lignes: g.lignes });
      if (r.ok) commandes.push(r.data.id);
    }
  }
  revalider();
  if (!commandes.length) return { ok: false, error: ERREUR };
  return { ok: true, data: { commandes, sansFournisseur } };
}

export async function creerFournisseur(input: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession(["gerant", "responsable"]);
  const parsed = fournisseurSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  const pole_id = session.role === "gerant" ? parsed.data.pole_id || null : session.poleId;
  const { data, error } = await createClient().from("fournisseurs").insert({ ...parsed.data, pole_id }).select("id").single();
  if (error || !data) return { ok: false, error: ERREUR };
  revalidatePath("/fournisseurs");
  return { ok: true, data: { id: data.id } };
}

export async function modifierFournisseur(id: string, input: unknown): Promise<ActionResult> {
  await requireSession(["gerant", "responsable"]);
  const parsed = fournisseurSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  const v: Partial<typeof parsed.data> = { ...parsed.data };
  delete v.pole_id;
  const { error } = await createClient().from("fournisseurs").update(v).eq("id", id);
  if (error) return { ok: false, error: ERREUR };
  revalidatePath("/fournisseurs");
  revalidatePath(`/fournisseurs/${id}`);
  return { ok: true };
}
