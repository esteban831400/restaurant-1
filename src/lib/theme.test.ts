import { describe, expect, it } from "vitest";
import { contraste, cssTheme, hexVersHsl, verifierCouleurMarque } from "./theme";

describe("hexVersHsl", () => {
  it("convertit le vert par défaut", () => expect(hexVersHsl("#15803D")).toEqual([142, 72, 29]));
  it("gère le gris", () => expect(hexVersHsl("#808080")).toEqual([0, 0, 50]));
});

describe("contraste", () => {
  it("noir sur blanc = 21", () => expect(Math.round(contraste("#000000", "#FFFFFF"))).toBe(21));
  it("est symétrique", () => expect(contraste("#15803D", "#FFFFFF")).toBeCloseTo(contraste("#FFFFFF", "#15803D")));
});

describe("verifierCouleurMarque", () => {
  it("accepte les couleurs par défaut", () => {
    expect(verifierCouleurMarque("#15803D")).toBeNull();
    expect(verifierCouleurMarque("#0E7490")).toBeNull();
  });
  it("refuse une couleur trop claire avec le contraste mesuré", () => expect(verifierCouleurMarque("#FFFF00")).toMatch(/trop claire.*1,1:1/));
  it("refuse un format invalide", () => expect(verifierCouleurMarque("rouge")).toMatch(/invalide/));
});

describe("cssTheme", () => {
  it("produit les variables clair et sombre", () => {
    const css = cssTheme("#15803D", "#0E7490");
    expect(css).toContain(":root{--primary:142 72% 29%");
    expect(css).toContain(".dark{--primary:");
  });
  it("ne produit rien (et donc rien d'injectable) si une couleur est invalide", () => {
    expect(cssTheme("#15803D;}body{display:none", "#0E7490")).toBe("");
    expect(cssTheme("#FFFF00", "#0E7490")).toBe("");
  });
  it("éclaircit en mode sombre pour garder le contraste", () => {
    const sombre = cssTheme("#1E3A8A", "#0E7490").split(".dark{")[1];
    const l = Number(/--primary:\d+ \d+% (\d+)%/.exec(sombre)![1]);
    expect(l).toBeGreaterThanOrEqual(40);
  });
});
