export type Niveau = "rouge" | "orange" | "ok";

export const NIVEAU_LABELS: Record<Niveau, string> = {
  rouge: "Sous le seuil",
  orange: "Proche du seuil",
  ok: "Correct",
};

/** Même règle que la vue SQL v_produits_stock : orange sous 125 % du seuil. */
export function niveauAlerte(stock: number, seuilMin: number): Niveau {
  if (seuilMin <= 0) return "ok";
  if (stock < seuilMin) return "rouge";
  if (stock < seuilMin * 1.25) return "orange";
  return "ok";
}

export type TypeMouvement = "entree" | "sortie" | "perte" | "correction";

export const TYPE_LABELS: Record<TypeMouvement, string> = {
  entree: "Entrée",
  sortie: "Sortie",
  perte: "Perte / casse",
  correction: "Correction d'inventaire",
};

/** Quantité signée enregistrée en base : entrée > 0, sortie et perte < 0, correction telle que saisie. */
export function quantiteSignee(type: TypeMouvement, quantite: number): number {
  if (type === "entree") return Math.abs(quantite);
  if (type === "correction") return quantite;
  return -Math.abs(quantite);
}
