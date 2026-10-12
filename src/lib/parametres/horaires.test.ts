import { describe, expect, it } from "vitest";
import { HORAIRES_PAR_DEFAUT, SAISONS_PAR_DEFAUT, fermetureSchema, horairesDuJour, horairesSchema, jourDe, saisonDu } from "./horaires";

describe("saisonDu", () => {
  it("détecte la haute saison d'été", () => {
    expect(saisonDu("2025-07-10", SAISONS_PAR_DEFAUT)).toBe("haute");
    expect(saisonDu("2025-11-02", SAISONS_PAR_DEFAUT)).toBe("basse");
  });
  it("gère une saison qui enjambe le nouvel an", () => {
    const s = { haute_du: "12-15", haute_au: "03-01" };
    expect(saisonDu("2025-12-31", s)).toBe("haute");
    expect(saisonDu("2025-02-10", s)).toBe("haute");
    expect(saisonDu("2025-07-10", s)).toBe("basse");
  });
});

describe("jourDe", () => {
  it("donne le jour de la semaine", () => {
    expect(jourDe("2025-07-14")).toBe("lundi");
    expect(jourDe("2025-07-20")).toBe("dimanche");
  });
});

describe("horairesDuJour", () => {
  const f = [{ id: "7b1a4f5e-0000-4000-8000-000000000001", pole: "restaurant" as const, du: "2025-12-24", au: "2025-12-26", motif: "Noël" }];
  it("applique les horaires de saison", () => {
    expect(horairesDuJour(HORAIRES_PAR_DEFAUT, SAISONS_PAR_DEFAUT, [], "minigolf", "2025-07-15")).toEqual({ ouvert: true, de: "10:00", a: "20:00", saison: "haute" });
  });
  it("renvoie fermé un jour de repos", () => {
    expect(horairesDuJour(HORAIRES_PAR_DEFAUT, SAISONS_PAR_DEFAUT, [], "restaurant", "2025-11-03").ouvert).toBe(false);
  });
  it("une fermeture exceptionnelle l'emporte, seulement pour son pôle", () => {
    expect(horairesDuJour(HORAIRES_PAR_DEFAUT, SAISONS_PAR_DEFAUT, f, "restaurant", "2025-12-25")).toMatchObject({ ouvert: false, motif_fermeture: "Noël" });
    expect(horairesDuJour(HORAIRES_PAR_DEFAUT, SAISONS_PAR_DEFAUT, f, "minigolf", "2025-12-25").motif_fermeture).toBeUndefined();
  });
});

describe("schémas", () => {
  it("accepte les horaires par défaut", () => expect(horairesSchema.safeParse(HORAIRES_PAR_DEFAUT).success).toBe(true));
  it("refuse une fermeture avant l'ouverture", () => {
    const h = structuredClone(HORAIRES_PAR_DEFAUT);
    h.restaurant.haute.mardi = { ouvert: true, de: "20:00", a: "10:00" };
    expect(horairesSchema.safeParse(h).success).toBe(false);
  });
  it("refuse une période de fermeture inversée", () => {
    expect(fermetureSchema.safeParse({ ...{ id: "7b1a4f5e-0000-4000-8000-000000000001", pole: "tous", motif: "x" }, du: "2025-02-02", au: "2025-02-01" }).success).toBe(false);
  });
});
