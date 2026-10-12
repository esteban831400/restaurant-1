import { describe, expect, it } from "vitest";
import { sign, verify } from "./hmac";

const secret = "0123456789abcdef-secret";
const body = JSON.stringify({ commande_id: "abc" });
const now = 1_700_000_000;

describe("verify", () => {
  it("accepte une signature valide", () => {
    const ts = String(now);
    expect(verify(secret, body, sign(secret, ts, body), ts, now)).toEqual({ ok: true });
  });
  it("refuse un corps modifié", () => {
    const ts = String(now);
    expect(verify(secret, body + " ", sign(secret, ts, body), ts, now)).toEqual({ ok: false, reason: "invalid" });
  });
  it("refuse un horodatage trop ancien", () => {
    const ts = String(now - 301);
    expect(verify(secret, body, sign(secret, ts, body), ts, now)).toEqual({ ok: false, reason: "expired" });
  });
  it("refuse les en-têtes absents", () => {
    expect(verify(secret, body, null, null, now)).toEqual({ ok: false, reason: "missing" });
  });
});
