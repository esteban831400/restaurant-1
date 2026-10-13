import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { erreurJson, readSignedJson } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";

const schema = z.object({
  pole_id: z.string().uuid(),
  fournisseur_id: z.string().uuid().optional(),
  fournisseur_nom: z.string().min(1).max(120),
  commande_id: z.string().uuid().optional(),
  fichier_url: z.string().url().max(1_000).optional(),
  donnees_extraites: z.record(z.string(), z.unknown()),
  lignes: z.array(z.object({
    produit_id: z.string().uuid(),
    qte_commandee: z.number().min(0).default(0),
    qte_recue: z.number().min(0),
  })).max(300).default([]),
});

/** n8n dépose une livraison lue par l'IA (facture ou bon de livraison) : elle reste « à vérifier » jusqu'à validation du gérant. */
export async function POST(request: Request) {
  const body = await readSignedJson(request, schema);
  if (!body.ok) return body.response;
  const d = body.data;
  const db = createAdminClient();

  if (d.lignes.length) {
    const { data: produits } = await db.from("produits").select("id").eq("pole_id", d.pole_id).in("id", d.lignes.map((l) => l.produit_id));
    const connus = new Set((produits ?? []).map((p) => p.id));
    const inconnus = d.lignes.filter((l) => !connus.has(l.produit_id)).map((l) => l.produit_id);
    if (inconnus.length) return erreurJson(404, "produit_introuvable", "Produits inconnus ou d'un autre pôle.", { produit_ids: inconnus });
  }

  const { data: liv, error } = await db.from("livraisons").insert({
    pole_id: d.pole_id, fournisseur_id: d.fournisseur_id ?? null, fournisseur_nom: d.fournisseur_nom, commande_id: d.commande_id ?? null,
    fichier_url: d.fichier_url ?? null, donnees_extraites: d.donnees_extraites, statut: "a_verifier",
  }).select("id").single();
  if (error || !liv) return erreurJson(500, "erreur_interne", "Enregistrement impossible.");

  if (d.lignes.length) {
    const { error: errL } = await db.from("livraison_lignes").insert(d.lignes.map((l) => ({ livraison_id: liv.id, ...l })));
    if (errL) {
      await db.from("livraisons").delete().eq("id", liv.id);
      return erreurJson(500, "erreur_interne", "Enregistrement des lignes impossible.");
    }
  }
  await db.from("notifications").insert({ pole_id: d.pole_id, type: "commande_a_valider", titre: "Livraison à vérifier", corps: `Document de ${d.fournisseur_nom} lu par l'IA`, lien: "/a-valider" });
  return NextResponse.json({ livraison_id: liv.id }, { status: 201 });
}
