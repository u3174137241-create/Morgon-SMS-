import { test } from "node:test";
import assert from "node:assert/strict";
import { generateQueries } from "../src/core/searchStrategyEngine.js";
import type { Category, LocationConfig } from "../src/core/types.js";

const categories: Category[] = [
  { id: "badrum", name: "Badrumsrenovering", enabled: true, keywords: ["badrumsrenovering", "badrum"], buyerTypes: ["Badrumsfirma"] },
  { id: "malning", name: "Målning", enabled: true, keywords: ["målare"], buyerTypes: ["Målarfirma"] },
  { id: "disabled-cat", name: "Disabled", enabled: false, keywords: ["x"], buyerTypes: [] },
];

const locations: LocationConfig[] = [
  { id: "stockholm", name: "Stockholm", type: "city", enabled: true },
  { id: "sverige", name: "Sverige", type: "country", enabled: true },
  { id: "disabled-loc", name: "Disabled", type: "city", enabled: false },
];

test("generates non-empty queries for enabled category/location combos", () => {
  const queries = generateQueries(categories, locations, "MEDIUM");
  assert.ok(queries.length > 0);
});

test("disabled categories and locations are excluded", () => {
  const queries = generateQueries(categories, locations, "MEDIUM");
  assert.ok(!queries.some((q) => q.category === "disabled-cat"));
  assert.ok(!queries.some((q) => q.location === "disabled-loc"));
});

test("nationwide (country) location does not append a place name to the query", () => {
  const queries = generateQueries(categories, locations, "MEDIUM").filter((q) => q.location === "sverige");
  assert.ok(queries.length > 0);
  for (const q of queries) {
    assert.ok(!q.query.toLowerCase().includes("sverige"), `expected no "sverige" in "${q.query}"`);
  }
});

test("city-level location name is appended to the query text", () => {
  const queries = generateQueries(categories, locations, "MEDIUM").filter((q) => q.location === "stockholm");
  assert.ok(queries.length > 0);
  for (const q of queries) {
    assert.ok(q.query.toLowerCase().includes("stockholm"));
  }
});

test("queries contain recognizable Swedish intent phrasing", () => {
  const queries = generateQueries(categories, locations, "HIGH");
  const joined = queries.map((q) => q.query.toLowerCase()).join(" | ");
  assert.ok(
    ["behöver", "söker", "letar efter", "tips på", "rekommendera", "vem kan", "hjälp med", "offert", "akut"].some((phrase) =>
      joined.includes(phrase)
    )
  );
});

test("generated queries are de-duplicated", () => {
  const queries = generateQueries(categories, locations, "HIGH");
  const seen = new Set(queries.map((q) => q.query.toLowerCase()));
  assert.equal(seen.size, queries.length);
});

test("higher search intensity yields at least as many queries as lower intensity", () => {
  const low = generateQueries(categories, locations, "LOW");
  const medium = generateQueries(categories, locations, "MEDIUM");
  const high = generateQueries(categories, locations, "HIGH");
  assert.ok(low.length <= medium.length);
  assert.ok(medium.length <= high.length);
});

test("a category with no keywords produces no queries", () => {
  const empty: Category[] = [{ id: "empty", name: "Empty", enabled: true, keywords: [], buyerTypes: [] }];
  const queries = generateQueries(empty, locations, "HIGH");
  assert.equal(queries.length, 0);
});
