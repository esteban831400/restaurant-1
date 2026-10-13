import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { erreurJson, readSignedJson } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";

const schema = z.object({
  type: z.enum(["commande_a_valider", "seuil", "dlc", "echec_automatisation", "message_standard"]),
  titre: z.string().min(1).max(120),
  corps: z.string().max(500).optional(),
  lien: z.string().max(200).regex(/^\/(?!\/)/, "Le lien doit être un chemin interne commençant par /").optional(),
  pole_id: z.string().uuid().optional(),
});

/** n8n crée une notification dans la cloche (alerte DLC, produit sous le seuil, message du standard…). */
export async function POST(request: Request) {
  const body = await readSignedJson(request, schema);
  if (!body.ok) return body.response;
  const n = body.data;
  const { data, error } = await createAdminClient().from("notifications").insert({
    type: n.type, titre: n.titre, corps: n.corps ?? null, lien: n.lien ?? null, pole_id: n.pole_id ?? null,
  }).select("id").single();
  if (error || !data) return erreurJson(500, "erreur_interne", "Création impossible.");
  return NextResponse.json({ notification_id: data.id }, { status: 201 });
}
