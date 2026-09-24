import { describe, it, expect } from "vitest";
import { calculateContactFee } from "@/lib/fees";

describe("calculateContactFee", () => {
  it("charges 20 kr for 0-200 kr offers", () => {
    expect(calculateContactFee(0)).toBe(20);
    expect(calculateContactFee(200)).toBe(20);
  });

  it("charges 49 kr for 201-5000 kr offers", () => {
    expect(calculateContactFee(201)).toBe(49);
    expect(calculateContactFee(5000)).toBe(49);
  });

  it("charges 149 kr for offers above 5000 kr", () => {
    expect(calculateContactFee(5001)).toBe(149);
    expect(calculateContactFee(500000)).toBe(149);
  });
});
