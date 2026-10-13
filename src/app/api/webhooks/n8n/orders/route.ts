import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { transitionN8nValide, type StatutCommande } from "@/lib/commandes/statuts";
import { erreurJson, readSignedJson } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_draft"),
    fournisseur_id: z.string().uuid(),
    pole_id: z.string().uuid(),
    source: z.enum(["automatique", "assistant"]).default("automatique"),
    date_livraison_prevue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    lignes: z.array(z.object({ produit_id: z.string().uuid(), quantite: z.number().positive() })).min(1).max(200),
  }),
  z.object({
    action: z.literal("update_status"),
    commande_id: z.string().uuid(),
    statut: z.enum(["envoyee", "confirmee", "en_retard"]),
    date_livraison_prevue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  z.object({ action: z.literal("mark_reminder"), commande_id: z.string().uuid() }),
  z.object({ action: z.literal("propose_reminder"), commande_id: z.string().uuid(), message: z.string().min(1).max(2000) }),
]);

/** n8n crée des brouillons et met à jour les statuts. Jamais d'envoi sans validation du gérant. */
export async function POST(request: Request) {
  const body = await readSignedJson(request, schema);
  if (!body.ok) return body.response;
  const input = body.data;
  const db = createAdminClient();

  if (input.action === "create_draft") {
    const { data: produits } = await db.from("produits").select("id, prix_achat, pole_id").in("id", input.lignes.map((l) => l.produit_id));
    const prix = new Map((produits ?? []).map((p) => [p.id, p]));
    const inconnus = input.lignes.filter((l) => prix.get(l.produit_id)?.pole_id !== input.pole_id).map((l) => l.produit_id);
    if (inconnus.length) return erreurJson(404, "produit_introuvable", "Produits inconnus ou d'un autre pôle.", { produit_ids: inconnus });

    // Un brouillon automatique déjà ouvert pour ce fournisseur et ce pôle est complété plutôt que dupliqué.
    const { data: existant } = await db.from("commandes").select("id").eq("fournisseur_id", input.fournisseur_id).eq("pole_id", input.pole_id).eq("statut", "brouillon").eq("source", input.source).order("created_at", { ascending: false }).limit(1).maybeSingle();
    let commandeId = existant?.id;
    if (!commandeId) {
      const { data, error } = await db.from("commandes").insert({ fournisseur_id: input.fournisseur_id, pole_id: input.pole_id, source: input.source, statut: "brouillon", date_livraison_prevue: input.date_livraison_prevue ?? null }).select("id").single();
      if (error || !data) return erreurJson(500, "erreur_interne", "Création impossible.");
      commandeId = data.id;
    }
    const { data: deja } = await db.from("commande_lignes").select("produit_id").eq("commande_id", commandeId);
    const presents = new Set((deja ?? []).map((l) => l.produit_id));
    const nouvelles = input.lignes.filter((l) => !presents.has(l.produit_id));
    if (nouvelles.length) {
      const { error } = await db.from("commande_lignes").insert(nouvelles.map((l) => ({ commande_id: commandeId, produit_id: l.produit_id, quantite: l.quantite, prix_unitaire: prix.get(l.produit_id)!.prix_achat })));
      if (error) return erreurJson(500, "erreur_interne", "Création des lignes impossible.");
    }
    if (!existant) {
      await db.from("notifications").insert({ pole_id: input.pole_id, type: "commande_a_valider", titre: "Commande brouillon à valider", corps: `${input.lignes.length} produit(s) à commander`, lien: `/commandes/${commandeId}` });
    }
    return NextResponse.json({ commande_id: commandeId, cree: !existant, lignes_ajoutees: nouvelles.length }, { status: existant ? 200 : 201 });
  }

  const { data: commande } = await db.from("commandes").select("id, statut, valide_par, date_envoi").eq("id", input.commande_id).maybeSingle();
  if (!commande) return erreurJson(404, "commande_introuvable", "Commande introuvable.");

  if (input.action === "propose_reminder") {
    const { data: ouverte } = await db.from("relances").select("id").eq("commande_id", commande.id).eq("statut", "a_confirmer").maybeSingle();
    if (ouverte) return NextResponse.json({ relance_id: ouverte.id, cree: false });
    const { data, error } = await db.from("relances").insert({ commande_id: commande.id, message: input.message }).select("id").single();
    if (error || !data) return erreurJson(500, "erreur_interne", "Création impossible.");
    await db.from("notifications").insert({ type: "commande_a_valider", titre: "Relance fournisseur à confirmer", corps: input.message.slice(0, 200), lien: "/a-valider" });
    return NextResponse.json({ relance_id: data.id, cree: true }, { status: 201 });
  }

  if (input.action === "mark_reminder") {
    await db.from("commandes").update({ derniere_relance: new Date().toISOString() }).eq("id", commande.id);
    return NextResponse.json({ commande_id: commande.id, derniere_relance: true });
  }

  const de = commande.statut as StatutCommande;
  if (de === input.statut) return NextResponse.json({ commande_id: commande.id, statut: de, inchange: true });
  if (!transitionN8nValide(de, input.statut)) return erreurJson(409, "transition_interdite", `Passage de « ${de} » à « ${input.statut} » interdit.`);
  if (input.statut === "envoyee" && !commande.valide_par) return erreurJson(409, "non_validee", "La commande n'a pas été validée par le gérant.");

  const { error } = await db.from("commandes").update({
    statut: input.statut,
    ...(input.statut === "envoyee" && !commande.date_envoi ? { date_envoi: new Date().toISOString() } : {}),
    ...(input.date_livraison_prevue ? { date_livraison_prevue: input.date_livraison_prevue } : {}),
  }).eq("id", commande.id);
  if (error) return erreurJson(500, "erreur_interne", "Mise à jour impossible.");
  return NextResponse.json({ commande_id: commande.id, statut: input.statut });
}
