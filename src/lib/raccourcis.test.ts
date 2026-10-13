import { describe, expect, it } from "vitest";
import { actionPourN, ajoutsPour, destinationG, entreesStatiques, filtrerEntrees, normaliser } from "./raccourcis";

describe("normaliser", () => {
  it("retire accents et majuscules", () => expect(normaliser("  Réception De LIVRAISON ")).toBe("reception de livraison"));
});

describe("ajoutsPour", () => {
  it("limite le salarié aux mouvements de stock", () => expect(ajoutsPour("salarie").map((a) => a.type)).toEqual(["mouvement"]));
  it("donne les cinq ajouts au gérant", () => expect(ajoutsPour("gerant")).toHaveLength(5));
});

describe("filtrerEntrees", () => {
  const entrees = entreesStatiques("gerant");
  const trouve = (q: string) => filtrerEntrees(entrees, q).map((e) => e.libelle);
  it("trouve « nouvelle commande »", () => expect(trouve("nouvelle commande")[0]).toBe("Nouvelle commande"));
  it("comprend « ajouter un produit »", () => expect(trouve("ajouter un produit")).toContain("Nouveau produit"));
  it("comprend « inventaire » sans accent ni casse", () => expect(trouve("INVENTAIRE")).toContain("Démarrer un inventaire"));
  it("comprend « ouvrir l'assistant »", () => expect(trouve("ouvrir l'assistant")).toContain("Ouvrir l'assistant"));
  it("comprend « lancer une automatisation »", () => expect(trouve("lancer une automatisation")).toContain("Lancer une automatisation"));
  it("accepte les mots dans le désordre", () => expect(trouve("commande nouvelle")).toContain("Nouvelle commande"));
  it("renvoie tout sans recherche et rien si aucun résultat", () => {
    expect(trouve("")).toHaveLength(entrees.length);
    expect(trouve("zzzz")).toEqual([]);
  });
});

describe("entreesStatiques", () => {
  it("n'expose au salarié ni commandes ni automatisations", () => {
    const l = entreesStatiques("salarie").map((e) => e.libelle);
    expect(l).not.toContain("Nouvelle commande");
    expect(l).not.toContain("Lancer une automatisation");
    expect(l).not.toContain("Automatisations");
    expect(l).toContain("Mouvement de stock");
  });
  it("n'expose les paramètres qu'au gérant", () => {
    expect(entreesStatiques("responsable").some((e) => e.href?.startsWith("/parametres"))).toBe(false);
    expect(entreesStatiques("gerant").some((e) => e.href === "/parametres/utilisateurs")).toBe(true);
  });
});

describe("actionPourN", () => {
  it("stocks : produit pour un responsable, mouvement pour un salarié", () => {
    expect(actionPourN("/stocks", "responsable")).toEqual({ type: "ajout", ajout: "produit" });
    expect(actionPourN("/stocks/inventaire/abc", "salarie")).toEqual({ type: "ajout", ajout: "mouvement" });
  });
  it("commandes et fournisseurs", () => {
    expect(actionPourN("/commandes/123", "gerant")).toEqual({ type: "ajout", ajout: "commande" });
    expect(actionPourN("/fournisseurs", "gerant")).toEqual({ type: "ajout", ajout: "fournisseur" });
  });
  it("assistant : nouvelle conversation", () => expect(actionPourN("/assistant", "gerant")).toEqual({ type: "lien", href: "/assistant" }));
  it("rien sur les pages sans élément à créer ou pour un salarié ailleurs", () => {
    expect(actionPourN("/appels", "gerant")).toBeNull();
    expect(actionPourN("/commandes", "salarie")).toBeNull();
  });
});

describe("destinationG", () => {
  it("S, C, A selon le rôle", () => {
    expect(destinationG("s", "salarie")).toBe("/stocks");
    expect(destinationG("C", "responsable")).toBe("/commandes");
    expect(destinationG("a", "gerant")).toBe("/automatisations");
  });
  it("ignore les pages interdites ou les autres touches", () => {
    expect(destinationG("a", "responsable")).toBeNull();
    expect(destinationG("c", "salarie")).toBeNull();
    expect(destinationG("x", "gerant")).toBeNull();
  });
});
