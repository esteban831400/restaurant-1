import { describe, expect, it } from "vitest";
import { peutEtreRecue, transitionN8nValide, transitionsManuelles } from "./statuts";

describe("transitionsManuelles", () => {
  it("n'offre rien au salarié", () => expect(transitionsManuelles("brouillon", "salarie")).toEqual([]));
  it("permet de soumettre un brouillon", () => {
    expect(transitionsManuelles("brouillon", "responsable").map((t) => t.vers)).toEqual(["a_valider", "annulee"]);
  });
  it("ne propose jamais « envoyée » à la main", () => {
    for (const s of ["brouillon", "a_valider", "confirmee", "en_retard"] as const) {
      expect(transitionsManuelles(s, "gerant").map((t) => t.vers)).not.toContain("envoyee");
    }
  });
});

describe("transitionN8nValide", () => {
  it("autorise confirmée depuis envoyée", () => expect(transitionN8nValide("envoyee", "confirmee")).toBe(true));
  it("refuse livrée et clôturée", () => {
    expect(transitionN8nValide("envoyee", "livree")).toBe(false);
    expect(transitionN8nValide("livree", "cloturee")).toBe(false);
  });
  it("refuse de revenir en brouillon", () => expect(transitionN8nValide("envoyee", "brouillon")).toBe(false));
});

describe("peutEtreRecue", () => {
  it("seulement quand la commande est partie", () => {
    expect(peutEtreRecue("envoyee")).toBe(true);
    expect(peutEtreRecue("brouillon")).toBe(false);
    expect(peutEtreRecue("livree")).toBe(false);
  });
});
