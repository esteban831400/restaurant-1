import { describe, expect, it } from "vitest";
import { COMPLEXE_PAR_DEFAUT, complexeSchema, lireComplexe } from "./complexe";

const PREFIXE = "https://x.supabase.co/storage/v1/object/public/public-assets/";
describe("complexeSchema", () => {
  const ok = { nom: "Mon complexe", logo: `${PREFIXE}logo.png`, couleur_principale: "#15803D", couleur_secondaire: "#0E7490" };
  it("accepte une identité valide", () => expect(complexeSchema(PREFIXE).safeParse(ok).success).toBe(true));
  it("refuse un logo hébergé ailleurs", () => expect(complexeSchema(PREFIXE).safeParse({ ...ok, logo: "https://evil.example/x.png" }).success).toBe(false));
  it("accepte l'absence de logo", () => expect(complexeSchema(PREFIXE).safeParse({ ...ok, logo: null }).success).toBe(true));
  it("refuse une couleur illisible", () => expect(complexeSchema(PREFIXE).safeParse({ ...ok, couleur_principale: "#FFEE00" }).success).toBe(false));
});

describe("lireComplexe", () => {
  it("retombe sur les valeurs par défaut", () => {
    expect(lireComplexe(null)).toEqual(COMPLEXE_PAR_DEFAUT);
    expect(lireComplexe({ nom: " ", couleur_principale: "pas-une-couleur", logo: "javascript:alert(1)" })).toEqual(COMPLEXE_PAR_DEFAUT);
  });
  it("conserve les valeurs valides", () => {
    expect(lireComplexe({ nom: "Les Dunes", couleur_principale: "#1E3A8A" })).toMatchObject({ nom: "Les Dunes", couleur_principale: "#1E3A8A" });
  });
});
