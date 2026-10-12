/** Sauvegarde automatique des brouillons de formulaire, dans le navigateur, par utilisateur (appareils partagés). */
export type Stockage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

const PREFIXE = "palmeraie:";
export const DUREE_BROUILLON_MS = 7 * 24 * 3_600_000;

const cle = (utilisateur: string, formulaire: string) => `${PREFIXE}brouillon:${utilisateur}:${formulaire}`;

/** localStorage peut être absent ou lever une exception (navigation privée, stockage plein) : on n'en dépend jamais. */
export function stockageSur(): Stockage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function ecrireBrouillon(s: Stockage | null, utilisateur: string, formulaire: string, valeur: unknown, maintenant = Date.now()) {
  try { s?.setItem(cle(utilisateur, formulaire), JSON.stringify({ v: 1, date: maintenant, valeur })); } catch { /* stockage indisponible : le brouillon est simplement perdu */ }
}

export function lireBrouillon(s: Stockage | null, utilisateur: string, formulaire: string, maintenant = Date.now()): unknown | null {
  try {
    const brut = s?.getItem(cle(utilisateur, formulaire));
    if (!brut) return null;
    const o = JSON.parse(brut) as { v?: number; date?: number; valeur?: unknown };
    if (o.v !== 1 || typeof o.date !== "number" || maintenant - o.date > DUREE_BROUILLON_MS) {
      s?.removeItem(cle(utilisateur, formulaire));
      return null;
    }
    return o.valeur ?? null;
  } catch {
    return null;
  }
}

export function effacerBrouillon(s: Stockage | null, utilisateur: string, formulaire: string) {
  try { s?.removeItem(cle(utilisateur, formulaire)); } catch { /* sans effet */ }
}

/** À la déconnexion : rien ne doit rester pour le prochain utilisateur de l'appareil. */
export function effacerTout(s: Stockage | null) {
  try {
    if (!s) return;
    const aSupprimer: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k?.startsWith(PREFIXE)) aSupprimer.push(k);
    }
    aSupprimer.forEach((k) => s.removeItem(k));
  } catch { /* sans effet */ }
}

const CLE_FOURNISSEUR = (utilisateur: string) => `${PREFIXE}dernier-fournisseur:${utilisateur}`;
export function lireDernierFournisseur(s: Stockage | null, utilisateur: string): string | null {
  try { return s?.getItem(CLE_FOURNISSEUR(utilisateur)) ?? null; } catch { return null; }
}
export function ecrireDernierFournisseur(s: Stockage | null, utilisateur: string, id: string | null | undefined) {
  try { if (id) s?.setItem(CLE_FOURNISSEUR(utilisateur), id); } catch { /* sans effet */ }
}
