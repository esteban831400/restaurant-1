import { NextResponse } from "next/server";
import { z } from "zod";
import { CLES } from "@/lib/automatisations/definitions";
import { createAdminClient } from "@/lib/supabase/admin";
import { erreurJson, readSignedJson } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";

const schema = z.object({
  automatisation_cle: z.enum(CLES),
  execution_id: z.string().uuid().optional(),
  statut: z.enum(["en_cours", "succes", "echec"]),
  debut: z.string().datetime({ offset: true }).optional(),
  fin: z.string().datetime({ offset: true }).optional(),
  resume: z.string().max(2_000).optional(),
  erreur: z.string().max(5_000).optional(),
  declenche_par: z.enum(["planifie", "manuel"]).optional(),
});

/** n8n enregistre chaque exécution (et chaque erreur) pour alimenter l'historique de l'application. */
export async function POST(request: Request) {
  const body = await readSignedJson(request, schema);
  if (!body.ok) return body.response;
  const e = body.data;
  const db = createAdminClient();
  const termine = e.statut !== "en_cours";
  const fin = termine ? e.fin ?? new Date().toISOString() : null;

  let id = e.execution_id;
  if (id) {
    const { data, error } = await db.from("executions_automatisations")
      .update({ statut: e.statut, fin, resume: e.resume ?? null, erreur: e.erreur ?? null })
      .eq("id", id).eq("automatisation_cle", e.automatisation_cle).select("id").maybeSingle();
    if (error) return erreurJson(500, "erreur_interne", "Mise à jour impossible.");
    if (!data) return erreurJson(404, "execution_introuvable", "Aucune exécution avec cet identifiant pour cette automatisation.");
  } else {
    const { data, error } = await db.from("executions_automatisations")
      .insert({ automatisation_cle: e.automatisation_cle, debut: e.debut ?? new Date().toISOString(), fin, statut: e.statut, resume: e.resume ?? null, erreur: e.erreur ?? null, declenche_par: e.declenche_par ?? "planifie" })
      .select("id").single();
    if (error || !data) return erreurJson(500, "erreur_interne", "Enregistrement impossible.");
    id = data.id;
  }

  if (termine) {
    await db.from("automatisations").update({ derniere_execution: fin, dernier_statut: e.statut }).eq("cle", e.automatisation_cle);
  }
  if (e.statut === "echec") {
    const { data: auto } = await db.from("automatisations").select("nom").eq("cle", e.automatisation_cle).maybeSingle();
    await db.from("notifications").insert({
      type: "echec_automatisation",
      titre: `Échec : ${auto?.nom ?? e.automatisation_cle}`,
      corps: e.erreur?.slice(0, 200) ?? "L'automatisation a échoué.",
      lien: `/automatisations/${e.automatisation_cle}/historique`,
    });
  }
  return NextResponse.json({ execution_id: id }, { status: e.execution_id ? 200 : 201 });
}
