import { describe, expect, it } from "vitest";
import { bornePariseEnUtc, dateLimiteConservation, formatDuree, masquerNumero, statsAppels } from "./appels";

describe("masquerNumero", () => {
  it("masque le milieu du numéro", () => expect(masquerNumero("06 12 34 56 78")).toBe("06 12 •• •• 78"));
  it("gère le format international", () => expect(masquerNumero("+33612345678")).toBe("33 61 •• •• 78"));
  it("ne révèle rien d'un numéro trop court", () => expect(masquerNumero("123")).toBe("•• •• •• ••"));
  it("gère l'absence de numéro", () => expect(masquerNumero(null)).toBe("Numéro masqué"));
});

describe("formatDuree", () => {
  it("formate minutes et secondes", () => {
    expect(formatDuree(45)).toBe("45 s");
    expect(formatDuree(125)).toBe("2 min 05 s");
  });
});

describe("statsAppels", () => {
  const now = new Date("2025-07-10T12:00:00Z");
  const appels = [
    { date_appel: "2025-07-10T08:30:00Z", pole: "restaurant", issue: "renseigne" as const },
    { date_appel: "2025-07-10T09:10:00Z", pole: "minigolf", issue: "transfere" as const },
    { date_appel: "2025-07-09T09:10:00Z", pole: null, issue: "transfere" as const },
    { date_appel: "2025-06-01T09:10:00Z", pole: "restaurant", issue: "renseigne" as const },
  ];
  const s = statsAppels(appels, 3, now);
  it("compte par jour avec les jours vides", () => {
    expect(s.parJour.map((j) => j.appels)).toEqual([0, 1, 2]);
  });
  it("calcule le taux de transfert sur tous les appels", () => expect(s.tauxTransfert).toBe(50));
  it("répartit par pôle, 'autre' si inconnu", () => {
    expect(s.parPole).toEqual([{ pole: "restaurant", appels: 2 }, { pole: "minigolf", appels: 1 }, { pole: "autre", appels: 1 }]);
  });
  it("compte par heure (heure de Paris, UTC+2 en été)", () => {
    expect(s.parHeure[10].appels).toBe(1);
    expect(s.parHeure[11].appels).toBe(3); // compte tous les appels fournis : l'appelant filtre la période
  });
  it("renvoie null sans appel", () => expect(statsAppels([], 3, now).tauxTransfert).toBeNull());
});

describe("dateLimiteConservation", () => {
  it("recule du nombre de jours", () => {
    expect(dateLimiteConservation(new Date("2025-07-10T00:00:00Z"), 90).toISOString()).toBe("2025-04-11T00:00:00.000Z");
  });
});

describe("bornePariseEnUtc", () => {
  it("début de journée en été (UTC+2)", () => expect(bornePariseEnUtc("2025-07-10", false)?.toISOString()).toBe("2025-07-09T22:00:00.000Z"));
  it("fin de journée en hiver (UTC+1)", () => expect(bornePariseEnUtc("2025-01-10", true)?.toISOString()).toBe("2025-01-10T22:59:59.000Z"));
  it("refuse une date invalide", () => expect(bornePariseEnUtc("n'importe quoi", false)).toBeNull());
});
