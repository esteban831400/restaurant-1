"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { CLES, urlWebhookAutorisee, type CleAutomatisation } from "@/lib/automatisations/definitions";
import { publicEnv } from "@/lib/env";
import { complexeSchema } from "@/lib/parametres/complexe";
import { fermeturesSchema, horairesSchema, saisonsSchema } from "@/lib/parametres/horaires";
import { invitationSchema, utilisateurSchema, verifierModification, verifierSuppression } from "@/lib/parametres/utilisateurs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/stock";

const ERREUR = "Une erreur est survenue. Réessayez.";
const premiere = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Données invalides";

async function enregistrerParametre(cle: string, valeur: unknown): Promise<ActionResult> {
  const { error } = await createClient().from("parametres").upsert({ cle, valeur });
  if (error) return { ok: false, error: ERREUR };
  revalidatePath("/parametres", "layout");
  return { ok: true };
}

export async function enregistrerComplexe(input: unknown): Promise<ActionResult> {
  await requireSession(["gerant"]);
  const prefixe = `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/public-assets/`;
  const parsed = complexeSchema(prefixe).safeParse(input);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  const r = await enregistrerParametre("complexe", parsed.data);
  if (r.ok) revalidatePath("/", "layout"); // nom, logo et couleurs apparaissent partout
  return r;
}

export async function enregistrerSeuilDlc(jours: unknown): Promise<ActionResult> {
  await requireSession(["gerant"]);
  const parsed = z.number({ message: "Saisissez un nombre de jours" }).int("Nombre entier attendu").min(1, "1 jour minimum").max(30, "30 jours maximum").safeParse(jours);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  const supabase = createClient();
  const r = await enregistrerParametre("seuil_dlc_jours", parsed.data);
  if (!r.ok) return r;
  // Même valeur dans la carte « Alertes DLC » des automatisations (source unique)
  const { data: auto } = await supabase.from("automatisations").select("parametres").eq("cle", "alertes_dlc").maybeSingle();
  await supabase.from("automatisations").update({ parametres: { ...(auto?.parametres as object), seuil_dlc_jours: parsed.data } }).eq("cle", "alertes_dlc");
  revalidatePath("/stocks");
  revalidatePath("/automatisations");
  return { ok: true };
}

export async function enregistrerHoraires(input: unknown): Promise<ActionResult> {
  await requireSession(["gerant"]);
  const parsed = z.object({ horaires: horairesSchema, saisons: saisonsSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  const r1 = await enregistrerParametre("horaires", parsed.data.horaires);
  if (!r1.ok) return r1;
  return enregistrerParametre("saisons", parsed.data.saisons);
}

export async function enregistrerFermetures(input: unknown): Promise<ActionResult> {
  await requireSession(["gerant"]);
  const parsed = fermeturesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  return enregistrerParametre("fermetures", parsed.data);
}

/** Adresses des automatisations : jamais d'adresse interne (voir `urlWebhookAutorisee`). Les secrets ne passent jamais par ici. */
export async function enregistrerAdresses(input: unknown): Promise<ActionResult> {
  await requireSession(["gerant"]);
  const parsed = z.record(z.string(), z.string().trim().max(500)).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Adresses invalides" };
  const propres: Partial<Record<CleAutomatisation, string>> = {};
  for (const [cle, url] of Object.entries(parsed.data)) {
    if (!(CLES as readonly string[]).includes(cle) || cle === "envoi_commandes" || cle === "assistant_ia" || !url) continue;
    if (!urlWebhookAutorisee(url)) return { ok: false, error: `Adresse refusée pour « ${cle} » : utilisez une adresse https publique.` };
    propres[cle as CleAutomatisation] = url;
  }
  return enregistrerParametre("webhooks_n8n", propres);
}

async function gerantsActifs() {
  const { count } = await createAdminClient().from("profiles").select("id", { count: "exact", head: true }).eq("role", "gerant").eq("actif", true);
  return count ?? 0;
}

export async function inviterUtilisateur(input: unknown): Promise<ActionResult> {
  await requireSession(["gerant"]);
  const parsed = invitationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: premiere(parsed.error) };
  const v = parsed.data;
  const admin = createAdminClient();
  const origine = headers().get("origin") ?? process.env.NEXT_PUBLIC_APP_URL;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(v.email, {
    data: { nom_complet: v.nom_complet },
    ...(origine ? { redirectTo: `${origine}/auth/callback?next=/reinitialiser` } : {}),
  });
  if (error || !data.user) {
    return { ok: false, error: /already|registered|exists/i.test(error?.message ?? "") ? "Cette adresse e-mail est déjà utilisée." : "L'invitation n'a pas pu être envoyée." };
  }
  const { error: errProfil } = await admin.from("profiles").insert({
    id: data.user.id, nom_complet: v.nom_complet, role: v.role, pole_id: v.role === "gerant" ? null : v.pole_id, saisonnier: v.saisonnier,
  });
  if (errProfil) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, error: ERREUR };
  }
  revalidatePath("/parametres/utilisateurs");
  return { ok: true };
}

export async function modifierUtilisateur(id: string, input: unknown): Promise<ActionResult> {
  const session = await requireSession(["gerant"]);
  const parsed = utilisateurSchema.safeParse(input);
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return { ok: false, error: parsed.success ? "Utilisateur introuvable." : premiere(parsed.error) };
  const v = parsed.data;
  const admin = createAdminClient();
  const { data: actuel } = await admin.from("profiles").select("role, actif").eq("id", id).maybeSingle();
  if (!actuel) return { ok: false, error: "Utilisateur introuvable." };
  const refus = verifierModification({ acteurId: session.id, cibleId: id, actuel, nouveau: { role: v.role, actif: v.actif }, gerantsActifs: await gerantsActifs() });
  if (refus) return { ok: false, error: refus };

  // Un compte désactivé perd tout accès à sa prochaine requête (garde serveur + fonctions RLS qui ignorent les profils inactifs).
  const { error } = await createClient().from("profiles").update({ nom_complet: v.nom_complet, role: v.role, pole_id: v.role === "gerant" ? null : v.pole_id, actif: v.actif, saisonnier: v.saisonnier }).eq("id", id);
  if (error) return { ok: false, error: ERREUR };
  revalidatePath("/parametres/utilisateurs");
  return { ok: true };
}

/**
 * Suppression RGPD : le compte et ses données personnelles (conversations, notifications, profil) sont supprimés.
 * L'historique métier (mouvements, commandes…) est conservé sans nom (références mises à NULL), le journal d'audit est anonymisé.
 */
export async function supprimerUtilisateur(id: string): Promise<ActionResult> {
  const session = await requireSession(["gerant"]);
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Utilisateur introuvable." };
  const admin = createAdminClient();
  const { data: cible } = await admin.from("profiles").select("role, actif").eq("id", id).maybeSingle();
  if (!cible) return { ok: false, error: "Utilisateur introuvable." };
  const refus = verifierSuppression({ acteurId: session.id, cibleId: id, cible, gerantsActifs: await gerantsActifs() });
  if (refus) return { ok: false, error: refus };

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { ok: false, error: ERREUR };
  await admin.from("audit_log").update({ user_id: null }).eq("user_id", id);
  await admin.from("audit_log").insert({ user_id: session.id, action: "RGPD_SUPPRESSION", entite: "profiles", entite_id: id, details: { role: cible.role } });
  revalidatePath("/parametres/utilisateurs");
  return { ok: true };
}
