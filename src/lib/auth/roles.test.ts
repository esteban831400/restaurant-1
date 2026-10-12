import { describe, expect, it } from "vitest";
import { homeFor, navFor } from "./roles";

describe("navigation par rôle", () => {
  it("donne tout au gérant", () => {
    expect(navFor("gerant").map((i) => i.href)).toContain("/automatisations");
  });
  it("limite le salarié aux stocks", () => {
    expect(navFor("salarie").map((i) => i.href)).toEqual(["/stocks"]);
  });
  it("cache les automatisations au responsable mais garde l'assistant", () => {
    const hrefs = navFor("responsable").map((i) => i.href);
    expect(hrefs).not.toContain("/automatisations");
    expect(hrefs).toContain("/assistant");
  });
  it("oriente chaque rôle vers sa page d'accueil", () => {
    expect(homeFor("gerant")).toBe("/tableau-de-bord");
    expect(homeFor("salarie")).toBe("/stocks");
  });
});
