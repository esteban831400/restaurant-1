import { describe, expect, it } from "vitest";
import { niveauAlerte, quantiteSignee } from "./alertes";

describe("niveauAlerte", () => {
  it("rouge sous le seuil", () => expect(niveauAlerte(4, 5)).toBe("rouge"));
  it("orange juste au-dessus", () => expect(niveauAlerte(5, 5)).toBe("orange"));
  it("ok au-delà de 125 %", () => expect(niveauAlerte(6.25, 5)).toBe("ok"));
  it("ok sans seuil", () => expect(niveauAlerte(0, 0)).toBe("ok"));
});

describe("quantiteSignee", () => {
  it("signe selon le type", () => {
    expect(quantiteSignee("entree", 3)).toBe(3);
    expect(quantiteSignee("sortie", 3)).toBe(-3);
    expect(quantiteSignee("perte", -2)).toBe(-2);
    expect(quantiteSignee("correction", -1.5)).toBe(-1.5);
  });
});
