import { describe, expect, it } from "vitest";
import { evolutionPrix, statsFournisseur } from "./stats";

describe("statsFournisseur", () => {
  it("calcule délai moyen et taux de conformité", () => {
    const s = statsFournisseur([
      { date_envoi: "2025-06-01T08:00:00Z", recu_le: "2025-06-03T08:00:00Z", lignes: [{ qte_commandee: 5, qte_recue: 5 }] },
      { date_envoi: "2025-06-10T08:00:00Z", recu_le: "2025-06-11T08:00:00Z", lignes: [{ qte_commandee: 5, qte_recue: 4 }] },
    ]);
    expect(s).toEqual({ nbLivraisons: 2, delaiMoyenJours: 1.5, tauxConformes: 50 });
  });
  it("renvoie null sans livraison", () => {
    expect(statsFournisseur([])).toEqual({ nbLivraisons: 0, delaiMoyenJours: null, tauxConformes: null });
  });
});

describe("evolutionPrix", () => {
  it("donne la variation et ignore les produits à un seul prix", () => {
    const r = evolutionPrix([
      { produit_id: "a", nom: "Tomates", prix_unitaire: 2, date: "2025-01-01" },
      { produit_id: "a", nom: "Tomates", prix_unitaire: 2.5, date: "2025-03-01" },
      { produit_id: "b", nom: "Huile", prix_unitaire: 7, date: "2025-01-01" },
    ]);
    expect(r).toEqual([{ produit_id: "a", nom: "Tomates", premier: 2, dernier: 2.5, variationPct: 25, nb: 2 }]);
  });
});
