import "server-only";
import { cache } from "react";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { COMPLEXE_PAR_DEFAUT, lireComplexe, type Complexe } from "@/lib/parametres/complexe";
import { HORAIRES_PAR_DEFAUT, SAISONS_PAR_DEFAUT, fermeturesSchema, horairesSchema, saisonsSchema, type Fermeture, type Horaires, type Saisons } from "@/lib/parametres/horaires";
import type { AdressesWebhooks } from "@/lib/automatisations/definitions";

/** Identité du complexe : lisible sans connexion (page de connexion comprise), jamais bloquante en cas d'erreur. */
export const getComplexe = cache(async (): Promise<Complexe> => {
  try {
    const env = publicEnv();
    const anon = createSupabase(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data } = await anon.from("parametres").select("valeur").eq("cle", "complexe").maybeSingle();
    return lireComplexe(data?.valeur);
  } catch {
    return COMPLEXE_PAR_DEFAUT;
  }
});

export async function getReglages() {
  const { data } = await createClient().from("parametres").select("cle, valeur");
  const m = new Map((data ?? []).map((p) => [p.cle as string, p.valeur as unknown]));
  const horaires = horairesSchema.safeParse(m.get("horaires"));
  const saisons = saisonsSchema.safeParse(m.get("saisons"));
  const fermetures = fermeturesSchema.safeParse(m.get("fermetures"));
  return {
    horaires: (horaires.success ? horaires.data : HORAIRES_PAR_DEFAUT) as Horaires,
    saisons: (saisons.success ? saisons.data : SAISONS_PAR_DEFAUT) as Saisons,
    fermetures: (fermetures.success ? fermetures.data : []) as Fermeture[],
    adresses: ((m.get("webhooks_n8n") ?? {}) as AdressesWebhooks) ?? {},
    seuilDlc: Number(m.get("seuil_dlc_jours")) || 3,
  };
}

export type Utilisateur = { id: string; email: string; nom_complet: string; role: "gerant" | "responsable" | "salarie"; pole_id: string | null; actif: boolean; saisonnier: boolean };

export async function listUtilisateurs(): Promise<Utilisateur[]> {
  const [{ data: profils }, annuaire] = await Promise.all([
    createClient().from("profiles").select("id, nom_complet, role, pole_id, actif, saisonnier").order("nom_complet"),
    createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const emails = new Map(annuaire.data.users.map((u) => [u.id, u.email ?? ""]));
  return (profils ?? []).map((p) => ({ ...p, email: emails.get(p.id) ?? "" })) as Utilisateur[];
}

export const PAGE_AUDIT = 30;
export async function listAudit(page: number) {
  const { data, count } = await createClient().from("audit_log").select("id, user_id, action, entite, entite_id, created_at, profiles:user_id(nom_complet)", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE_AUDIT, page * PAGE_AUDIT - 1);
  return { lignes: (data ?? []) as unknown as { id: number; user_id: string | null; action: string; entite: string; entite_id: string | null; created_at: string; profiles: { nom_complet: string } | null }[], total: count ?? 0 };
}

/** Indique (sans jamais révéler les valeurs) quels secrets et adresses sont configurés côté serveur. */
export function etatConfigurationServeur() {
  const present = (nom: string) => Boolean(process.env[nom]);
  return {
    secretEntrant: present("N8N_WEBHOOK_SECRET"), secretSortant: present("N8N_OUTBOUND_SECRET"), cron: present("CRON_SECRET"),
    envoiCommandes: present("N8N_WEBHOOK_ORDER_SEND"), assistant: present("N8N_WEBHOOK_ASSISTANT"),
  };
}
