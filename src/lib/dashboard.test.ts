import { describe, expect, it } from "vitest";
import { aujourdhuiParis } from "./dates";
import { construireTaches, pluriel, type Compteurs } from "./dashboard";

const zero: Compteurs = { commandesAValider: 0, relancesAConfirmer: 0, livraisonsAVerifier: 0, livraisonsAttendues: 0, commandesEnRetard: 0, sousSeuil: 0, dlcProche: 0, inventairesAValider: 0, messagesLaisses: 0, automatisationsEnEchec: 0 };

describe("construireTaches", () => {
  it("ne propose rien quand tout est à jour", () => expect(construireTaches(zero, "2025-07-10")).toEqual([]));
  it("accorde le pluriel et pointe vers l'écran concerné", () => {
    const t = construireTaches({ ...zero, commandesAValider: 2, sousSeuil: 1 }, "2025-07-10");
    expect(t.map((x) => x.libelle)).toEqual(["Valider 2 commandes fournisseur", "Commander 1 produit sous le seuil"]);
    expect(t[1].lien).toBe("/stocks?niveau=rouge");
  });
  it("met les urgences en premier", () => {
    const t = construireTaches({ ...zero, dlcProche: 3, commandesEnRetard: 1 }, "2025-07-10");
    expect(t.map((x) => x.id)).toEqual(["retard", "dlc"]);
  });
  it("filtre les messages du jour dans le lien", () => {
    expect(construireTaches({ ...zero, messagesLaisses: 2 }, "2025-07-10")[0].lien).toBe("/appels?issue=message_laisse&du=2025-07-10");
  });
});

describe("pluriel", () => {
  it("accorde", () => {
    expect(pluriel(1, "commande")).toBe("1 commande");
    expect(pluriel(0, "commande")).toBe("0 commande");
    expect(pluriel(3, "commande")).toBe("3 commandes");
  });
});

describe("aujourdhuiParis", () => {
  it("suit l'heure de Paris, pas l'UTC", () => {
    expect(aujourdhuiParis(new Date("2025-07-10T22:30:00Z"))).toBe("2025-07-11");
    expect(aujourdhuiParis(new Date("2025-01-10T22:30:00Z"))).toBe("2025-01-10");
  });
});
