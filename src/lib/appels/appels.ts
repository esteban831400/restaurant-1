export type IssueAppel = "renseigne" | "transfere" | "message_laisse" | "reservation";

export const ISSUE_LABELS: Record<IssueAppel, string> = {
  renseigne: "Renseigné",
  transfere: "Transféré",
  message_laisse: "Message laissé",
  reservation: "Réservation",
};
export const ISSUES = Object.keys(ISSUE_LABELS) as IssueAppel[];

export const POLE_APPEL_LABELS = { restaurant: "Restaurant", minigolf: "Mini-golf", aquatique: "Aquatique" } as const;

/** « 06 12 34 56 78 » → « 06 12 •• •• 78 » : on garde les 4 premiers et les 2 derniers chiffres. */
export function masquerNumero(numero: string | null | undefined): string {
  const chiffres = (numero ?? "").replace(/\D/g, "");
  if (chiffres.length < 8) return numero ? "•• •• •• ••" : "Numéro masqué";
  const debut = chiffres.slice(0, 4).replace(/(\d{2})(\d{2})/, "$1 $2");
  return `${debut} •• •• ${chiffres.slice(-2)}`;
}

export function formatDuree(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return m > 0 ? `${m} min ${String(s).padStart(2, "0")} s` : `${s} s`;
}

export type AppelStat = { date_appel: string; pole: string | null; issue: IssueAppel };

const cleJour = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
const formatHeure = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Paris" });
const heure = (iso: string) => Number(formatHeure.format(new Date(iso)));

/** Statistiques d'un lot d'appels : par jour (jours vides inclus), par pôle, par heure, taux de transfert. */
export function statsAppels(appels: AppelStat[], jours: number, maintenant = new Date()) {
  const parJour = new Map<string, number>();
  for (let i = jours - 1; i >= 0; i--) parJour.set(cleJour(new Date(maintenant.getTime() - i * 86_400_000).toISOString()), 0);
  const parHeure = Array.from({ length: 24 }, () => 0);
  const parPole: Record<string, number> = { restaurant: 0, minigolf: 0, aquatique: 0, autre: 0 };
  let transferes = 0;

  for (const a of appels) {
    const j = cleJour(a.date_appel);
    if (parJour.has(j)) parJour.set(j, (parJour.get(j) ?? 0) + 1);
    parHeure[heure(a.date_appel)]++;
    parPole[a.pole && a.pole in parPole ? a.pole : "autre"]++;
    if (a.issue === "transfere") transferes++;
  }
  return {
    total: appels.length,
    tauxTransfert: appels.length ? Math.round((transferes / appels.length) * 100) : null,
    parJour: Array.from(parJour, ([jour, appels]) => ({ jour, appels })),
    parHeure: parHeure.map((appels, h) => ({ heure: `${h} h`, appels })),
    parPole: Object.entries(parPole).filter(([, n]) => n > 0).map(([pole, appels]) => ({ pole, appels })),
  };
}

/** Date avant laquelle les appels doivent être supprimés (RGPD). */
export function dateLimiteConservation(maintenant: Date, jours: number): Date {
  return new Date(maintenant.getTime() - jours * 86_400_000);
}

function decalageParisMinutes(instantUtc: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(instantUtc));
  const v = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Math.round((Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - instantUtc) / 60_000);
}

/** Début ou fin d'une journée « AAAA-MM-JJ » à Paris, en instant UTC (pour filtrer par dates). */
export function bornePariseEnUtc(jour: string, fin: boolean): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(jour);
  if (!m) return null;
  const approx = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), fin ? 23 : 0, fin ? 59 : 0, fin ? 59 : 0);
  return new Date(approx - decalageParisMinutes(approx) * 60_000);
}
