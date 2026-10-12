import { describe, expect, it } from "vitest";
import { construireHistorique, limiteAtteinte, lireReponseService, requeteAssistantSchema, titreConversation, type MessageAssistant } from "./assistant";

const msg = (i: number): MessageAssistant => ({ role: i % 2 ? "assistant" : "user", contenu: `m${i}`, date: "2025-01-01T00:00:00Z" });

describe("requeteAssistantSchema", () => {
  it("accepte une question", () => expect(requeteAssistantSchema.safeParse({ message: "  Bonjour " }).data?.message).toBe("Bonjour"));
  it("refuse un message vide ou trop long", () => {
    expect(requeteAssistantSchema.safeParse({ message: "   " }).success).toBe(false);
    expect(requeteAssistantSchema.safeParse({ message: "a".repeat(2_001) }).success).toBe(false);
  });
  it("refuse un identifiant de conversation invalide", () => expect(requeteAssistantSchema.safeParse({ message: "a", conversation_id: "x" }).success).toBe(false));
});

describe("construireHistorique", () => {
  it("garde les 10 derniers messages sans les dates", () => {
    const h = construireHistorique(Array.from({ length: 15 }, (_, i) => msg(i)));
    expect(h).toHaveLength(10);
    expect(h[0]).toEqual({ role: "assistant", contenu: "m5" });
  });
});

describe("titreConversation", () => {
  it("tronque et compacte les espaces", () => {
    expect(titreConversation("Bonjour   à tous")).toBe("Bonjour à tous");
    expect(titreConversation("x".repeat(100))).toHaveLength(58);
  });
});

describe("lireReponseService", () => {
  it("lit le format du contrat", () => {
    expect(lireReponseService({ reponse: " Il manque 3 produits. ", outils_utilises: ["stock", 5, "commandes"] })).toEqual({ reponse: "Il manque 3 produits.", outils: ["stock", "commandes"] });
  });
  it("accepte output, text, une chaîne et un tableau", () => {
    expect(lireReponseService({ output: "a" })?.reponse).toBe("a");
    expect(lireReponseService({ text: "b" })?.reponse).toBe("b");
    expect(lireReponseService("c")?.reponse).toBe("c");
    expect(lireReponseService([{ output: "d" }])?.reponse).toBe("d");
  });
  it("renvoie null si la réponse est vide ou illisible", () => {
    expect(lireReponseService({ reponse: "  " })).toBeNull();
    expect(lireReponseService(null)).toBeNull();
    expect(lireReponseService({ reponse: 42 })).toBeNull();
  });
});

describe("limiteAtteinte", () => {
  it("bloque à 20 messages", () => {
    expect(limiteAtteinte(19)).toBe(false);
    expect(limiteAtteinte(20)).toBe(true);
  });
});
