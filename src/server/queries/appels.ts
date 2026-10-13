import "server-only";
import { createClient } from "@/lib/supabase/server";
import { bornePariseEnUtc, statsAppels, type AppelStat, type IssueAppel } from "@/lib/appels/appels";

export const PAGE_SIZE = 25;

export type AppelListe = { id: string; date_appel: string; numero: string | null; duree_secondes: number; pole: string | null; issue: IssueAppel; resume: string | null };

export async function listAppels(f: { du?: string; au?: string; pole?: string; issue?: string; page?: number }) {
  const page = Math.max(1, f.page ?? 1);
  let q = createClient()
    .from("appels_ia")
    .select("id, date_appel, numero, duree_secondes, pole, issue, resume", { count: "exact" })
    .order("date_appel", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const du = f.du ? bornePariseEnUtc(f.du, false) : null;
  const au = f.au ? bornePariseEnUtc(f.au, true) : null;
  if (du) q = q.gte("date_appel", du.toISOString());
  if (au) q = q.lte("date_appel", au.toISOString());
  if (f.pole) q = q.eq("pole", f.pole);
  if (f.issue) q = q.eq("issue", f.issue);
  const { data, count, error } = await q;
  return { appels: (data ?? []) as AppelListe[], total: count ?? 0, page, error: error?.message ?? null };
}

export async function getAppel(id: string) {
  const { data } = await createClient().from("appels_ia").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function statistiques(jours: number) {
  const depuis = new Date(Date.now() - jours * 86_400_000).toISOString();
  const { data } = await createClient().from("appels_ia").select("date_appel, pole, issue").gte("date_appel", depuis).order("date_appel", { ascending: false }).limit(10_000);
  return statsAppels((data ?? []) as AppelStat[], jours);
}

export async function retentionJours(): Promise<number> {
  const { data } = await createClient().from("parametres").select("valeur").eq("cle", "retention_appels_jours").maybeSingle();
  const n = Number(data?.valeur);
  return Number.isFinite(n) && n > 0 ? n : 90;
}
