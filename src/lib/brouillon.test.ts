import { describe, expect, it } from "vitest";
import { DUREE_BROUILLON_MS, effacerBrouillon, effacerTout, ecrireBrouillon, ecrireDernierFournisseur, lireBrouillon, lireDernierFournisseur, type Stockage } from "./brouillon";

function faux(): Stockage & { donnees: Map<string, string> } {
  const donnees = new Map<string, string>();
  return {
    donnees,
    get length() { return donnees.size; },
    key: (i) => Array.from(donnees.keys())[i] ?? null,
    getItem: (k) => donnees.get(k) ?? null,
    setItem: (k, v) => void donnees.set(k, v),
    removeItem: (k) => void donnees.delete(k),
  };
}

describe("brouillons", () => {
  it("relit ce qui a été écrit", () => {
    const s = faux();
    ecrireBrouillon(s, "u1", "produit", { nom: "Tomates" });
    expect(lireBrouillon(s, "u1", "produit")).toEqual({ nom: "Tomates" });
  });
  it("est propre à chaque utilisateur", () => {
    const s = faux();
    ecrireBrouillon(s, "u1", "produit", { nom: "Secret" });
    expect(lireBrouillon(s, "u2", "produit")).toBeNull();
  });
  it("expire au bout de 7 jours et se nettoie", () => {
    const s = faux();
    ecrireBrouillon(s, "u1", "produit", { nom: "x" }, 1_000);
    expect(lireBrouillon(s, "u1", "produit", 1_000 + DUREE_BROUILLON_MS + 1)).toBeNull();
    expect(s.donnees.size).toBe(0);
  });
  it("ignore un contenu corrompu", () => {
    const s = faux();
    s.setItem("palmeraie:brouillon:u1:produit", "{pas du json");
    expect(lireBrouillon(s, "u1", "produit")).toBeNull();
  });
  it("s'efface", () => {
    const s = faux();
    ecrireBrouillon(s, "u1", "produit", { a: 1 });
    effacerBrouillon(s, "u1", "produit");
    expect(lireBrouillon(s, "u1", "produit")).toBeNull();
  });
  it("efface tout à la déconnexion sans toucher aux autres clés", () => {
    const s = faux();
    ecrireBrouillon(s, "u1", "produit", { a: 1 });
    ecrireDernierFournisseur(s, "u1", "f1");
    s.setItem("autre-site", "garder");
    effacerTout(s);
    expect([...s.donnees.keys()]).toEqual(["autre-site"]);
  });
  it("ne plante pas sans stockage", () => {
    expect(() => { ecrireBrouillon(null, "u", "f", {}); effacerTout(null); }).not.toThrow();
    expect(lireBrouillon(null, "u", "f")).toBeNull();
    expect(lireDernierFournisseur(null, "u")).toBeNull();
  });
  it("retient le dernier fournisseur par utilisateur", () => {
    const s = faux();
    ecrireDernierFournisseur(s, "u1", "f1");
    expect(lireDernierFournisseur(s, "u1")).toBe("f1");
    expect(lireDernierFournisseur(s, "u2")).toBeNull();
  });
});
