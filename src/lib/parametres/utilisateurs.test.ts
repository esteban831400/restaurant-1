import { describe, expect, it } from "vitest";
import { invitationSchema, verifierModification, verifierSuppression } from "./utilisateurs";

const gerant = { role: "gerant" as const, actif: true };
describe("verifierModification", () => {
  it("interdit de se rétrograder soi-même", () => {
    expect(verifierModification({ acteurId: "a", cibleId: "a", actuel: gerant, nouveau: { role: "responsable", actif: true }, gerantsActifs: 2 })).toMatch(/propres droits/);
  });
  it("protège le dernier gérant", () => {
    expect(verifierModification({ acteurId: "a", cibleId: "b", actuel: gerant, nouveau: { ...gerant, actif: false }, gerantsActifs: 1 })).toMatch(/au moins un gérant/);
  });
  it("autorise de rétrograder un autre gérant s'il en reste un", () => {
    expect(verifierModification({ acteurId: "a", cibleId: "b", actuel: gerant, nouveau: { role: "salarie", actif: true }, gerantsActifs: 2 })).toBeNull();
  });
  it("autorise de désactiver un salarié", () => {
    expect(verifierModification({ acteurId: "a", cibleId: "c", actuel: { role: "salarie", actif: true }, nouveau: { role: "salarie", actif: false }, gerantsActifs: 1 })).toBeNull();
  });
});

describe("verifierSuppression", () => {
  it("interdit de se supprimer soi-même", () => expect(verifierSuppression({ acteurId: "a", cibleId: "a", cible: gerant, gerantsActifs: 3 })).toMatch(/propre compte/));
  it("protège le dernier gérant", () => expect(verifierSuppression({ acteurId: "a", cibleId: "b", cible: gerant, gerantsActifs: 1 })).toMatch(/au moins un gérant/));
  it("autorise un salarié", () => expect(verifierSuppression({ acteurId: "a", cibleId: "c", cible: { role: "salarie", actif: true }, gerantsActifs: 1 })).toBeNull());
});

describe("invitationSchema", () => {
  const ok = { email: "a@b.fr", nom_complet: "Léa", role: "salarie", pole_id: "7b1a4f5e-0000-4000-8000-000000000001", saisonnier: true };
  it("accepte une invitation complète", () => expect(invitationSchema.safeParse(ok).success).toBe(true));
  it("exige un pôle sauf pour le gérant", () => {
    expect(invitationSchema.safeParse({ ...ok, pole_id: null }).success).toBe(false);
    expect(invitationSchema.safeParse({ ...ok, role: "gerant", pole_id: null }).success).toBe(true);
  });
});
