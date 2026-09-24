import { describe, it, expect } from "vitest";
import { parseSearchText } from "@/lib/nlpParse";

describe("parseSearchText", () => {
  it("extracts budget, location and product type from Swedish text", () => {
    const result = parseSearchText("Jag söker en begagnad iPhone 15 Pro, max 7000 kr, Stockholm.");
    expect(result.itemType).toBe("PRODUCT");
    expect(result.budgetMax).toBe(7000);
    expect(result.location).toBe("Stockholm");
    expect(result.condition).toBe("Begagnad");
  });

  it("classifies renovation requests as services", () => {
    const result = parseSearchText("Jag behöver någon som kan renovera mitt badrum i Haninge.");
    expect(result.itemType).toBe("SERVICE");
    expect(result.location).toBe("Haninge");
  });

  it("classifies car painting as a service, not a product", () => {
    const result = parseSearchText("Jag behöver någon som kan måla om min bil.");
    expect(result.itemType).toBe("SERVICE");
  });
});
