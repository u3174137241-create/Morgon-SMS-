import { describe, it, expect } from "vitest";
import { scoreMatch, type MatchRequirements, type MatchCandidate } from "@/lib/matching";

const baseReq: MatchRequirements = {
  itemType: "PRODUCT",
  budgetMax: 7000,
  budgetMin: null,
  location: "Stockholm",
  brand: "Apple",
  model: "15 Pro",
  condition: "Begagnad",
  keywords: ["iphone", "pro"],
};

describe("scoreMatch", () => {
  it("rejects candidates over budget", () => {
    const candidate: MatchCandidate = {
      itemType: "PRODUCT",
      price: 8000,
      location: "Stockholm",
      brand: "Apple",
      model: "15 Pro",
      condition: "Begagnad",
      text: "iPhone 15 Pro",
    };
    const result = scoreMatch(baseReq, candidate);
    expect(result.passesHardRequirements).toBe(false);
  });

  it("rejects mismatched item types", () => {
    const candidate: MatchCandidate = {
      itemType: "SERVICE",
      price: 500,
      location: "Stockholm",
      brand: null,
      model: null,
      condition: null,
      text: "Målning",
    };
    expect(scoreMatch(baseReq, candidate).passesHardRequirements).toBe(false);
  });

  it("scores a strong match higher than a weak one", () => {
    const strong: MatchCandidate = {
      itemType: "PRODUCT",
      price: 6500,
      location: "Stockholm",
      brand: "Apple",
      model: "15 Pro",
      condition: "Begagnad",
      text: "iPhone 15 Pro i toppskick",
    };
    const weak: MatchCandidate = {
      itemType: "PRODUCT",
      price: 6999,
      location: "Göteborg",
      brand: "Samsung",
      model: "S24",
      condition: "Ny",
      text: "Samsung Galaxy S24",
    };
    const strongResult = scoreMatch(baseReq, strong);
    const weakResult = scoreMatch(baseReq, weak);
    expect(strongResult.passesHardRequirements).toBe(true);
    expect(weakResult.passesHardRequirements).toBe(true);
    expect(strongResult.score).toBeGreaterThan(weakResult.score);
  });
});
