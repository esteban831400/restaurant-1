import { describe, expect, it } from "vitest";
import { parseCsv, parseNombre, toCsv } from "./csv";

describe("csv", () => {
  it("fait l'aller-retour avec guillemets, points-virgules et retours à la ligne", () => {
    const rows = [["nom", "note"], ['Sauce "maison"', "a;b\nc"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it("détecte la virgule comme séparateur", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("lit les décimales françaises", () => {
    expect(parseNombre("1,5")).toBe(1.5);
    expect(parseNombre("")).toBe(0);
    expect(parseNombre("abc")).toBeNaN();
  });
});
