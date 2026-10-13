export type LivraisonStat = {
  recu_le: string | null;
  date_envoi: string | null;
  lignes: { qte_commandee: number; qte_recue: number }[];
};

const JOUR_MS = 86_400_000;

export function statsFournisseur(livraisons: LivraisonStat[]) {
  const delais = livraisons
    .filter((l) => l.recu_le && l.date_envoi)
    .map((l) => (new Date(l.recu_le!).getTime() - new Date(l.date_envoi!).getTime()) / JOUR_MS)
    .filter((d) => d >= 0);
  const conformes = livraisons.filter((l) => l.lignes.length > 0 && l.lignes.every((x) => Number(x.qte_recue) === Number(x.qte_commandee)));
  return {
    nbLivraisons: livraisons.length,
    delaiMoyenJours: delais.length ? Math.round((delais.reduce((a, b) => a + b, 0) / delais.length) * 10) / 10 : null,
    tauxConformes: livraisons.length ? Math.round((conformes.length / livraisons.length) * 100) : null,
  };
}

export type LignePrix = { produit_id: string; nom: string; prix_unitaire: number; date: string };

/** Premier et dernier prix connus par produit, avec la variation en %. */
export function evolutionPrix(lignes: LignePrix[]) {
  const parProduit = new Map<string, LignePrix[]>();
  for (const l of lignes) parProduit.set(l.produit_id, [...(parProduit.get(l.produit_id) ?? []), l]);
  return Array.from(parProduit.values())
    .map((ls) => {
      const tri = [...ls].sort((a, b) => a.date.localeCompare(b.date));
      const premier = tri[0].prix_unitaire;
      const dernier = tri[tri.length - 1].prix_unitaire;
      return { produit_id: tri[0].produit_id, nom: tri[0].nom, premier, dernier, variationPct: premier > 0 ? Math.round(((dernier - premier) / premier) * 1000) / 10 : null, nb: tri.length };
    })
    .filter((p) => p.nb > 1)
    .sort((a, b) => Math.abs(b.variationPct ?? 0) - Math.abs(a.variationPct ?? 0));
}
