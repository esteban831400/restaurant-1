import { z } from "zod";

export const POLES_CLES = ["restaurant", "minigolf", "aquatique"] as const;
export type PoleCle = (typeof POLES_CLES)[number];
export const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;
export type Jour = (typeof JOURS)[number];
export const SAISONS = ["basse", "haute"] as const;
export type Saison = (typeof SAISONS)[number];
export const SAISON_LABELS: Record<Saison, string> = { basse: "Basse saison", haute: "Haute saison" };

const HEURE = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM)");
const creneau = z.object({ ouvert: z.boolean(), de: HEURE, a: HEURE }).refine((c) => !c.ouvert || c.a > c.de, { message: "L'heure de fermeture doit être après l'ouverture", path: ["a"] });
export type Creneau = z.infer<typeof creneau>;

const semaine = z.object(Object.fromEntries(JOURS.map((j) => [j, creneau])) as Record<Jour, typeof creneau>);
const parSaison = z.object({ basse: semaine, haute: semaine });
export const horairesSchema = z.object({ restaurant: parSaison, minigolf: parSaison, aquatique: parSaison });
export type Horaires = z.infer<typeof horairesSchema>;

const MMJJ = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Date invalide (MM-JJ)");
export const saisonsSchema = z.object({ haute_du: MMJJ, haute_au: MMJJ });
export type Saisons = z.infer<typeof saisonsSchema>;
export const SAISONS_PAR_DEFAUT: Saisons = { haute_du: "06-15", haute_au: "09-15" };

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
export const fermetureSchema = z.object({
  id: z.string().uuid(),
  pole: z.enum(["tous", ...POLES_CLES]),
  du: DATE,
  au: DATE,
  motif: z.string().trim().min(1, "Indiquez un motif").max(120),
}).refine((f) => f.au >= f.du, { message: "La date de fin doit être après le début", path: ["au"] });
export type Fermeture = z.infer<typeof fermetureSchema>;
export const fermeturesSchema = z.array(fermetureSchema).max(200);

const ouvert = (de: string, a: string): Creneau => ({ ouvert: true, de, a });
const ferme: Creneau = { ouvert: false, de: "09:00", a: "18:00" };
function semaineType(de: string, a: string, fermes: Jour[] = []) {
  return Object.fromEntries(JOURS.map((j) => [j, fermes.includes(j) ? ferme : ouvert(de, a)])) as Record<Jour, Creneau>;
}
export const HORAIRES_PAR_DEFAUT: Horaires = {
  restaurant: { basse: semaineType("11:30", "21:30", ["lundi"]), haute: semaineType("11:30", "22:30") },
  minigolf: { basse: semaineType("14:00", "18:00", ["lundi", "mardi"]), haute: semaineType("10:00", "20:00") },
  aquatique: { basse: semaineType("10:00", "18:00", ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]), haute: semaineType("10:00", "19:00") },
};

/** La haute saison peut enjamber le 31 décembre (ex. 12-15 → 03-01). */
export function saisonDu(date: string, s: Saisons): Saison {
  const mmjj = date.slice(5);
  const dedans = s.haute_du <= s.haute_au ? mmjj >= s.haute_du && mmjj <= s.haute_au : mmjj >= s.haute_du || mmjj <= s.haute_au;
  return dedans ? "haute" : "basse";
}

export function jourDe(date: string): Jour {
  const idx = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = dimanche
  return JOURS[(idx + 6) % 7];
}

export type HorairesDuJour = { ouvert: boolean; de?: string; a?: string; saison: Saison; motif_fermeture?: string };

/** Ce que le standard téléphonique doit annoncer : une fermeture exceptionnelle l'emporte sur les horaires de saison. */
export function horairesDuJour(h: Horaires, saisons: Saisons, fermetures: Fermeture[], pole: PoleCle, date: string): HorairesDuJour {
  const saison = saisonDu(date, saisons);
  const f = fermetures.find((x) => (x.pole === "tous" || x.pole === pole) && date >= x.du && date <= x.au);
  if (f) return { ouvert: false, saison, motif_fermeture: f.motif };
  const c = h[pole][saison][jourDe(date)];
  return c.ouvert ? { ouvert: true, de: c.de, a: c.a, saison } : { ouvert: false, saison };
}
