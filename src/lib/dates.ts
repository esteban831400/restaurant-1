/** Date du jour à Paris au format AAAA-MM-JJ (les jours de l'application suivent l'heure de Paris). */
export function aujourdhuiParis(maintenant = new Date()): string {
  return maintenant.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}
