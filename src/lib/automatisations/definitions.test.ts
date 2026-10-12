import { describe, expect, it } from "vitest";
import { CLES, dureeExecution, reglagesEffectifs, schemaParametres, urlWebhook, urlWebhookAutorisee } from "./definitions";

describe("schemaParametres", () => {
  it("accepte des réglages valides", () => {
    expect(schemaParametres("relances").safeParse({ heure: "09:30", seuil_relance_jours: 3, canal: "app", destinataires: [] }).success).toBe(true);
  });
  it("refuse une heure invalide", () => {
    expect(schemaParametres("relances").safeParse({ heure: "25:00", seuil_relance_jours: 3, canal: "app", destinataires: [] }).success).toBe(false);
  });
  it("refuse un champ qui ne concerne pas l'automatisation", () => {
    expect(schemaParametres("envoi_commandes").safeParse({ canal: "app", destinataires: [], heure: "08:00" }).success).toBe(false);
  });
  it("exige un destinataire hors canal application", () => {
    const r = schemaParametres("alertes_dlc").safeParse({ heure: "08:00", seuil_dlc_jours: 3, canal: "telegram", destinataires: [] });
    expect(r.success).toBe(false);
  });
  it("exige des e-mails valides pour le canal mail", () => {
    const base = { jour_semaine: 1, heure: "08:00", canal: "mail" };
    expect(schemaParametres("rapport_hebdo").safeParse({ ...base, destinataires: ["pas-un-mail"] }).success).toBe(false);
    expect(schemaParametres("rapport_hebdo").safeParse({ ...base, destinataires: ["gerant@palmeraie.test"] }).success).toBe(true);
  });
  it("l'assistant n'a aucun réglage", () => {
    expect(schemaParametres("assistant_ia").safeParse({}).success).toBe(true);
    expect(schemaParametres("assistant_ia").safeParse({ canal: "app" }).success).toBe(false);
  });
});

describe("reglagesEffectifs", () => {
  it("complète avec les valeurs par défaut et ignore les champs inconnus", () => {
    expect(reglagesEffectifs("relances", { seuil_relance_jours: 5, intrus: 1 })).toEqual({ heure: "09:00", seuil_relance_jours: 5, canal: "app", destinataires: [] });
  });
  it("couvre les 8 automatisations", () => expect(CLES).toHaveLength(8));
});

describe("urlWebhook", () => {
  const env = { orderSend: "https://flows.test/order", assistant: "https://flows.test/assistant" };
  it("utilise l'environnement pour l'envoi des commandes et l'assistant", () => {
    expect(urlWebhook("envoi_commandes", {}, env)).toBe("https://flows.test/order");
    expect(urlWebhook("assistant_ia", {}, env)).toBe("https://flows.test/assistant");
  });
  it("utilise les paramètres pour les autres", () => expect(urlWebhook("relances", { relances: "https://flows.test/r" }, env)).toBe("https://flows.test/r"));
  it("refuse une adresse absente ou non http(s)", () => {
    expect(urlWebhook("relances", {}, env)).toBeNull();
    expect(urlWebhook("relances", { relances: "javascript:alert(1)" }, env)).toBeNull();
    expect(urlWebhook("relances", { relances: "pas une url" }, env)).toBeNull();
  });
});

describe("dureeExecution", () => {
  it("formate", () => {
    expect(dureeExecution("2025-01-01T10:00:00Z", "2025-01-01T10:00:04Z")).toBe("4 s");
    expect(dureeExecution("2025-01-01T10:00:00Z", "2025-01-01T10:02:05Z")).toBe("2 min 05 s");
    expect(dureeExecution("2025-01-01T10:00:00Z", null)).toBeNull();
  });
});

describe("urlWebhookAutorisee (production)", () => {
  it("accepte une adresse https publique", () => expect(urlWebhookAutorisee("https://flows.exemple.fr/hook", false)).toBe(true));
  it("refuse http, localhost, IP privées et .internal", () => {
    for (const u of ["http://flows.exemple.fr/x", "https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x", "https://192.168.1.2/x", "https://172.20.0.1/x", "https://169.254.169.254/latest", "https://db.internal/x", "https://user:pw@flows.exemple.fr/x"]) {
      expect(urlWebhookAutorisee(u, false), u).toBe(false);
    }
  });
  it("autorise http en développement", () => expect(urlWebhookAutorisee("http://localhost:5678/x", true)).toBe(true));
});
