import { z } from "zod";

export const CLES = ["alerte_seuil", "envoi_commandes", "relances", "lecture_factures", "standard_ia", "alertes_dlc", "rapport_hebdo", "assistant_ia"] as const;
export type CleAutomatisation = (typeof CLES)[number];
export const estCle = (s: string): s is CleAutomatisation => (CLES as readonly string[]).includes(s);

export const CANAUX = ["app", "mail", "telegram"] as const;
export const CANAL_LABELS: Record<(typeof CANAUX)[number], string> = { app: "Dans l'application", mail: "Par e-mail", telegram: "Par Telegram" };

export type ChampParametre = "heure" | "jour_semaine" | "seuil_relance_jours" | "seuil_dlc_jours" | "destinataires" | "canal";

export const CHAMPS: Record<CleAutomatisation, ChampParametre[]> = {
  alerte_seuil: ["heure", "canal", "destinataires"],
  envoi_commandes: ["canal", "destinataires"],
  relances: ["heure", "seuil_relance_jours", "canal", "destinataires"],
  lecture_factures: ["canal", "destinataires"],
  standard_ia: ["canal", "destinataires"],
  alertes_dlc: ["heure", "seuil_dlc_jours", "canal", "destinataires"],
  rapport_hebdo: ["jour_semaine", "heure", "canal", "destinataires"],
  assistant_ia: [],
};

export const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const LIBELLES_CHAMPS: Record<ChampParametre, string> = {
  heure: "Heure d'exécution",
  jour_semaine: "Jour d'envoi",
  seuil_relance_jours: "Relancer après (jours de retard)",
  seuil_dlc_jours: "Alerter à (jours avant la DLC)",
  destinataires: "Destinataires (un par ligne)",
  canal: "Canal de notification",
};

const FORME: Record<ChampParametre, z.ZodType> = {
  heure: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (format HH:MM)"),
  jour_semaine: z.number({ message: "Choisissez un jour" }).int().min(1).max(7),
  seuil_relance_jours: z.number({ message: "Saisissez un nombre de jours" }).int("Nombre entier attendu").min(1, "1 jour minimum").max(30, "30 jours maximum"),
  seuil_dlc_jours: z.number({ message: "Saisissez un nombre de jours" }).int("Nombre entier attendu").min(1, "1 jour minimum").max(30, "30 jours maximum"),
  destinataires: z.array(z.string().trim().min(1).max(120)).max(20, "20 destinataires maximum"),
  canal: z.enum(CANAUX, { message: "Choisissez un canal" }),
};

export const PAR_DEFAUT: Record<CleAutomatisation, Record<string, unknown>> = {
  alerte_seuil: { heure: "07:00", canal: "app", destinataires: [] },
  envoi_commandes: { canal: "app", destinataires: [] },
  relances: { heure: "09:00", seuil_relance_jours: 2, canal: "app", destinataires: [] },
  lecture_factures: { canal: "app", destinataires: [] },
  standard_ia: { canal: "app", destinataires: [] },
  alertes_dlc: { heure: "08:00", seuil_dlc_jours: 3, canal: "app", destinataires: [] },
  rapport_hebdo: { jour_semaine: 1, heure: "08:00", canal: "mail", destinataires: [] },
  assistant_ia: {},
};

const EMAIL = z.string().email();

/** Schéma strict des réglages d'une automatisation : seuls ses champs sont acceptés. */
export function schemaParametres(cle: CleAutomatisation) {
  const shape = Object.fromEntries(CHAMPS[cle].map((c) => [c, FORME[c]]));
  return z.object(shape).strict().superRefine((v, ctx) => {
    const canal = v.canal as string | undefined;
    const dest = (v.destinataires as string[] | undefined) ?? [];
    if (canal && canal !== "app" && dest.length === 0) {
      ctx.addIssue({ code: "custom", path: ["destinataires"], message: "Ajoutez au moins un destinataire pour ce canal" });
    }
    if (canal === "mail" && dest.some((d) => !EMAIL.safeParse(d).success)) {
      ctx.addIssue({ code: "custom", path: ["destinataires"], message: "Chaque destinataire doit être une adresse e-mail valide" });
    }
  });
}

/** Réglages stockés + valeurs par défaut pour les champs manquants (les champs inconnus sont ignorés). */
export function reglagesEffectifs(cle: CleAutomatisation, stockes: Record<string, unknown> | null): Record<string, unknown> {
  const base = PAR_DEFAUT[cle];
  const out: Record<string, unknown> = {};
  for (const c of CHAMPS[cle]) out[c] = stockes?.[c] ?? base[c];
  return out;
}

export type AdressesWebhooks = Partial<Record<CleAutomatisation, string>>;

/** Adresse du webhook d'une automatisation : variables d'environnement pour les deux appels historiques, sinon Paramètres. */
export function urlWebhook(cle: CleAutomatisation, parametres: AdressesWebhooks | null, env: { orderSend?: string; assistant?: string }): string | null {
  const url = cle === "envoi_commandes" ? env.orderSend : cle === "assistant_ia" ? env.assistant : parametres?.[cle];
  if (!url) return null;
  try {
    return ["https:", "http:"].includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

export function dureeExecution(debut: string, fin: string | null): string | null {
  if (!fin) return null;
  const s = Math.max(0, Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 1000));
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}
