import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { erreurJson, readSignedJson } from "@/lib/webhooks/verify";

export const dynamic = "force-dynamic";

const schema = z.object({
  external_id: z.string().min(1).max(100).optional(),
  date_appel: z.string().datetime({ offset: true }),
  numero: z.string().max(30).optional(),
  duree_secondes: z.number().int().min(0).max(36_000),
  pole: z.enum(["restaurant", "minigolf", "aquatique"]).nullable().optional(),
  issue: z.enum(["renseigne", "transfere", "message_laisse", "reservation"]),
  resume: z.string().max(2_000).optional(),
  transcription: z.string().max(100_000).optional(),
});

/** n8n enregistre chaque appel du standard IA. Idempotent si `external_id` est fourni (un rejeu met à jour). */
export async function POST(request: Request) {
  const body = await readSignedJson(request, schema);
  if (!body.ok) return body.response;
  const input = body.data;
  const db = createAdminClient();

  let existant = false;
  if (input.external_id) {
    const { data } = await db.from("appels_ia").select("id").eq("external_id", input.external_id).maybeSingle();
    existant = !!data;
  }
  const ligne = {
    external_id: input.external_id ?? null,
    date_appel: input.date_appel,
    numero: input.numero ?? null,
    duree_secondes: input.duree_secondes,
    pole: input.pole ?? null,
    issue: input.issue,
    resume: input.resume ?? null,
    transcription: input.transcription ?? null,
  };
  const { data, error } = input.external_id
    ? await db.from("appels_ia").upsert(ligne, { onConflict: "external_id" }).select("id").single()
    : await db.from("appels_ia").insert(ligne).select("id").single();
  if (error || !data) return erreurJson(500, "erreur_interne", "Enregistrement impossible.");

  if (!existant && input.issue === "message_laisse") {
    await db.from("notifications").insert({
      type: "message_standard",
      titre: "Message laissé au standard",
      corps: input.resume?.slice(0, 200) ?? "Un appelant a laissé un message.",
      lien: `/appels/${data.id}`,
    });
  }
  return NextResponse.json({ id: data.id, cree: !existant }, { status: existant ? 200 : 201 });
}
