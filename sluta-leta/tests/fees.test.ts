import { describe, it, expect } from "vitest";
import { calculateContactFee, CONTACT_FEE_SEK } from "@/lib/fees";

describe("calculateContactFee", () => {
  it("always charges a flat 69 kr, regardless of offer price", () => {
    expect(calculateContactFee(0)).toBe(69);
    expect(calculateContactFee(200)).toBe(69);
    expect(calculateContactFee(5000)).toBe(69);
    expect(calculateContactFee(500000)).toBe(69);
  });

  it("matches the CONTACT_FEE_SEK constant", () => {
    expect(CONTACT_FEE_SEK).toBe(69);
  });
});
