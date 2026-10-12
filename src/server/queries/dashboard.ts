import "server-only";
import { createClient } from "@/lib/supabase/server";
import { aujourdhuiParis } from "@/lib/dates";
import { bornePariseEnUtc } from "@/lib/appels/appels";
import type { Compteurs } from "@/lib/dashboard";
import type { Pole } from "@/types/stock";

const STATUTS_EN_ATTENTE = ["envoyee", "confirmee", "en_retard"];

export type DonneesDashboard = {
  compteurs: Compteurs;
  commandesAValider: { id: string; numero: number; statut: string; total_estime: number; fournisseur: string; nbLignes: number }[];
  appels: { total: number; dernier: { id: string; date_appel: string; issue: string; resume: string | null } | null };
  automatisationsEnEchec: string[];
  valeurStock: { jour: string; valeur: number }[];
  topConsommation: { produit_id: string; nom: string; unite: string; quantite: number; valeur: number }[];
};

export async function donneesDashboard(pole: Pole | null): Promise<DonneesDashboard> {
  const supabase = createClient();
  const aujourdhui = aujourdhuiParis();
  const debutJour = bornePariseEnUtc(aujourdhui, false)!.toISOString();
  const p = pole?.id ?? null;

  const head = { count: "exact" as const, head: true };
  let sousSeuil = supabase.from("v_produits_stock").select("id", head).eq("actif", true).eq("niveau", "rouge");
  let dlc = supabase.from("v_produits_stock").select("id", head).eq("actif", true).eq("dlc_proche", true);
  let aValider = supabase.from("commandes").select("id, numero, statut, total_estime, fournisseurs(nom), commande_lignes(id)", { count: "exact" }).in("statut", ["brouillon", "a_valider"]).order("created_at", { ascending: false }).limit(5);
  let attendues = supabase.from("commandes").select("id", head).in("statut", STATUTS_EN_ATTENTE).eq("date_livraison_prevue", aujourdhui);
  let retard = supabase.from("commandes").select("id", head).eq("statut", "en_retard");
  let livraisons = supabase.from("livraisons").select("id", head).eq("statut", "a_verifier");
  let inventaires = supabase.from("inventaires").select("id", head).eq("statut", "a_valider");
  let relances = supabase.from("relances").select("id, commandes!inner(pole_id)", head).eq("statut", "a_confirmer");
  let appelsJour = supabase.from("appels_ia").select("id", head).gte("date_appel", debutJour);
  let messages = supabase.from("appels_ia").select("id", head).gte("date_appel", debutJour).eq("issue", "message_laisse");
  let dernierAppel = supabase.from("appels_ia").select("id, date_appel, issue, resume").order("date_appel", { ascending: false }).limit(1);

  if (pole) {
    sousSeuil = sousSeuil.eq("pole_id", pole.id); dlc = dlc.eq("pole_id", pole.id); aValider = aValider.eq("pole_id", pole.id);
    attendues = attendues.eq("pole_id", pole.id); retard = retard.eq("pole_id", pole.id); livraisons = livraisons.eq("pole_id", pole.id);
    inventaires = inventaires.eq("pole_id", pole.id); relances = relances.eq("commandes.pole_id", pole.id);
    appelsJour = appelsJour.eq("pole", pole.cle); messages = messages.eq("pole", pole.cle); dernierAppel = dernierAppel.eq("pole", pole.cle);
  }

  const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, echecs, valeur, top] = await Promise.all([
    sousSeuil, dlc, aValider, attendues, retard, livraisons, inventaires, relances, appelsJour, messages, dernierAppel,
    supabase.from("automatisations").select("nom").eq("dernier_statut", "echec"),
    supabase.rpc("valeur_stock_historique", { p_jours: 30, p_pole: p }),
    supabase.rpc("top_consommation", { p_jours: 30, p_pole: p, p_limite: 10 }),
  ]);

  const echecsNoms = (echecs.data ?? []).map((a) => a.nom as string);
  type LigneCommande = { id: string; numero: number; statut: string; total_estime: number; fournisseurs: { nom: string } | null; commande_lignes: { id: string }[] };
  return {
    compteurs: {
      commandesAValider: r3.count ?? 0, relancesAConfirmer: r8.count ?? 0, livraisonsAVerifier: r6.count ?? 0, livraisonsAttendues: r4.count ?? 0,
      commandesEnRetard: r5.count ?? 0, sousSeuil: r1.count ?? 0, dlcProche: r2.count ?? 0, inventairesAValider: r7.count ?? 0,
      messagesLaisses: r10.count ?? 0, automatisationsEnEchec: echecsNoms.length,
    },
    commandesAValider: ((r3.data ?? []) as unknown as LigneCommande[]).map((c) => ({ id: c.id, numero: c.numero, statut: c.statut, total_estime: Number(c.total_estime), fournisseur: c.fournisseurs?.nom ?? "—", nbLignes: c.commande_lignes.length })),
    appels: { total: r9.count ?? 0, dernier: ((r11.data ?? [])[0] as DonneesDashboard["appels"]["dernier"]) ?? null },
    automatisationsEnEchec: echecsNoms,
    valeurStock: ((valeur.data ?? []) as { jour: string; valeur: number }[]).map((v) => ({ jour: v.jour, valeur: Number(v.valeur) })),
    topConsommation: ((top.data ?? []) as { produit_id: string; nom: string; unite: string; quantite: number; valeur: number }[]).map((t) => ({ ...t, quantite: Number(t.quantite), valeur: Number(t.valeur) })),
  };
}
