import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { dateLimiteConservation } from "@/lib/appels/appels";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function autorise(request: Request): boolean {
  const recu = Buffer.from(request.headers.get("authorization") ?? "");
  const attendu = Buffer.from(`Bearer ${serverEnv().CRON_SECRET}`);
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

/** Tâche quotidienne (Vercel Cron) : purge RGPD des appels + passage des commandes en retard. */
async function executer(request: Request) {
  if (!autorise(request)) return NextResponse.json({ error: "non_autorise" }, { status: 401 });
  const db = createAdminClient();

  const { data: param } = await db.from("parametres").select("valeur").eq("cle", "retention_appels_jours").maybeSingle();
  const jours = Number(param?.valeur) > 0 ? Number(param?.valeur) : 90;
  const limite = dateLimiteConservation(new Date(), jours);

  const { count, error } = await db.from("appels_ia").delete({ count: "exact" }).lt("date_appel", limite.toISOString());
  if (error) return NextResponse.json({ error: "purge_impossible" }, { status: 500 });
  if (count) {
    await db.from("audit_log").insert({ action: "PURGE", entite: "appels_ia", details: { supprimes: count, avant: limite.toISOString(), retention_jours: jours } });
  }
  const { data: enRetard } = await db.rpc("marquer_commandes_en_retard");
  return NextResponse.json({ appels_supprimes: count ?? 0, retention_jours: jours, commandes_en_retard: enRetard ?? 0 });
}

export const GET = executer; // Vercel Cron appelle en GET
export const POST = executer;
